<?php
if (file_exists(__DIR__ . '/data/dist' . preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']))) {
    return false;
} else {
    require __DIR__ . '/data/dist/index.php';
}
