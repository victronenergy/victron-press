<?php

use Github\Client;
use Illuminate\Http\Request;

$router->get('/', function () {
    return redirect('editor');
});

$router->get('/editor', function (Request $request) use ($router) {
    if (!$request->session()->has('oauth_token')) {
        return '<a href="/callback">Click here to login</a>';
    }

    return file_get_contents(base_path('public/editor.html'));
});


$router->post('/contents', function (Request $request) use ($router) {
    // TODO authentication and input checking
    $path = $request->input('file');

    // Use the global application token to commit with the name of the currently logged in user
    $client = new Client();
    $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

    $provider = new League\OAuth2\Client\Provider\Github([
        'clientId'          => env('OAUTH_CLIENT_ID'),
        'clientSecret'      => env('OAUTH_CLIENT_SECRET'),
        'redirectUri'       => env('OAUTH_REDIRECT_URI')
    ]);

    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), $path, 'master'
    );

    $contents = $request->input('contents');
    $username = $provider->getResourceOwner($request->session()->get('oauth_token'))->getNickname();

    $sha = $file['sha'];

    $client->api('repo')->contents()->update(
        env('GITHUB_USER'),
        env('GITHUB_REPO'),
        $path,
        $contents,
        'Update via ToastUI!',
        $sha,
        'master',
        ['name' => $username, 'email' => $provider->getResourceOwner($request->session()->get('oauth_token'))->getEmail() ?? $username . '@unknown.uk']
    );
});


$router->get('/contents', function (Request $request) use ($router) {
    if (!$request->session()->has('oauth_token')) {
        return response('Not logged in', 401);
    }

    $client = new Client();
    $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), $request->input('file'), 'master'
    );

    return file_get_contents($file['download_url']);
});

$router->get('/callback', function (Request $request) use ($router) {
    $provider = new League\OAuth2\Client\Provider\Github([
        'clientId'          => env('OAUTH_CLIENT_ID'),
        'clientSecret'      => env('OAUTH_CLIENT_SECRET'),
        'redirectUri'       => env('OAUTH_REDIRECT_URI')
    ]);

    if (!isset($_GET['code'])) {

        // If we don't have an authorization code then get one
        $authUrl = $provider->getAuthorizationUrl([
            'scope' => 'user:email'
        ]);
        $request->session()->put('oauth2state', $provider->getState());

        return redirect($authUrl);
        // Check given state against previously stored one to mitigate CSRF attack
    } elseif (empty($_GET['state']) || ($_GET['state'] !== $request->session()->get('oauth2state', null))) {
        $request->session()->forget('oauth2state');
    } else {
        // Try to get an access token (using the authorization code grant)
        $token = $provider->getAccessToken('authorization_code', [
            'code' => $_GET['code']
        ]);

        // Optional: Now you have a token you can look up a users profile data
        $request->session()->put('oauth_token', $token);

        // Use the global application token to check if the logged in user has access to this project
        $client = new Client();
        $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

        try {
            $client->api('repos')->collaborators()->check(
                env('GITHUB_USER'),
                env('GITHUB_REPO'),
                $provider->getResourceOwner($token)->getNickname()
            );
        } catch (\Exception $e) {
            echo 'User ' . $provider->getResourceOwner($token)->getNickname() . ' is not a collaborator';

            // Remove oauth token from sessions
            $request->session()->remove('oauth_token');
            die();
        }

        return redirect('editor.html');
    }
});

$router->get('/images/{file:.+}', function ($file) {
    $client = new Client();
    $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), 'docs/images/' . $file, 'master'
    );

    return file_get_contents($file['download_url']);
});