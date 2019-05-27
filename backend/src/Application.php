<?php

declare(strict_types=1);

namespace VictronEnergy\Press;

use Dotenv\Dotenv;
use Github\Client as GithubClient;
use GuzzleHttp\Client as GuzzleClient;
use League\Container\Container;
use League\Flysystem\Adapter\Local as LocalAdapter;
use League\Flysystem\Filesystem;
use League\OAuth2\Client\Provider\Github as GitHubOAuth2Provider;
use League\Route\Http\Exception as HttpException;
use League\Route\Http\Exception\BadRequestException;
use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\NotFoundException;
use League\Route\Http\Exception\UnauthorizedException;
use League\Route\Router;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use VictronEnergy\Press\Lock\NamedLockStoreInterface;
use VictronEnergy\Press\Lock\PdoLockStore;
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
     * Regex matching all possible ISO 639-1 language codes.
     */
    private const ISO639_1_REGEX = 'a[abefkmnrsvyz]|b[aeghimnors]|c[aaehorsuuuuuvy]|d[aevvvz]|e[elnosstu]|f[afijory]|' .
        'g[addlnuv]|h[aeiorttuyz]|i[adeegiikostu]|j[av]|k[agiijjkllmnorsuvwyy]|l[abbgiiinotuv]|m[ghiklnrsty]|' .
        'n[abbddegllnnorrvvyyy]|o[cjmrss]|p[aailsst]|q[u]|r[mnooouw]|s[acdegiiklmnoqrstuvw]|t[aeghiklnorstwy]|' .
        'u[ggkrz]|v[eio]|w[ao]|x[h]|y[io]|z[aahu]';

    /**
     * Number of seconds a Markdown file remains locked.
     */
    private const LOCK_DURATION = 15 * 60;

    /**
     * Container for accessing lazily loaded dependencies.
     *
     * @var ContainerInterface
     */
    protected $container;

    /**
     * HTTP router for mapping requests to handlers.
     *
     * @var Router
     */
    protected $router;

    /**
     * Configuration values.
     *
     * @var array
     */
    protected $config = [];

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
            $this->config[$envVariable] = getenv($envVariable);
            if (empty($this->config[$envVariable])) {
                throw new \InvalidArgumentException('Missing required environment variable ' . $envVariable);
            }
        }

        // Set up Sentry
        if (getenv('SENTRY_DSN_BACKEND')) {
            \Sentry\init(['dsn' => getenv('SENTRY_DSN_BACKEND')]);
        }

        // Set up container for lazy loading dependencies
        $this->container = new Container();

        // Set up filesystem for uploads
        $this->container->share(Filesystem::class)->addArgument(LocalAdapter::class);
        $this->container->share(LocalAdapter::class)->addArgument(self::PATH . '/data/uploads');

        // Set up lock store
        $this->container->share(NamedLockStoreInterface::class, function (): NamedLockStoreInterface {
            $dbPath = self::PATH . '/data/locks/lockstore.sqlite';
            $existed = file_exists($dbPath);
            $pdo = new \PDO('sqlite:' . $dbPath, null, null, [
                \PDO::ATTR_ERRMODE           => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_STRINGIFY_FETCHES => false,
            ]);
            $lockStore = new PdoLockStore($pdo);
            if (!$existed) {
                $lockStore->createTable();
            }
            return $lockStore;
        });

        // Set up HTTP routing and middleware
        $this->router = new Router();
        $this->router->middleware(new SessionMiddleware(new PhpSessionPersistence()));

        // API handlers
        $this->router->map('GET', '/api/v1/auth', [$this, 'handleAuth']);
        $this->router->map('GET', '/api/v1/oauth-callback', [$this, 'handleOAuthCallback']);
        $this->router->map('POST', '/api/v1/lock', [$this, 'handleLock']);
        $this->router->map('POST', '/api/v1/unlock', [$this, 'handleUnlock']);

        // Handlers for retrieving files
        $this->router->map(
            'GET',
            '/{langcode:(?:' . self::ISO639_1_REGEX . ')}/{file:.+\.html}',
            [$this, 'handleNonExistingLanguage']
        );
        $this->router->map('GET', '/{file:.+\.md}', [$this, 'handleGetMarkdown']);
        $this->router->map('GET', '/{file:.+\.(?:gif|jpg|jpeg|png|svg|webp)}', [$this, 'handleGetImage']);
        $this->router->map('GET', '/{file:.*}', [$this, 'handleNonExisting']);

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
        } catch (HttpException $e) {
            return new TextResponse($e->getStatusCode() . ' ' . $e->getMessage(), $e->getStatusCode());
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
            // Regenerate the session
            $session = $session->regenerate();

            // If a file was specified, save it in the session so we may
            // redirect the user back there once they completed the log in
            if (!empty($request->getQueryParams()['file'])) {
                $session->set('redirect_file', $request->getQueryParams()['file']);
            }

            // GitHub OAuth2 provider
            $provider = new GitHubOAuth2Provider([
                'clientId'     => $this->config['OAUTH_CLIENT_ID'],
                'clientSecret' => $this->config['OAUTH_CLIENT_SECRET'],
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
            'clientId'     => $this->config['OAUTH_CLIENT_ID'],
            'clientSecret' => $this->config['OAUTH_CLIENT_SECRET'],
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

        // Only check access using the GitHub API if the user is not the owner,
        // because the GitHub API considers the owner not to be a collaborator
        if ($userName !== $this->config['GITHUB_USER']) {
            // Use the global application token to check if the logged in user has access to the project
            $client = new GithubClient();
            $client->authenticate($this->config['GITHUB_TOKEN'], null, GithubClient::AUTH_URL_TOKEN);
            try {
                (/** @var \Github\Api\Repo */ $api = $client->api('repo'))->collaborators()->check(
                    $this->config['GITHUB_USER'],
                    $this->config['GITHUB_REPO'],
                    $userName
                );
            } catch (\Exception $e) {
                return new RedirectResponse('/403.html');
            }
        }

        // By setting the user_name we indicate the user is logged in.
        $session->set('user_name', $userName);
        $session->set('user_email', $userEmail);
        $session->persistSessionFor(365 * 24 * 60 * 60);

        // Redirect the user back to the frontend application
        $redirectFile = $session->get('redirect_file', null);
        $session->unset('redirect_file');
        $redirectUrl = '/';
        if (!empty($redirectFile)) {
            $redirectUrl .= preg_replace('/\.md$/i', '.html', $redirectFile) . '?editmode=true';
        }
        return new RedirectResponse($redirectUrl);
    }

    public function handleLock(ServerRequestInterface $request): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        // Sanity check the filename
        $filePath = $request->getQueryParams()['file'];
        if (empty($filePath) || preg_match('#((^|/)\.[^/]+(/|$)|^\d{3}\.md$|(^|/)README\.md$)#i', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Retrieve user data from the session
        $userName = $session->get('user_name');

        // Retrieve the lock
        /** @var NamedLockStoreInterface */
        $lockStore = $this->container->get(NamedLockStoreInterface::class);
        $lock = $lockStore->forName($filePath);

        // Lock
        $hasLocked = $lock->lock($userName, self::LOCK_DURATION);

        // Return status
        return new JsonResponse([
            'success'     => $hasLocked,
            'lockedBy'    => $lock->lockedBy(),
            'lockedUntil' => time() + $lock->lockedFor(),
        ], $hasLocked ? 200 : 409);
    }

    public function handleUnlock(ServerRequestInterface $request): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        // Check if the user is logged in
        if (!$session->has('user_name')) {
            throw new UnauthorizedException('Not logged in');
        }

        // Sanity check the filename
        $filePath = $request->getQueryParams()['file'];
        if (empty($filePath) || preg_match('#((^|/)\.[^/]+(/|$)|^\d{3}\.md$|(^|/)README\.md$)#i', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Retrieve user data from the session
        $userName = $session->get('user_name');

        // Retrieve the lock
        /** @var NamedLockStoreInterface */
        $lockStore = $this->container->get(NamedLockStoreInterface::class);
        $lock = $lockStore->forName($filePath);

        // Unlock
        $lock->unlock($userName);

        // Unlock doesn't yield any status
        return new EmptyResponse();
    }

    /**
     * If a specific language version does not exists, redirect to the English version.
     */
    public function handleNonExistingLanguage(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        $session = $request->getAttribute(SessionMiddleware::SESSION_ATTRIBUTE);

        $langCode = $pathParams['langcode'];
        $filePath = $pathParams['file'];
        // TODO: sanity check the path

        // Redirect if the language is "en", or if the user is not logged in and an English version exists
        if ($langCode === 'en' || (
            !$session->has('user_name') && file_exists(self::PATH . '/data/dist/' . $filePath)
        )) {
            return new RedirectResponse('/' . $filePath);
        }

        // For pages without an English equivalent, offer to create the page
        return $this->handleNonExisting($request, $pathParams);
    }

    /**
     * Shows a "page not found" message and asks user if they want to create a new page.
     */
    public function handleNonExisting(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        return new HtmlResponse(file_get_contents(self::PATH . '/data/dist/404.html'), 404);
    }

    /**
     * Read the contents of a documentation file.
     */
    public function handleGetMarkdown(ServerRequestInterface $request, array $pathParams): ResponseInterface
    {
        // Sanity check the filename
        $filePath = $pathParams['file'];
        if (preg_match('#((^|/)\.[^/]+(/|$)|^\d{3}\.md$|(^|/)README\.md$)#i', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Retrieve the file information from GitHub
        $file = null;
        try {
            $client = new GithubClient();
            $client->authenticate($this->config['GITHUB_TOKEN'], null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                $this->config['GITHUB_USER'],
                $this->config['GITHUB_REPO'],
                $filePath,
                $this->config['GITHUB_BRANCH']
            );
        } catch (\Exception $e) {
            if ($e->getCode() === 404) {
                throw new NotFoundException('Markdown file does not exist in repository', $e);
            }
            throw $e;
        }

        // If the contents are already included, just return those
        if (isset($file['content']) && $file['encoding'] === 'base64') {
            return new TextResponse(
                base64_decode($file['content']),
                200,
                ['Content-Type' => 'text/markdown; charset=UTF-8']
            );
        }

        // Else, download and return the file contents
        return (new GuzzleClient())->request('GET', $file['download_url'])
            ->withHeader('Content-Type', 'text/markdown; charset=UTF-8')
        ;
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

        // Sanity check the filename
        $filePath = $pathParams['file'];
        if (preg_match('#((^|/)\.[^/]+(/|$)|^\d{3}\.md$|(^|/)README\.md$)#i', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Retrieve user data from the session
        $userName = $session->get('user_name');
        $userEmail = $session->get('user_email');

        // Retrieve the lock
        /** @var NamedLockStoreInterface */
        $lockStore = $this->container->get(NamedLockStoreInterface::class);
        $lock = $lockStore->forName($filePath);

        // Lock
        if (!$lock->lock($userName, self::LOCK_DURATION)) {
            throw new ConflictException('Cannot lock the given file');
        }

        // Get commit message from header
        $commitMessage = implode("\n", $request->getHeader('Commit-Message'));
        if (empty($commitMessage)) {
            $commitMessage = null;
        }

        // Read the Markdown contents
        $contents = $request->getBody()->__toString();
        // TODO: check contents for being plain UTF-8 text

        // Check if any images were uploaded that now need to be committed
        $filesToCommit = [$filePath => $contents];
        $imagesToCommit = [];
        if ($session->has('images')) {
            $filesystem = $this->container->get(Filesystem::class);
            foreach ($session->get('images') as $image) {
                if ($filesystem->has($image) && strpos($contents, $image) !== false) {
                    $imagesToCommit[] = $image;
                    $filesToCommit['images/' . $image] = $filesystem->read($image);
                }
            }
        }

        // Create a hash of all the files we're about to commit
        $filesToCommitHash = array_reduce(
            array_keys($filesToCommit),
            /** @psalm-suppress MissingClosureParamType */
            function (string $carry, $f) use ($filesToCommit) {
                /** @psalm-suppress PossiblyFalseOperand */
                return sha1($carry . $f . $filesToCommit[$f]);
            },
            ''
        );

        // Connect to the GitHub API
        $client = new GithubClient();
        $client->authenticate($this->config['GITHUB_TOKEN'], null, GithubClient::AUTH_URL_TOKEN);

        // Get SHA of the latest commit
        $commits = $client->api('repo')->commits()->all(
            $this->config['GITHUB_USER'],
            $this->config['GITHUB_REPO'],
            ['sha' => $this->config['GITHUB_BRANCH']]
        );
        $shaHead = $commits[0]['sha'];

        // Determine base for the commit
        // TODO: Support better merging by using the SHA of the file the user retrieved when editing started
        $shaBase = $shaHead;

        // Branch name for making the commits
        $branch = 'heads/victronpress-' . substr($filesToCommitHash, 0, 8);
        $reference = 'refs/' . $branch;

        // If the base differs from the head, try twice: first using the base, then using the head
        $mergeCompleted = false;
        $mergeException = null;
        $markdownFileExisted = null;
        foreach ($shaBase === $shaHead ? [$shaHead] : [$shaBase, $shaHead] as $sha) {
            // Check if the branch already exists
            $branchInfo = null;
            try {
                $branchInfo = $client->api('gitData')->references()->show(
                    $this->config['GITHUB_USER'],
                    $this->config['GITHUB_REPO'],
                    $branch
                );
            } catch (\Exception $e) {
                if ($e->getCode() !== 404) {
                    throw $e;
                }
            }

            // Set up the branch
            if ($branchInfo === null) {
                $client->api('gitData')->references()->create(
                    $this->config['GITHUB_USER'],
                    $this->config['GITHUB_REPO'],
                    ['ref' => $reference, 'sha' => $sha]
                );
            } else {
                $client->api('gitData')->references()->update(
                    $this->config['GITHUB_USER'],
                    $this->config['GITHUB_REPO'],
                    $branch,
                    ['sha' => $sha, 'force' => true]
                );
            }

            // Commit each file to the branch
            foreach ($filesToCommit as $fileName => $fileContents) {
                // Check if the file already exists on this branch
                $fileInfo = null;
                try {
                    $fileInfo = $client->api('repo')->contents()->show(
                        $this->config['GITHUB_USER'],
                        $this->config['GITHUB_REPO'],
                        $fileName,
                        $reference
                    );
                } catch (\Exception $e) {
                    if ($e->getCode() !== 404) {
                        throw $e;
                    }
                }

                // Remember whether the Markdown file already existed
                if ($fileName === $filePath) {
                    $markdownFileExisted = $fileInfo !== null;
                }

                // Commit the file
                if ($fileInfo === null) {
                    $client->api('repo')->contents()->create(
                        $this->config['GITHUB_USER'],
                        $this->config['GITHUB_REPO'],
                        $fileName,
                        $fileContents,
                        $commitMessage ?? ('Created ' . $fileName . ' via web editor'),
                        $reference,
                        ['name' => $userName, 'email' => $userEmail]
                    );
                } else {
                    $client->api('repo')->contents()->update(
                        $this->config['GITHUB_USER'],
                        $this->config['GITHUB_REPO'],
                        $fileName,
                        $fileContents,
                        $commitMessage ?? ('Updated ' . $fileName . ' via web editor'),
                        $fileInfo['sha'],
                        $reference,
                        ['name' => $userName, 'email' => $userEmail]
                    );
                }
            }

            // TODO: Create, merge & squash and afterwards delete using a GitHub Pull Request
            //       Squashing will result in a less cluttered commit history and all the commits being verified
            // Merge branch
            try {
                $client->api('repo')->merge(
                    $this->config['GITHUB_USER'],
                    $this->config['GITHUB_REPO'],
                    $this->config['GITHUB_BRANCH'],
                    $branch,
                    $commitMessage ?? ('Merge ' . $branch . ' into ' . $this->config['GITHUB_BRANCH'])
                );

                // Indicate success
                $mergeCompleted = true;
            } catch (\Exception $e) {
                if ($e->getCode() !== 409) {
                    throw $e;
                }
                $mergeException = $e;
            }

            // If we merged successfully, do not try to merge again
            if ($mergeCompleted) {
                break;
            }
        }

        // Delete branch we created
        $client->api('gitData')->references()->remove(
            $this->config['GITHUB_USER'],
            $this->config['GITHUB_REPO'],
            $branch
        );

        // If the merge did not complete successfully, let the user know
        if (!$mergeCompleted) {
            throw new ConflictException(
                'Failed to merge commit' . ($mergeException ? (': ' . $mergeException->getMessage()) : ''),
                $mergeException
            );
        }

        // After success, delete uploaded images since they're now available through GitHub
        if ($session->has('images')) {
            $images = $session->get('images');
            $filesystem = $this->container->get(Filesystem::class);
            foreach ($session->get('images') as $i => $image) {
                if (\in_array($image, $imagesToCommit)) {
                    unset($images[$i]);
                    if ($filesystem->has($image)) {
                        $filesystem->delete($image);
                    }
                }
            }
            $images = array_values($images);
            $session->set('images', $images);
        }

        // Return successful response
        return new EmptyResponse($markdownFileExisted ? 204 : 201, ['Content-Location' => '/' . $filePath]);
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

        // Sanity check the filename
        $filePath = $pathParams['file'];
        if (preg_match('#((^|/)\.[^/]+(/|$)|^\d{3}\.md$|(^|/)README\.md$)#i', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Retrieve the file information from GitHub
        try {
            $client = new GithubClient();
            $client->authenticate($this->config['GITHUB_TOKEN'], null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                $this->config['GITHUB_USER'],
                $this->config['GITHUB_REPO'],
                $filePath,
                $this->config['GITHUB_BRANCH']
            );
        } catch (\Exception $e) {
            if ($e->getCode() === 404) {
                throw new NotFoundException('Markdown file does not exist in repository', $e);
            }
            throw $e;
        }

        // Retrieve user data from the session
        $userName = $session->get('user_name');
        $userEmail = $session->get('user_email');

        // Delete the markdown file
        $client->api('repo')->contents()->rm(
            $this->config['GITHUB_USER'],
            $this->config['GITHUB_REPO'],
            $filePath,
            'Removed ' . $filePath . ' via web editor',
            $file['sha'],
            $this->config['GITHUB_BRANCH'],
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

        // Sanity check the filename
        $filePath = $pathParams['file'];
        if (preg_match('#(^|/)\.[^/]+(/|$)#', $filePath)) {
            throw new BadRequestException('Bad filename');
        }

        // Determine MIME type from the extension
        $mimeType = [
            'gif'  => 'image/gif',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
        ][pathinfo($filePath, PATHINFO_EXTENSION)];

        // Only try to retrieve images from session if user is logged in
        if ($session->has('user_name') && $session->has('images')) {
            foreach ($session->get('images') as $image) {
                if (('images/' . $image) === $filePath) {
                    $filesystem = $this->container->get(Filesystem::class);
                    if ($filesystem->has($image) && $fileContent = $filesystem->read($image)) {
                        return new TextResponse($fileContent, 200, [
                            'Content-Type' => $mimeType,
                        ]);
                    }
                    // Image was previously uploaded but no longer on disk
                    // TODO: Handle this error
                    break;
                }
            }
        }

        // Retrieve the file information from GitHub
        try {
            $client = new GithubClient();
            $client->authenticate($this->config['GITHUB_TOKEN'], null, GithubClient::AUTH_URL_TOKEN);
            $file = $client->api('repo')->contents()->show(
                $this->config['GITHUB_USER'],
                $this->config['GITHUB_REPO'],
                $filePath,
                $this->config['GITHUB_BRANCH']
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
        // $filePath = $pathParams['file'];
        // $filename = substr(hash('sha256', $contents), 0, 8) . '-' . pathinfo($filePath, PATHINFO_FILENAME) . '.' . [
        $filename = hash('sha256', $contents) . '.' . [
            'image/gif'     => 'gif',
            'image/jpeg'    => 'jpeg',
            'image/png'     => 'png',
            'image/svg+xml' => 'svg',
            'image/webp'    => 'webp',
        ][$contentType];

        // Save file in upload folder
        $this->container->get(Filesystem::class)->put($filename, $contents);

        // Set image name in Session
        $images = $session->has('images') ? $session->get('images') : [];
        $images[] = $filename;
        $session->set('images', $images);

        return new EmptyResponse(201, ['Content-Location' => '/images/' . $filename]);
    }
}
