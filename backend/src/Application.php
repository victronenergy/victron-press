<?php

declare(strict_types=1);

namespace VictronEnergy\Press;

use Dotenv\Dotenv;
use Github\Client as GithubClient;
use GuzzleHttp\Client as GuzzleClient;
use League\Flysystem\Adapter\Local;
use League\Flysystem\Filesystem;
use League\OAuth2\Client\Provider\Github as GitHubOAuth2Provider;
use League\Route\Http\Exception\ForbiddenException;
use League\Route\Http\Exception\NotFoundException;
use League\Route\Http\Exception\UnauthorizedException;
use League\Route\Router;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Zend\Diactoros\Response\EmptyResponse;
use Zend\Diactoros\Response\HtmlResponse;
use Zend\Diactoros\Response\JsonResponse;
use Zend\Diactoros\Response\RedirectResponse;
use Zend\Diactoros\Response\TextResponse;
use Zend\Expressive\Session\Ext\PhpSessionPersistence;
use Zend\Expressive\Session\SessionMiddleware;

/**
 * VictronPress backend application.
 */
class Application implements RequestHandlerInterface
{
    /**
     * Application version.
     */
    public const VERSION = 'dev-master';

    /**
     * Application path.
     */
    public const PATH = __DIR__ . '/../..';

    /**
     * Filesystem used for temporarely storing uploaded files before they are committed.
     *
     * @var Filesystem
     */
    protected $filesystem;

    /**
     * HTTP router for mapping requests to handlers.
     *
     * @var Router
     */
    protected $router;

    /**
     * Constructs a new application instance.
     */
    public function __construct()
    {
        // Load and check required environment variables
        (Dotenv::create(self::PATH))->load();
        foreach ([
            'OAUTH_CLIENT_ID',
            'OAUTH_CLIENT_SECRET',
            'GITHUB_USER',
            'GITHUB_REPO',
            'GITHUB_BRANCH',
            'GITHUB_TOKEN',
        ] as $envVariable) {
            if (empty(getenv($envVariable))) {
                throw InvalidArgumentException('Missing required environment variable ' . $envVariable);
            }
        }

        // Set up filesystem for uploads
        $this->filesystem = new Filesystem(new Local(self::PATH . '/data/uploads'));

        // Set up HTTP routing and middleware
        $this->router = new Router();
        $this->router->middleware(new SessionMiddleware(new PhpSessionPersistence()));

        // API handlers
        $this->router->map('GET', '/api/v1/auth', [$this, 'handleAuth']);
        $this->router->map('GET', '/api/v1/oauth-callback', [$this, 'handleOAuthCallback']);

        // Handlers for retrieving files
        $this->router->map('GET', '/{file:.+\.html}', [$this, 'handleNonExisting']);
        $this->router->map('GET', '/{file:.+\.md}', [$this, 'handleGetMarkdown']);
        $this->router->map('GET', '/{file:.+\.(?:gif|jpg|jpeg|png|svg|webp)}', [$this, 'handleGetImage']);

        // Handlers for editing
        $this->router->map('PUT', '/{file:.+\.md}', [$this, 'handleSaveMarkdown']);
        $this->router->map('DELETE', '/{file:.+\.md}', [$this, 'handleDeleteMarkdown']);
        $this->router->map('PUT', '/{file:.+\.(?:gif|jpg|jpeg|png|svg|webp)}', [$this, 'handleUploadImage']);
    }

