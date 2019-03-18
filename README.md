# Victron Energy documentation

## Overview
This repository houses two applications: The frontend, which is written using
VueJS, and the backend, which is written in PHP. They are meant to be deployed
together on a single webserver. The (built) frontend provides all the rendered
documentation files, and the backend handles all routing for non-existant paths.

### Requirements
 - Install the latest version of [Git](https://git-scm.com/downloads/).
 - Install the latest (not the LTS) version of [NodeJS](https://nodejs.org/en/download/current/).
 - Install the latest version of [npm](https://www.npmjs.com/package/npm).
 - Install the latest version of [PHP](https://secure.php.net/downloads.php).
 - Install the [Graphics Draw extension](https://secure.php.net/manual/en/image.installation.php) for PHP.
 - Install the lastest version of [Composer](https://getcomposer.org/download/).
 - (Optional.) Install a web server such as [Apache HTTPD](https://httpd.apache.org/download.cgi).

To check the tools have been set up properly, check that you can run
`git version`, `node -v`, `npm -v`, `php -v` and `composer -V` from a command terminal.

Execute the following commands in the (new, empty) directory where you want to set up the project:

 - Checkout the code: `git clone git@github.com:victronenergy/victron-press.git .`
 - Pull the latest documentation files: `git submodule init && git submodule update --remote`
 - Install frontend dependencies: `npm install`
 - Install backend dependencies: `composer install`

## Frontend
The frontend is a VuePress application that renders the documenation and
provides editor functionalities.

### Building and running
There are multiple ways to work with the frontend part of the repository:

 - You can run `npm start` to start a development webserver and automatically recompile any changes.
 - You can run `npm run build` to simply build the frontend, which is placed in the `/data/dist` directory.
 - You can run `npm run buid:clean` to clean all files from the `/data/dist` directory.
 - You can run `npm run build:html` to build only the HTML application.
 - You can run `npm run build:pdf` to build only the PDF files. (Note: broken on Windows, run in WSL.)
 - You can run `npm run lint` to lint the VuePress configuration and templates.

## Backend
The backend is a PHP application that handles routing of non-existing paths and
provides an API used by the frontend to read and commit documentation files.

### Building and running

 - You can run `composer build` to build the frontend and copy the required backend files to `/data/dist`.
   - You can then run `php -S localhost:80 -t data/dist backend/router.php` to start a development webserver
     or use your own webserver.
 - You can run `composer test` to run the backend tests.
 - You can run `composer lint` to lint the PHP application.
 - You can run `composer fix` to automatically fix PHP linting issues.

### Directory layout
 - `/backend/` contains the PHP backend application.
   - `/src/` contains the backend application.
   - `/test/` contains the backend application tests.
   - `/web/` contains the docroot files for the backend.
 - `/frontend/` contains the JavaScript frontend application.
   - `/markdown-pdf/` contains formatting files used when generating PDF files.
   - `/vuepress/` contains the VuePress configuration and templates.
 - `/data/docs/` contains a checkout of the Markdown files with the actual documentation.
 - `/data/dist/` contains a build (PHP + generated HTML + PDF files) after running `composer run build`.
