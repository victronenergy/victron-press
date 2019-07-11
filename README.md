# Victron Energy documentation

[![last release](https://img.shields.io/github/release/victronenergy/victron-press.svg)](https://github.com/victronenergy/victron-press/releases)
[![build status](https://img.shields.io/travis/com/victronenergy/victron-press/master.svg)](https://travis-ci.com/victronenergy/victron-press)

## Overview

This repository houses two applications: The frontend, which is written using
VueJS, and the backend, which is written in PHP. They are meant to be deployed
together on a single webserver. The (built) frontend provides all the rendered
documentation files, and the backend handles all routing for non-existant paths.

This repository contains the application, while another repository (namely,
[`www-documentation`](https://github.com/victronenergy/www-documentation))
contains the Markdown files and accompanying images which make up the actual
documentation.

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

- Check out the code: `git clone git@github.com:victronenergy/victron-press.git .`
- Initialize the documentation submodule: `git submodule init`
- Pull the latest documentation files: `git submodule update --remote`
- Install frontend dependencies: `npm install`
- Install backend dependencies: `composer install`
- Copy `.env.example` to `.env` and fill out the required configuration variables.

#### Environment variables

The following environment variables should be provided (for example via the
`.env` file) for the application to work:

- `OAUTH_CLIENT_ID`. Required. GitHub OAuth App ID used for authenticating users. The OAuth
  app should have its authorization callback URL set to `<...>/api/v1/oauth-callback`,
  filling out the hostname where the application will be available (for example, when
  developing on your local machine on port 80, use `http://localhost/api/v1/oauth-callback`).
- `OAUTH_CLIENT_SECRET`. Required. GitHub OAuth App client secret used for authentication.
- `GITHUB_TOKEN`. Required. GitHub API token used for making commits to the configured
  GitHub repository. Enter a Personal access token on an account that has access to the
  repository configured below, and provide it with `repo` scope access.
- `GITHUB_USER`. Required. The GitHub user or organisation owning the Git repository
  with the Markdown files this application will display and edit. Note that this should
  be the same repository that is checked out in `/data/docs`.
- `GITHUB_REPO`. Required. The repository name containing the Markdown files.
- `GITHUB_BRANCH`. Required. The branch name containing the Markdown files.
- `SENTRY_DSN_FRONTEND`. Optional. Sentry DSN for logging errors that occur in the frontend.
- `SENTRY_DSN_BACKEND`. Optional. Sentry DSN for logging errors that occur in the frontend.
- `DOCS_BASE_URL`. Required. Base url of where the documentation is located.

#### Running with Docker

Alternatively, a Dockerfile is included which includes all the runtime
dependencies for the project. To use it:

- Check out the repository and its submodule as described above.
- Fill out the `.env` file with the required variables described above.
- Build the Docker container: `docker build -t vic-press .`
- Run the Docker container: `docker run -p 80:80 vic-press`
  - You may want to create volume mappings for `/var/www/data/{locks,sessions,uploads}`
    to preserve editing-related state across container rebuilds.

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

There are multiple ways to work with the backend part of the repository:

- You can run `composer build` to build the frontend and copy the required backend files to `/data/dist`.
  - You can then run `php -S localhost:8080 -t data/dist backend/router.php` to start a development webserver.
- You can run `composer test` to run the backend tests.
- You can run `composer lint` to lint the PHP application.
- You can run `composer fix` to automatically fix PHP linting issues.

## Application structure

### Directory layout

- `/backend/` contains the PHP backend application.
  - `/src/` contains the backend application.
  - `/test/` contains the backend application tests.
  - `/web/` contains the docroot files for the backend.
- `/frontend/` contains the JavaScript frontend application.
  - `/markdown-it-plugins/` contains custom plugins for the Markdown renderer.
  - `/markdown-pdf/` contains formatting files used when generating PDF files.
  - `/vuepress/` contains the VuePress configuration and templates.
- `/data/docs/` contains a checkout of the Markdown files with the actual documentation.
- `/data/dist/` contains a build (PHP + generated HTML + PDF files) after running `composer run build`.

Configuration files for Composer, npm, Docker, Git, tests and linters are placed
in the root directory.

### Example request flow

In this exampel we'll be editing `myfile.md`.

- The user visits `/myfile.html`, which contains the VuePress frontend application.
- The user presses the "Edit this page" button.
- The frontend calls `/api/v1/auth` to check if the user is logged in.
  - If the user is not logged in, the API call returns a `redirectUrl` where
    the user should be redirected to log in.
  - After the login the user will be redirected back to the editor page and
    this flow starts over again.
- The frontend calls `/api/v1/lock` to acquire a lock to edit the file.
  - If the lock cannot be acquired, a error is shown informing the user
    someone else is currently editing the file.
- The frontend loads `/myfile.md` using a GET call to retrieve the raw
  Markdown.
- The user can now edit the page using the editor.
  - If an image is inserted, for example `cat.jpg`, it is uploaded by the
    frontend using a PUT-request to `/images/cat.jpg`, which redirects to the
    final URL where the image can be accessed.
  - As long as the user is still editing, the frontend periodically calls
    `/api/v1/lock` to renew the lock on the file.
- Once the user presses "Save", the frontend does a PUT to `/myfile.md` to
  save the modified contents.
  - The backend commits this content to Git, together with any images that
    were uploaded and referenced in the Markdown.
- The frontend calls `/api/v1/unlock` to unlock the file so others may edit it.
- The frontend notifies the user that his/her changes will be visible in a few
  moments once the new VuePress build has finished.

### Production deployment

In production [a GitHub machine user](https://github.com/VictronPress) is used
for committing and pushing changes to the `www-documentation` repository, as
well as pulling the latest code and documentation from GitHub and deploying it
to the production web server.

## Note for developers

Always aim to leave the code in a better state than you found it in.

All new functionality should have test coverage and commits should be linted,
which you can check with the `composer test`, `npm test`, `composer lint` and
`npm run lint` commands. Some linting issues may be resolved automatically
using `composer fix` and `npm run fix`.
