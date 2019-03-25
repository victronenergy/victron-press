<?php
// Router for local use with PHP's built-in webserver
if (file_exists($_SERVER['DOCUMENT_ROOT'] . preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']))) {
    header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 300) . ' GMT');
    return false;
} else {
    require $_SERVER['DOCUMENT_ROOT'] . '/index.php';
}
