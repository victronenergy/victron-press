# Victron Energy documentation

## Requirements
 - Download and install the latest version of [Git](https://git-scm.com/downloads/).
 - Download and install the latest (not the LTS) version of [NodeJS](https://nodejs.org/en/download/current/).

To check the tools have been set up properly, check that you can run `git version` and `node -v` from a command terminal.

Execute the following commands in the (new, empty) directory where you want to set up the project:

 - Checkout the code: `git clone git@github.com:victronenergy/www-documentation.git .`
 - Install project dependencies: `npm install`

## Building and running
There are multiple ways to work with this repository:

 - You can run `npm start` to start a development webserver and automatically recompile any changes.
 - You can run `npm run build` to simply build the code, which is placed in the `/dist` directory.
 - You can run `npm run buid:clean` to clean all files from the `/dist` directory.
 - You can run `npm run build:html` to build only the HTML application.
 - You can run `npm run build:pdf` to build only the PDF files.
 - You can run `npm run lint` to lint the VuePress configuration and templates.

The build placed in the `/dist` directory is completely self-contained and suitable for distribution.

### Directory layout
 - `/docs/` contains all the Markdown files with the actual documentation.
 - `/docs/.vuepress/` contains the VuePress configuration and templates.
 - `/.markdown-pdf/` contains formatting files used when generating PDF files.
 - `/dist/` contains a build (generated HTML + PDF files) after running `npm run build`.
