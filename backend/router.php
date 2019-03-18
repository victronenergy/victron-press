<?php
if (file_exists($_SERVER['DOCUMENT_ROOT'] . preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']))) {
    return false;
} else {
    require $_SERVER['DOCUMENT_ROOT'] . '/index.php';
}