    /**
     * Handle an request.
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        try {
            return $this->router->dispatch($request);
        } catch (UnauthorizedException $e) {
            return new TextResponse('401 ' . $e->getMessage(), 401);
        } catch (ForbiddenException $e) {
            return new TextResponse('403 ' . $e->getMessage(), 403);
        } catch (NotFoundException $e) {
            return new TextResponse('404 ' . $e->getMessage(), 404);
        }
    }

    /**
     * Check if the user is successfully logged in via OAuth.
     * If not, provides URL where the user can log in.
     */
    public function handleAuth(ServerRequestInterface $request): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);
        $result = [
            'success' => $session->has('user_name'),
        ];
        if (!$result['success']) {
            // If a file was specified, save it in the session so we may
            // redirect the user back there once they completed the log in
            if (!empty($request->getQueryParams()['file'])) {
                $session->set('redirect_file', $request->getQueryParams()['file']);
            }

            // GitHub OAuth2 provider
            $provider = new GitHubOAuth2Provider([
                'clientId'     => getenv('OAUTH_CLIENT_ID'),
                'clientSecret' => getenv('OAUTH_CLIENT_SECRET'),
            ]);

            // Generate a redirect URI
            $result['redirectUrl'] = $provider->getAuthorizationUrl([
                'scope' => 'user:email',
            ]);

            // Save the state in the session for later validation against CSRF attacks
            $session->set('oauth2state', $provider->getState());
        }
        return new JsonResponse($result);
    }

    /**
     * User is sent here after logging in with GitHub.
     * Acquires user token and validates if user can access the repository.
     */
    public function handleOAuthCallback(ServerRequestInterface $request): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check given state against previously stored one to mitigate CSRF attack
        $savedOAuthState = $session->get('oauth2state', null);
        $session->unset('oauth2state');
        if (empty($_GET['code']) || empty($_GET['state']) || $_GET['state'] !== $savedOAuthState) {
            return new RedirectResponse('/');
        }

        // GitHub OAuth2 provider
        $provider = new GitHubOAuth2Provider([
            'clientId'     => getenv('OAUTH_CLIENT_ID'),
            'clientSecret' => getenv('OAUTH_CLIENT_SECRET'),
        ]);

        // Try to get an access token (using the authorization code grant)
        $token = $provider->getAccessToken('authorization_code', [
            'code' => $_GET['code'],
        ]);

        // Retrieve the user for the access token
        /**
         * @var \League\OAuth2\Client\Provider\GithubResourceOwner
         * @psalm-suppress TypeCoercion
         */
        $user = $provider->getResourceOwner($token);
        $userName = $user->getNickname() ?? 'nobody';
        $userEmail = $user->getEmail() ?? ($userName . '@users.noreply.github.com');

        // Use the global application token to check if the logged in user has access to the project
        $client = new GithubClient();
        $client->authenticate(getenv('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
        try {
            (/** @var \Github\Api\Repo */ $api = $client->api('repo'))->collaborators()->check(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $userName
            );
        } catch (\Exception $e) {
            throw new ForbiddenException($userName . ' is not a collaborator on ' . getenv('GITHUB_USER') . '/' . getenv('GITHUB_REPO'), $e);
        }

        // By setting the user_name we indicate the user is logged in.
        $session->set('user_name', $userName);
        $session->set('user_email', $userEmail);

        // Redirect the user back to the frontend application
        $redirectFile = $session->get('redirect_file', null);
        $session->unset('redirect_file');
        $redirectUrl = '/';
        if (!empty($redirectFile)) {
            $redirectUrl .= preg_replace('/\.md$/i', '.html', $redirectFile) . '?editmode=true';
        }
        return new RedirectResponse($redirectUrl);
    }

    /**
     * Shows a "page not found" message and asks user if they want to create a new page.
     */
    public function handleNonExisting(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        return new HtmlResponse(file_get_contents(self::PATH . '/data/dist/404.html'));
    }

    /**
     * Read the contents of a documentation file.
     */
    public function handleGetMarkdown(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        // Retrieve the file information from GitHub
        $filePath = $pathParams['file'];
        // TODO: sanity check the path
        try {
            $client = new GithubClient();
            $client->authenticate(getenv('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                getenv('GITHUB_BRANCH')
            );
        } catch (\Exception $e) {
            if ($e->getCode() === 404) {
                throw new NotFoundException('Markdown file does not exist in repository', $e);
            }
            throw $e;
        }

        // Download and return the file contents
        return (new GuzzleClient())->request('GET', $file['download_url']);
    }

    /**
     * Save the contents of a documentation file.
     */
    public function handleSaveMarkdown(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        // Retrieve the file information from GitHub
        $filePath = $pathParams['file'];
        // TODO: sanity check the path
        $file = null;
        try {
            $client = new GithubClient();
            $client->authenticate(getenv('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                getenv('GITHUB_BRANCH')
            );
        } catch (\Exception $e) {
            if ($e->getCode() !== 404) {
                throw $e;
            }
        }

        // Read the Markdown contents
        $contents = $request->getBody()->__toString();
        // TODO: check contents for being plain utf-8 text

        // Get commit message from header
        $commitMessage = implode("\n", $request->getHeader('Commit-Message'));
        if (empty($commitMessage)) {
            $commitMessage = null;
        }

        // Retrieve user data from the session
        $userName = $session->get('user_name');
        $userEmail = $session->get('user_email');

        // Check if any images were uploaded that now need to be committed
        $images_to_upload = [];
        if ($session->has('images')) {
            foreach ($session->get('images') as $image) {
                if (strpos($contents, $image) !== false) {
                    array_push($images_to_upload, $image);
                }
            }
        }

        // Commit images
        if (!empty($images_to_upload)) {
            // Get latest commit SHA
            $commits = $client->api('repo')->commits()->all(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                ['sha' => getenv('GITHUB_BRANCH')]
            );
            $latest_sha = $commits[0]['sha'];

            // Create branch
            $branch = 'heads/images' . time();
            $reference = 'refs/' . $branch;
            $client->api('gitData')->references()->create(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                ['ref' => $reference, 'sha' => $latest_sha]
            );

            // Commit images to branch
            foreach ($images_to_upload as $image) {
                $image_path = 'images/' . $image;
                $client->api('repo')->contents()->create(
                    getenv('GITHUB_USER'),
                    getenv('GITHUB_REPO'),
                    $image_path,
                    $this->filesystem->read($image),
                    'Added image ' . $image_path . ' for ' . $filePath,
                    $reference,
                    ['name' => $userName, 'email' => $userEmail]
                );
            }
        }

        // Commit Markdown file
        if ($file === null) {
            $client->api('repo')->contents()->create(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                $contents,
                $commitMessage ?? ('Created ' . $filePath . ' via web editor'),
                getenv('GITHUB_BRANCH'),
                ['name' => $userName, 'email' => $userEmail]
            );
        } else {
            $client->api('repo')->contents()->update(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                $contents,
                $commitMessage ?? ('Updated ' . $filePath . ' via web editor'),
                $file['sha'],
                getenv('GITHUB_BRANCH'),
                ['name' => $userName, 'email' => $userEmail]
            );
        }

        if (!empty($images_to_upload)) {
            // Merge image branch into master
            $client->api('repo')->merge(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                getenv('GITHUB_BRANCH'),
                $branch,
                'merge ' . $branch . ' into master.'
            );

            // Delete image branch
            $client->api('gitData')->references()->remove(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $branch
            );

            // Delete images
            foreach ($session->get('images') as $image) {
                $this->filesystem->delete($image);
            }

            // Clear session images
            $session->unset('images');
        }

        return new EmptyResponse($file === null ? 201 : 204, ['Content-Location' => '/' . $filePath]);
    }

    /**
     * Delete a documentation file.
     */
    public function handleDeleteMarkdown(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        // Retrieve the file information from GitHub
        $filePath = $pathParams['file'];
        // TODO: sanity check the path
        try {
            $client = new GithubClient();
            $client->authenticate(getenv('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                getenv('GITHUB_BRANCH')
            );
        } catch (\Exception $e) {
            if ($e->getCode() === 404) {
                throw new NotFoundException('Markdown file does not exist in repository', $e);
            }
            throw $e;
        }

        // Delete the markdown file
        $client->api('repo')->contents()->rm(
            getenv('GITHUB_USER'),
            getenv('GITHUB_REPO'),
            $filePath,
            'Removed ' . $filePath . ' via web editor',
            $file['sha'],
            getenv('GITHUB_BRANCH'),
            ['name' => $userName, 'email' => $userEmail]
        );

        return new EmptyResponse();
    }

    /**
     * Load an image.
     */
    public function handleGetImage(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        $filePath = $pathParams['file'];
        // TODO: sanity check the path

        // Determine MIME type from the extension
        $mimeType = [
            'gif'  => 'image/gif',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
        ][pathinfo($filePath, PATHINFO_EXTENSION)];

        // Only try to retrieve images from session if user is logged in
        if ($session->has('user_name')) {
            // Try to retrieve image from session
            if ($session->has('images')) {
                foreach ($session->get('images') as $image) {
                    if (('images/' . $image) === $filePath) {
                        return new TextResponse($this->filesystem->read($image), 200, [
                            'Content-Type' => $mimeType,
                        ]);
                    }
                }
            }
        }

        // Retrieve the file information from GitHub
        try {
            $client = new GithubClient();
            $client->authenticate(getenv('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                getenv('GITHUB_USER'),
                getenv('GITHUB_REPO'),
                $filePath,
                getenv('GITHUB_BRANCH')
            );
        } catch (\Exception $e) {
            if ($e->getCode() === 404) {
                throw new NotFoundException('Image does not exist in repository', $e);
            }
            throw $e;
        }

        return (new GuzzleClient())->request('GET', $file['download_url'])->withHeader('Content-Type', $mimeType);
    }

    /**
     * Upload a new image.
     */
    public function handleUploadImage(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        $contentType = $request->getHeader('Content-Type');
        $contentType = end($contentType);
        $filePath = $pathParams['file'];
        $contents = $request->getBody()->__toString();

        // Check MIME type
        if (!\in_array($contentType, [
            'image/gif',
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/webp',
        ])) {
            return new TextResponse('Unsupported image type', 415);
        }

        // Check if upload is a valid image for its type
        $isValid = false;
        switch ($contentType) {
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
            case 'image/webp':
                if ($resource = @imagecreatefromstring($contents)) {
                    $isValid = true;
                    imagedestroy($resource);
                }
                break;
            case 'image/svg+xml':
                libxml_use_internal_errors(true);
                if (simplexml_load_string($contents) && empty(libxml_get_errors())) {
                    $isValid = true;
                }
                libxml_clear_errors();
                break;
        }
        if (!$isValid) {
            return new TextResponse('Invalid image', 400);
        }

        // Generate filename based on contents
        // TODO: We want pretty file names using $filePath, but we also
        //       want to prevent duplicate files using the hash. Right
        //       now, we use just the hash. But maybe something like this
        //       would be nice, combined with a check for a matching hash:
        // $filename = substr(hash('sha256', $contents), 0, 8) . '-' . pathinfo($filePath, PATHINFO_FILENAME) . '.' . [
        $filename = hash('sha256', $contents) . '.' . [
            'image/gif'     => 'gif',
            'image/jpeg'    => 'jpeg',
            'image/png'     => 'png',
            'image/svg+xml' => 'svg',
            'image/webp'    => 'webp',
        ][$contentType];

        // Save file in upload folder
        $this->filesystem->put($filename, $contents);

        // Set image name in Session
        $image_array = $session->has('images') ? $session->get('images') : [];
        array_push($image_array, $filename);
        $session->set('images', $image_array);

        return new EmptyResponse(201, ['Content-Location' => '/images/' . $filename]);
    }
}
