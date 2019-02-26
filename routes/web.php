<?php

use Github\Client as GithubClient;
use Illuminate\Http\Request;
use League\OAuth2\Client\Provider\Github as GitHubOAuth2Provider;

/**
 * Check if the user is successfully logged in via OAuth.
 * If not, provides URL where the user can log in.
 */
$router->get('/api/v1/auth', function (Request $request) {
    $result = [
        'success' => $request->session()->has('user_name'),
    ];
    if (!$result['success']) {
        // If a file was specified, save it in the session so we may redirect the user back there once they completed the log in
        if (!empty($request->input('file'))) {
            $request->session()->put("redirect_file", $request->input('file'));
        }

        // GitHub OAuth2 provider
        $provider = new GitHubOAuth2Provider([
            'clientId'     => env('OAUTH_CLIENT_ID'),
            'clientSecret' => env('OAUTH_CLIENT_SECRET'),
        ]);

        // Generate a redirect URI
        $result['redirectUrl'] = $provider->getAuthorizationUrl([
            'scope' => 'user:email'
        ]);

        // Save the state in the session for later validation against CSRF attacks
        $request->session()->put('oauth2state', $provider->getState());
    }
    return response()->json($result);
});

/**
 * User is sent here after logging in with GitHub.
 * Acquires user token and validates if user can access the repository.
 */
