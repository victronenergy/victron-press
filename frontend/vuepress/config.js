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
    themeConfig: {
        // Disable search
        search: false,

        // Contribution link in header
        repo: 'victronenergy/www-documentation',

        // Custom editor integration
        enableEditor: true,

        // Enable automatic in-page navigation
        sidebar: 'auto',

        // Logo used
        logo: '/assets/img/victron-logo.png',

        // Header navigation items
        nav: [
            {
                text: 'www.victronenergy.com',
                link: 'https://victronenergy.com',
            },
        ],

        locales: {
            '/': {
                lastUpdated: 'Last updated',
                tableOfContents: 'Table of contents',
                editLink: 'Edit this page',
                repoLabel: 'Contribute',
                pageDoesntExist: 'This page doesn\'t exist yet.',
                wantToCreatePage: 'Do you want to create it?',
            },
            '/nl/': {
                lastUpdated: 'Laatst bijgewerkt',
                tableOfContents: 'Inhoudsopgave',
                editLink: 'Bewerk deze pagina',
                repoLabel: 'Bijdragen',
                pageDoesntExist: 'Deze pagina bestaat nog niet.',
                wantToCreatePage: 'Wil je hem aanmaken?',
            }
        }
    },
    locales: {
        '/': {
            lang: 'en-US',
            title: 'Victron Energy Documentation',
            description: 'Victron Energy Documentation',
        },
        '/nl/': {
            lang: 'nl-NL',
            title: 'Victron Energy documentatie',
            description: 'Victron Energy documentatie',
        }
    }
};
