const Dotenv = require('dotenv-webpack');

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
    configureWebpack: config => {
        return { plugins: [new Dotenv()] };
    },
    plugins: [require('./plugins/pdf')],
    markdown: {
        config: md => {
            md.use(require('markdown-it-abbr'));
            md.use(require('markdown-it-video'), {
                youtube: { width: 640, height: 390 },
                vimeo: { width: 500, height: 281 },
                vine: { width: 600, height: 600, embed: 'simple' },
                prezi: { width: 550, height: 400 },
            });
            md.use(require('../../frontend/markdown-it-plugins/floating-image'));
            md.use(require('../../frontend/markdown-it-plugins/table-renderer'))
            md.use(require('../../frontend/markdown-it-plugins/predefined-tooltip'), {
                tooltips: {
                    ':CCGX': "'Color Control GX'",
                },
                position: 'top',
            });
        },
    },
    themeConfig: {
        // Disable search
        search: false,

        // Contribution link in header
        // repo: 'victronenergy/www-documentation',

        // Custom editor integration
        enableEditor: true,

        // Enable automatic in-page navigation
        sidebar: 'auto',

        // Logo used
        logo: '/assets/img/victron-logo.png',

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
                saveSuccessMessage: 'The changes were saved successfully. The documentation is now rebuilding and your changes will be visible in a couple of minutes and a refresh of the page.',
                deleteSuccessMessage: 'This page was deleted successfully. The documentation is now rebuilding and your changes will be visible in a couple of minutes and a refresh of the page.',
                deletePageModalTitle: 'Delete page',
                deletePageModalCopy: 'Are you sure you want to delete this page? It cannot be undone. Please type in the title of this page to confirm.',
                deletePageModalPlaceholder: 'Type page title here',
                deletePageModalCTA: 'Delete this file',
                cancel: 'Cancel',
                publishPage: 'Publish page',
                publishPageSuccess: 'The page was created successfully. The documentation is now rebuilding and the page will be visible in a couple of minutes and a refresh of the page.',
                saving: 'Saving...',
                commit: 'Commit',
                commitMesasgeHeader: 'Commit change',
                commitMessageExplanation: 'Please write a short commit message about your changes.',
                unauthorizedHeader: 'Contribute to Victron Documentation',
                unauthorizedCopy: 'To make changes to the Victron Documentation, your must give Victron access to your Github account.',
                continue: 'Continue',
                forbiddenHeader: 'You don\'t have the right permissions',
                forbiddenCopy: 'You\'ve successfully logged into Github, but your account doesn\'t have the required rights. Please contact Victron Energy and ask them to give collaborator rights to your Github account.',
                saveFailedHeader: 'Failed to edit the page',
                saveFailedCopy: 'Something went wrong while editing this page. Please try again later.'
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
                saveSuccessMessage: 'De veranderingen zijn succesvol opgeslagen. De documentatie is nu aan het herbouwen en de veranderingen zijn over enkele minuten zichtbaar na het opnieuw laden van de pagina.',
                deleteSuccessMessage: 'Deze pagina is succesvol verwijderd. De documentatie is nu aan het herbouwen en de veranderingen zijn over enkele minuten zichtbaar na het opnieuw laden van de pagina.',
                deletePageModalTitle: 'Verwijder pagina',
                deletePageModalCopy: 'Weet u zeker dat u deze pagina wilt verwijderen? Dit kan niet ongedaan gemaakt worden. Typ de titel van deze pagina over om te bevestigen.',
                deletePageModalPlaceholder: 'Typ paginatitel hier',
                deletePageModalCTA: 'Verwijder deze pagina',
                cancel: 'Annuleren',
                publishPage: 'Pagina publiceren',
                publishPageSuccess: 'De pagina is succesvol aangemaakt. De documentatie is nu aan het herbouwen en de veranderingen zijn over enkele minuten zichtbaar na het opnieuw laden van de pagina.',
                saving: 'Opslaan...',
                commit: 'Commit',
                commitMesasgeHeader: 'Commit verandering',
                commitMessageExplanation: 'Schrijf een korte commit message over uw veranderingen.',
                unauthorizedHeader: 'Meewerken aan Victron Documentatie',
                unauthorizedCopy: 'Om wijzigingen door te kunnen voeren aan de Victron Documentatie moet u Victron toegang geven tot uw Github account.',
                continue: 'Doorgaan',
                forbiddenHeader: 'U beschikt niet over de vereiste rechten',
                forbiddenCopy: 'U bent succesvol ingelogd op Github, maar uw account beschikt niet over de vereiste rechten. Neem contact op met Victron Energy en vraag om uw Github account \'collaborator\' rechten te geven.',
                saveFailedHeader: 'Aanpassen van pagina mislukt',
                saveFailedCopy: 'Er is iets mis gegaan bij het aanpassen van de pagina. Probeert u het later opnieuw.'
            },
            '/fr/': {
                lang: "fr-FR",
                tableOfContents: 'Table des matières',
                repoLabel: 'Contribuer',
                lastUpdated: 'Dernière mise à jour',
                loadingMarkdown: 'Chargement de Markdown ...',
                backLink: 'Retour',
                editLink: 'Modifier cette page',
                deleteLink: 'Supprimer cette page',
                commitButton: 'Commit modifications',
                pageDoesntExist: 'Cette page n’existe pas encore.',
                wantToCreatePage: 'Voulez vous le créer?',
                downloadAsPdf: 'Télécharger en PDF',
                success: 'Succès',
                saveSuccessMessage: 'Les modifications ont été enregistrées avec succès. La documentation est en cours de reconstruction et vos modifications seront visibles dans quelques minutes et une actualisation de la page.',
                deleteSuccessMessage: 'Cette page a été supprimée avec succès. La documentation est en cours de reconstruction et vos modifications seront visibles dans quelques minutes et une actualisation de la page.',
                deletePageModalTitle: 'Supprimer la page',
                deletePageModalCopy: 'Êtes-vous sûr de vouloir supprimer cette page? Ça ne peut pas être défait. Veuillez saisir le titre de cette page pour confirmer.',
                deletePageModalPlaceholder: 'Tapez le titre de la page ici',
                deletePageModalCTA: 'Supprimer ce fichier',
                cancel: 'Annuler',
                publishPage: 'Publier la page',
                publishPageSuccess: 'La page a été créée avec succès. La documentation est en cours de reconstruction et la page sera visible dans quelques minutes et une actualisation de la page.',
                saving: 'Saving...',
                commit: 'Commit',
                commitMesasgeHeader: 'Engager le changement',
                commitMessageExplanation: 'Veuillez écrire un court message de validation concernant vos modifications.',
                unauthorizedHeader: 'Contribuer à la documentation de Victron',
                unauthorizedCopy: 'Pour apporter des modifications à la documentation Victron, vous devez donner à Victron accès à votre compte Github.',
                continue: 'Continuer',
                forbiddenHeader: 'Vous n’avez pas les bonnes permissions',
                forbiddenCopy: 'Vous avez réussi à vous connecter à Github, mais votre compte n’a pas les droits requis. Veuillez contacter Victron Energy et leur demander d\'accorder des droits de collaborateur sur votre compte Github.',
                saveFailedHeader: 'Échec de la modification de la page',
                saveFailedCopy: 'Quelque chose s\'est mal passé lors de l\'édition de cette page. Veuillez réessayer plus tard.'
            },
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
        },
        '/fr/': {
            lang: 'fr-FR',
            title: 'Victron Energy documentation',
            description: 'Victron Energy documentation',
        }
    }
};