$router->get('/api/v1/oauth-callback', function (Request $request) {
    // Check given state against previously stored one to mitigate CSRF attack
    $savedOAuthState = $request->session()->get('oauth2state', null);
    $request->session()->forget('oauth2state');
    if (empty($_GET['code']) || empty($_GET['state']) || $_GET['state'] !== $savedOAuthState) {
        return redirect(env('APP_URL'));
    }

    // GitHub OAuth2 provider
    $provider = new GitHubOAuth2Provider([
        'clientId'     => env('OAUTH_CLIENT_ID'),
        'clientSecret' => env('OAUTH_CLIENT_SECRET'),
    ]);

    // Try to get an access token (using the authorization code grant)
    $token = $provider->getAccessToken('authorization_code', [
        'code' => $_GET['code']
    ]);

    // Retrieve the user for the access token
    $user = $provider->getResourceOwner($token);
    $userName = $user->getNickname();
    $userEmail = $user->getEmail() ?? ($userName . '@users.noreply.github.com');

    // Use the global application token to check if the logged in user has access to the project
    $client = new GithubClient();
    $client->authenticate(env('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
    try {
        $client->api('repos')->collaborators()->check(
            env('GITHUB_USER'),
            env('GITHUB_REPO'),
            $userName
        );
    } catch (\Exception $e) {
        echo 'User ' . $userName . ' is not a collaborator.';
        return redirect(env('APP_URL'));
    }

    // By setting the user_name we indicate the user is logged in.
    $request->session()->put('user_name', $userName);
    $request->session()->put('user_email', $userEmail);

    // Redirect the user back to the frontend application
    $redirectFile = $request->session()->get('redirect_file', null);
    $request->session()->forget('redirect_file');
    if (!empty($redirectFile)) {
        return redirect(env('APP_URL') . '/' . preg_replace('/\.md$/i', '.html', $redirectFile) . '?mode=edit');
    } else {
        return redirect(env('APP_URL'));
    }
});

/**
 * Read the contents of a documentation file.
 */
$router->get('/api/v1/contents', function (Request $request) {
    // Check if the user is logged in
    if (!$request->session()->has('user_name')) {
        return response('Not logged in.', 401);
    }

    // Retrieve the file URL from GitHub
    $client = new GithubClient();
    $client->authenticate(env('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);
    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), $request->input('file'), 'master'
    );

    // Download and return the file contents
    return file_get_contents($file['download_url']);
});

/**
 * Save the contents of a documentation file.
 */
$router->post('/api/v1/contents', function (Request $request) use ($router) {
    // Check if the user is logged in
    if (!$request->session()->has('user_name')) {
        return response('Not logged in.', 401);
    }

    // Get parameters
    $path = $request->input('file');
    $contents = $request->input('contents');
    // TODO: Check the path and contents for being valid MD stuff

    // We use the global application token to commit with the name of the currently logged in user
    $client = new GithubClient();
    $client->authenticate(env('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);

    // Retrieve the file SHA from GitHub
    $sha = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), $path, 'master'
    )['sha'];

    // Retrieve user data from the session
    $userName = $request->session()->get('user_name');
    $userEmail = $request->session()->get('user_email');

    // Check if images are added.
    $images_to_upload = [];
    if ($request->session()->has('images')) {
        foreach ($request->session()->get('images') as $image) {
            if (strpos($contents, $image) !== false) {
                array_push($images_to_upload, $image);
            }
        }
    }

    // Commit images
    if (!empty($images_to_upload)) {
        // Get latest commit SHA
        $commits = $client->api('repo')->commits()->all(
            env('GITHUB_USER'),
            env('GITHUB_REPO'),
            array('sha' => 'master')
        );
        $latest_sha = $commits[0]['sha'];

        // Create branch
        $branch = 'heads/images' . time();
        $reference = 'refs/' . $branch;
        $client->api('gitData')->references()->create(
            env('GITHUB_USER'),
            env('GITHUB_REPO'),
            ['ref' => $reference, 'sha' => $latest_sha]
        );

        // Commit images to branch
        foreach ($images_to_upload as $image) {
           $image_path = 'docs/images/' . $image;
           $data = file_get_contents(storage_path('app/uploads/' . $image));
           $client->api('repo')->contents()->create(
               env('GITHUB_USER'),
               env('GITHUB_REPO'),
               $image_path,
               $data,
               'Added image ' . $image_path . ' for ' . $path,
               $reference,
               ['name' => $userName, 'email' => $userEmail]
           );
        }
    }

    // Commit MD
    $client->api('repo')->contents()->update(
        env('GITHUB_USER'),
        env('GITHUB_REPO'),
        $path,
        $contents,
        'Updated ' . $path . ' via web editor',
        $sha,
        'master',
        ['name' => $userName, 'email' => $userEmail]
    );

    if (!empty($images_to_upload)) {
        // Merge image branch into master
        $client->api('repo')->merge(
            env('GITHUB_USER'),
            env('GITHUB_REPO'),
            'master',
            $branch,
            'merge ' . $branch . ' into master.'
        );

        // Delete image branch
        $client->api('gitData')->references()->remove(
            env('GITHUB_USER'),
            env('GITHUB_REPO'),
            $branch
        );

        // Delete images
        foreach ($request->session()->get('images') as $image) {
            unlink(storage_path('app/uploads/' . $image));
        }

        // Clear session images
        $request->session()->remove('images');
    }
});

/**
 * Load an image.
 */
$router->get('/images/{file:.+}', function ($file, Request $request) {
    if ($request->session()->has('images')) {
        foreach($request->session()->get('images') as $image) {
            if ($file == $image) {
                return file_get_contents(storage_path('app/uploads/' . $image));
            }
        }
    }

    $client = new GithubClient();
    $client->authenticate(env('GITHUB_TOKEN'), null, GithubClient::AUTH_URL_TOKEN);

    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), 'docs/images/' . $file, 'master'
    );

    return file_get_contents($file['download_url']);
});

/**
 * Upload a new image.
 */
$router->post('/api/v1/upload', function (Request $request) {
    // Check if upload is an image
    $image_parts = explode(";base64,", $request->input('content'));
    $img = $image_parts[1];
    if(!imagecreatefromstring(base64_decode($img))) {
        return "Something went wrong uploading the image";
    }

    // If upload folder doesn't exists create one.
    if(!is_dir(storage_path('app/uploads'))) {
        mkdir(storage_path('app/uploads'));
    }

    // Generate unique filename
    $ext = pathinfo($request->input('name'), PATHINFO_EXTENSION);
    $unique_filename = uniqid() . '.' . $ext;

    // Save file in upload folder
    file_put_contents(storage_path('app/uploads/' . $unique_filename),  base64_decode($img));

    // Set image name in Session
    $image_array = $request->session()->has('images') ? $request->session()->get('images') : [];
    array_push($image_array, $unique_filename);
    $request->session()->put('images', $image_array);

    return "./images/" . $unique_filename;
});
