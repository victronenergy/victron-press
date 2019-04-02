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
      // markdown: {
      //   config: md => {
      //     md.set({
      //       breaks: true
      //     })
      //     md.use(require('tui-editor/dist/tui-editor-extTable.js'))
      //   }
      // },
    plugins: [require('./plugins/pdf')],
    markdown: {
        config: md => {
            md.use(require('../../frontend/markdown-it-plugins/markdown-it-floating-image'))
        },
    },
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
                tableOfContents: 'Table of contents',
                repoLabel: 'Contribute',
                lastUpdated: 'Last updated',
                loadingMarkdown: 'Loading Markdown...',
                backLink: 'Back',
                editLink: 'Edit this page',
                deleteLink: 'Delete this page',
                commitButton: 'Commit changes',
                pageDoesntExist: 'This page doesn\'t exist yet.',
                wantToCreatePage: 'Do you want to create it?',
            },
            '/nl/': {
                tableOfContents: 'Inhoudsopgave',
                repoLabel: 'Bijdragen',
                lastUpdated: 'Laatst bijgewerkt',
                loadingMarkdown: 'Markdown laden...',
                backLink: 'Terug',
                editLink: 'Bewerk deze pagina',
                deleteLink: 'Verwijder deze pagina',
                commitButton: 'Wijzigingen opslaan',
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
