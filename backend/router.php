<?php
// Router for local use with PHP's built-in webserver
if (file_exists($_SERVER['DOCUMENT_ROOT'] . preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']))) {
    return false;
} else {
    require $_SERVER['DOCUMENT_ROOT'] . '/index.php';
}
