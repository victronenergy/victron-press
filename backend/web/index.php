<?php

declare(strict_types=1);

// Set up the Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';

// Requires
use Psr\Http\Message\ResponseInterface;
use VictronEnergy\Press\Application;
use Zend\Diactoros\Response\TextResponse;
use Zend\Diactoros\ServerRequestFactory;
use Zend\HttpHandlerRunner\Emitter\SapiEmitter;
use Zend\HttpHandlerRunner\RequestHandlerRunner;

// Instanciate and run the application
(new RequestHandlerRunner(
    new Application(),
    new SapiEmitter(),
    [ServerRequestFactory::class, 'fromGlobals'],
    function (Throwable $e): ResponseInterface {
        return new TextResponse($e->getMessage(), 500);
    }
))->run();
