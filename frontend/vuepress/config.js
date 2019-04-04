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
                downloadAsPdf: 'Download as PDF',
                success: 'Success',
                saveSuccessMessage: 'The changes were saved successfully. The documentation is now rebuilding and your changes should be visible in a couple of minutes.',
                deleteSuccessMessage: 'This page was deleted successfully. The documentation is now rebuilding and your changes should be visible in a couple of minutes.',
                deletePageModalTitle: 'Delete page',
                deletePageModalCopy: 'Are you sure you want to delete this page? It cannot be undone. Please type in the title of this page to confirm.',
                deletePageModalPlaceholder: 'Type page title here',
                deletePageModalCTA: 'Delete this file',
                cancel: 'Cancel',
                publishPage: 'Publish page',
                publishPageSuccess: 'The page was created successfully. The documentation is now rebuilding and the page should be visible in a couple of minutes.',
                saving: 'Saving...',
                commit: 'Commit',
                commitMesasgeHeader: 'Commit change',
                commitMessageExplanation: 'Please write a short commit message about your changes.'
            },
            '/nl/': {
                lang: "nl-NL",
                tableOfContents: 'Inhoudsopgave',
                repoLabel: 'Bijdragen',
                lastUpdated: 'Laatst bijgewerkt',
                loadingMarkdown: 'Markdown laden...',
                backLink: 'Terug',
                editLink: 'Bewerk deze pagina',
                deleteLink: 'Verwijder deze pagina',
                commitButton: 'Wijzigingen opslaan',
                pageDoesntExist: 'Deze pagina bestaat nog niet.',
                wantToCreatePage: 'Wilt u hem aanmaken?',
                downloadAsPdf: 'Download als PDF',
                success: 'Succes',
                saveSuccessMessage: 'De veranderingen zijn succesvol opgeslagen. De documentatie is nu aan het herbouwen en de veranderingen zouden over enkele minuten zichtbaar moeten zijn.',
                deleteSuccessMessage: 'Deze pagina is succesvol verwijderd. De documentatie is nu aan het herbouwen en de veranderingen zouden over enkele minuten zichtbaar moeten zijn.',
                deletePageModalTitle: 'Verwijder pagina',
                deletePageModalCopy: 'Weet u zeker dat u deze pagina wilt verwijderen? Dit kan niet ongedaan gemaakt worden. Typ de titel van deze pagina over om te bevestigen.',
                deletePageModalPlaceholder: 'Typ paginatitel hier',
                deletePageModalCTA: 'Verwijder deze pagina',
                cancel: 'Annuleren',
                publishPage: 'Pagina publiceren',
                publishPageSuccess: 'De pagina is succesvol aangemaakt. De documentatie is nu aan het herbouwen en de veranderingen zouden over enkele minuten zichtbaar moeten zijn.',
                saving: 'Opslaan...',
                commit: 'Commit',
                commitMesasgeHeader: 'Commit verandering',
                commitMessageExplanation: 'Schrijf een korte commit message over uw veranderingen.'
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
