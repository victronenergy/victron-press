<?php

use Github\Client;
use Illuminate\Http\Request;

$router->get('/contents', function (Request $request) use ($router) {
    $client = new Client();
    $client->authenticate(env('GITHUB_TOKEN'), null,Client::AUTH_URL_TOKEN);

    $file = $client->api('repo')->contents()->show(
        'lasselicht', 'victron-live', $request->input('file'), 'master'
    );

    return file_get_contents($file['download_url']);
});