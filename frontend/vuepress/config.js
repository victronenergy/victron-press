module.exports = {
    base: '/',
    head: [
        [
            'link',
            {
                rel: 'icon',
                href: 'https://www.victronenergy.com/static/favicon.ico',
            },
        ],
        [
            'link',
            {
                rel: 'stylesheet',
                href: '/css/print.css',
                type: 'text/css',
                media: 'print',
            },
        ],
    ],
    plugins: [require('./plugins/pdf')],
    // title: 'Victron Energy Documentation',
    title: 'Victron Energy Documentation',
    description: 'Victron Energy Documentation',
    themeConfig: {
        // Disable search
        search: false,

        // // Contribution link in header
        repo: 'victronenergy/www-documentation',
        repoLabel: 'Contribute',

        // Details used for editing
        docsRepo: 'victronenergy/www-documentation',
        docsDir: 'docs',
        docsBranch: 'master',

        // Custom editor integration
        editLinks: true,
        editLinkText: 'Edit this page',
        editorLink: '/api/v1/editor?file=',

        // Enable automatic in-page navigation
        sidebar: 'auto',

        // "Last updated" data is fetched from Git
        lastUpdated: 'Last updated',

        // Logo used
        logo: '/assets/img/victron-logo.png',

        // Header navigation items
        nav: [
            // {
            //     text: 'Community',
            //     link: 'https://community.victronenergy.com',
            // },
            {
                text: 'www.victronenergy.com',
                link: 'https://victronenergy.com',
            },
        ],

        locales: {
          '/': {
            lastUpdated: 'Last updated',
            tableOfContents: 'Table of contents',
            pageDoesntExist: 'This page doesn\'t exist yet.', 
            wantToCreatePage: 'Do you want to create it?' 
          }
        }
    },
};
