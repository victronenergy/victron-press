<?php

use Github\Client;
use Illuminate\Http\Request;

$router->get('/', function () {
    return redirect(env('APP_URL') . '/editor');
});

$router->get('/editor', function (Request $request) use ($router) {
    if (!$request->session()->has('oauth_token')) {
        if (!empty($request->input('file'))) {
            $request->session()->put("query_file", $request->input('file'));
        }
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
               'Added image via ToastUI!',
               $reference,
               ['name' => $username, 'email' => $provider->getResourceOwner($request->session()->get('oauth_token'))->getEmail() ?? $username . '@unknown.uk']
           );
        }
    }

    // Commit MD
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

        if ($request->session()->has('query_file')) {
            return redirect(env('APP_URL') . '/editor?file=' . $request->session()->get('query_file'));
        }
        return redirect(env('APP_URL') . '/editor');
    }
});

$router->get('/images/{file:.+}', function ($file, Request $request) {
    if ($request->session()->has('images')) {
        foreach($request->session()->get('images') as $image) {
            if ($file == $image) {
                return file_get_contents(storage_path('app/uploads/' . $image));
            }
        }
    }

    $client = new Client();
    $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

    $file = $client->api('repo')->contents()->show(
        env('GITHUB_USER'), env('GITHUB_REPO'), 'docs/images/' . $file, 'master'
    );

    return file_get_contents($file['download_url']);
});

$router->post('/upload', function (Request $request) {
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