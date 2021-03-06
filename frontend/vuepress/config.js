/* eslint-env node */

const Dotenv = require('dotenv-webpack');
const fs = require('fs-extra');
const path = require('path');

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
    ],
    configureWebpack: config => {
        return {
            plugins: [new Dotenv()],
        };
    },
    chainWebpack: config => {
        config.resolve.symlinks(false);
    },
    markdown: {
        anchor: {
            renderPermalink: ((defaultRenderer, editLinkRenderer) => (
                slug,
                opts,
                state,
                idx
            ) => {
                defaultRenderer(slug, opts, state, idx);
                if (!state.env.isIncluded && state.tokens[idx].tag === 'h2') {
                    editLinkRenderer(slug, opts, state, idx);
                }
            })(
                require('markdown-it-anchor').defaults.renderPermalink,
                require('../../frontend/markdown-it-plugins/anchor-edit-link')
            ),
        },
        config: md => {
            md.set({
                linkify: true,
            });
            md.use(require('markdown-it-abbr'));
            md.use(require('markdown-it-footnote'));
            md.use(require('markdown-it-kbd'));
            md.use(require('markdown-it-sub'));
            md.use(require('markdown-it-sup'));
            md.use(require('markdown-it-task-lists'));
            md.use(require('markdown-it-video'), {
                youtube: { width: 640, height: 390 },
                vimeo: { width: 500, height: 281 },
                vine: { width: 600, height: 600, embed: 'simple' },
                prezi: { width: 550, height: 400 },
            });
            md.use(
                require('../../frontend/markdown-it-plugins/floating-image')
            );
            md.use(require('../../frontend/markdown-it-plugins/include'), {
                basePath: path.join(__dirname, '../../data/docs'),
            });
            md.use(require('../../frontend/markdown-it-plugins/page-break'));
            md.use(
                require('../../frontend/markdown-it-plugins/table-renderer')
            );
            const glossaryFile = path.join(
                __dirname,
                '../../data/docs/glossary.json'
            );
            md.use(
                require('../../frontend/markdown-it-plugins/predefined-tooltip'),
                {
                    tooltips: fs.existsSync(glossaryFile)
                        ? JSON.parse(fs.readFileSync(glossaryFile, 'utf8'))
                        : {},
                    position: 'top',
                }
            );
            md.use(require('../../frontend/markdown-it-plugins/url-fixer'), {
                forceHttps: true,
                forceMarkdownExt: 'html',
            });
        },
    },
    themeConfig: {
        // Disable search
        search: false,

        // Custom editor integration
        enableEditor: true,

        // Enable automatic in-page navigation
        sidebar: 'auto',

        // prettier-ignore
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
                pageDoesntExistYet: "This page doesn't exist yet.",
                pageDoesntExist: "This page doesn't exist.",
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
                unauthorizedCopy: 'To make changes to the Victron Documentation, your log in using your GitHub account.',
                continue: 'Continue',
                forbiddenHeader: "You don't have the right permissions",
                forbiddenCopy: "You've successfully logged in through GitHub, but your account doesn't have the required permissions. Please contact Victron Energy to request collaborator permissions.",
                saveFailedHeader: 'Failed to edit the page',
                saveFailedCopy: 'Something went wrong while editing this page. Please try again later.',
                viewOnGitHub: 'View on GitHub',
                fileLockedModalTitle: 'This page is locked',
                fileLockedModalCopy: 'This page is currently already being edited by:',
                close: 'Close',
                includedSnippet: 'Included snippet:',
                editSectionLink: 'Edit this section'
            },
            '/de': {
                lang: 'de-DE',
                tableOfContents: 'Inhaltsverzeichnis',
                repoLabel: 'Beitragen',
                lastUpdated: 'Letzte Aktualisierung',
                loadingMarkdown: 'Markdown wird geladen ...',
                backLink: 'Zurück',
                editLink: 'Bearbeite diese Seite',
                deleteLink: 'Löschen Sie diese Seite',
                commitButton: 'Änderungen übernehmen',
                pageDoesntExistYet: 'Diese Seite existiert noch nicht.',
                pageDoesntExist: 'Diese Seite existiert nicht.',
                wantToCreatePage: 'Möchten Sie es erstellen?',
                downloadAsPdf: 'Als PDF herunterladen',
                success: 'Erfolg',
                saveSuccessMessage: 'Die Änderungen wurden erfolgreich gespeichert. Die Dokumentation wird jetzt neu erstellt, und Ihre Änderungen werden in wenigen Minuten sichtbar und die Seite wird aktualisiert.',
                deleteSuccessMessage: 'Diese Seite wurde erfolgreich gelöscht. Die Dokumentation wird jetzt neu erstellt, und Ihre Änderungen werden in wenigen Minuten sichtbar und die Seite wird aktualisiert.',
                deletePageModalTitle: 'Seite löschen',
                deletePageModalCopy: 'Möchten Sie diese Seite wirklich löschen? Es kann nicht ungeschehen gemacht werden. Bitte geben Sie den Titel dieser Seite zur Bestätigung ein.',
                deletePageModalPlaceholder: 'Geben Sie hier den Seitentitel ein',
                deletePageModalCTA: 'Löschen Sie diese Datei',
                cancel: 'Stornieren',
                publishPage: 'Seite veröffentlichen',
                publishPageSuccess: 'Die Seite wurde erfolgreich erstellt. Die Dokumentation wird jetzt neu erstellt und die Seite wird in wenigen Minuten sichtbar sein und die Seite wird aktualisiert.',
                saving: 'Speichern ...',
                commit: 'Verpflichten',
                commitMesasgeHeader: 'Änderung übernehmen',
                commitMessageExplanation: 'Bitte schreiben Sie eine kurze Commit-Nachricht über Ihre Änderungen.',
                unauthorizedHeader: 'Tragen Sie zur Victron-Dokumentation bei',
                unauthorizedCopy: 'Um Änderungen an der Victron-Dokumentation vorzunehmen, melden Sie sich mit Ihrem GitHub-Konto an.',
                continue: 'Fortsetzen',
                forbiddenHeader: 'Sie haben nicht die richtigen Berechtigungen',
                forbiddenCopy: 'Sie haben sich erfolgreich über GitHub angemeldet, aber Ihr Konto verfügt nicht über die erforderlichen Berechtigungen. Wenden Sie sich bitte an Victron Energy, um die Berechtigungen eines Mitarbeiters anzufordern.',
                saveFailedHeader: 'Fehler beim Bearbeiten der Seite',
                saveFailedCopy: 'Beim Bearbeiten dieser Seite ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
                viewOnGitHub: 'Auf GitHub ansehen',
                fileLockedModalTitle: 'Diese Seite ist gesperrt',
                fileLockedModalCopy: 'Diese Seite wird zur Zeit bereits bearbeitet von:',
                close: 'Schließen',
                includedSnippet: 'Eingeschlossenes Fragment:',
                editSectionLink: 'Sektion bearbeiten',
            },
            '/es/': {
                lang: 'es-ES',
                tableOfContents: 'Tabla de contenido',
                repoLabel: 'Contribuir',
                lastUpdated: 'Última actualización',
                loadingMarkdown: 'Cargando Markdown ...',
                backLink: 'Espalda',
                editLink: 'Edita esta página',
                deleteLink: 'Borra esta página',
                commitButton: 'Cometer cambios',
                pageDoesntExistYet: 'Esta página no existe todavía.',
                pageDoesntExist: 'Esta página no existe.',
                wantToCreatePage: '¿Quieres crearlo?',
                downloadAsPdf: 'Descargar como PDF',
                success: 'Éxito',
                saveSuccessMessage: 'Los cambios se guardaron con éxito. La documentación ahora se está reconstruyendo y sus cambios serán visibles en un par de minutos y una actualización de la página.',
                deleteSuccessMessage: 'Esta página fue eliminada exitosamente. La documentación ahora se está reconstruyendo y sus cambios serán visibles en un par de minutos y una actualización de la página.',
                deletePageModalTitle: 'Eliminar página',
                deletePageModalCopy: '¿Estás seguro de que quieres eliminar esta página? No se puede deshacer. Por favor, escriba el título de esta página para confirmar.',
                deletePageModalPlaceholder: 'Escriba el título de la página aquí',
                deletePageModalCTA: 'Borrar este archivo',
                cancel: 'Cancelar',
                publishPage: 'Página de publicación',
                publishPageSuccess: 'La página fue creada exitosamente. La documentación se está reconstruyendo y la página se verá en unos minutos y se actualizará la página.',
                saving: 'Ahorro...',
                commit: 'Cometer',
                commitMesasgeHeader: 'Cometer cambio',
                commitMessageExplanation: 'Por favor escriba un breve mensaje de confirmación acerca de sus cambios.',
                unauthorizedHeader: 'Contribuir a la documentación de Victron',
                unauthorizedCopy: 'Para realizar cambios en la Documentación de Victron, inicie sesión con su cuenta de GitHub.',
                continue: 'Continuar',
                forbiddenHeader: 'No tienes los permisos correctos',
                forbiddenCopy: 'Has iniciado sesión correctamente a través de GitHub, pero tu cuenta no tiene los permisos necesarios. Póngase en contacto con Victron Energy para solicitar los permisos de los colaboradores.',
                saveFailedHeader: 'Error al editar la página',
                saveFailedCopy: 'Algo salió mal al editar esta página. Por favor, inténtelo de nuevo más tarde.',
                viewOnGitHub: 'Ver en GitHub',
                fileLockedModalTitle: 'Esta página está bloqueada',
                fileLockedModalCopy: 'Actualmente esta página está ya siendo editado por:',
                close: 'Cerrar',
                includedSnippet: 'Fragmento incluido:',
                editSectionLink: 'Editar esta sección',
            },
            '/fr/': {
                lang: 'fr-FR',
                tableOfContents: 'Table des matières',
                repoLabel: 'Contribuer',
                lastUpdated: 'Dernière mise à jour',
                loadingMarkdown: 'Chargement de Markdown ...',
                backLink: 'Retour',
                editLink: 'Modifier cette page',
                deleteLink: 'Supprimer cette page',
                commitButton: 'Commit modifications',
                pageDoesntExistYet: 'Cette page n’existe pas encore.',
                pageDoesntExist: 'Cette page n’existe pas.',
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
                unauthorizedCopy: "Pour apporter des modifications à la documentation Victron, connectez-vous à l'aide de votre compte GitHub.",
                continue: 'Continuer',
                forbiddenHeader: 'Vous n’avez pas les bonnes permissions',
                forbiddenCopy: 'Vous vous êtes connecté avec succès via GitHub, mais votre compte ne dispose pas des autorisations requises. Veuillez contacter Victron Energy pour demander les autorisations de collaborateur.',
                saveFailedHeader: 'Échec de la modification de la page',
                saveFailedCopy: "Quelque chose s'est mal passé lors de l'édition de cette page. Veuillez réessayer plus tard.",
                viewOnGitHub: 'Voir sur GitHub',
                fileLockedModalTitle: 'Cette page est verrouillée',
                fileLockedModalCopy: 'Cette page est actuellement en cours de modification par:',
                close: 'Fermer',
                includedSnippet: 'Fragment externe incluse:',
                editSectionLink: 'Modifier cette section',
            },
            '/nl/': {
                lang: 'nl-NL',
                tableOfContents: 'Inhoudsopgave',
                repoLabel: 'Bijdragen',
                lastUpdated: 'Laatst bijgewerkt',
                loadingMarkdown: 'Markdown laden...',
                backLink: 'Terug',
                editLink: 'Bewerk deze pagina',
                deleteLink: 'Verwijder deze pagina',
                commitButton: 'Wijzigingen opslaan',
                pageDoesntExistYet: 'Deze pagina bestaat nog niet.',
                pageDoesntExist: 'Deze pagina bestaat niet.',
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
                unauthorizedCopy: 'Om wijzigingen door te kunnen voeren aan de Victron Documentatie moet u zich aanmelden met uw GitHub-account.',
                continue: 'Doorgaan',
                forbiddenHeader: 'U beschikt niet over de vereiste rechten',
                forbiddenCopy: "U bent succesvol ingelogd via GitHub, maar uw account beschikt niet over de vereiste rechten. Neem contact op met Victron Energy en om 'collaborator'-rechten aan te vragen.",
                saveFailedHeader: 'Aanpassen van pagina mislukt',
                saveFailedCopy: 'Er is iets mis gegaan bij het aanpassen van de pagina. Probeert u het later opnieuw.',
                viewOnGitHub: 'Bekijk op GitHub',
                fileLockedModalTitle: 'Deze pagina is gelocked',
                fileLockedModalCopy: 'Deze pagina wordt op dit moment al bewerkt door:',
                close: 'Sluiten',
                includedSnippet: 'Ingesloten fragment:',
                editSectionLink: 'Bewerk dit hoofdstuk',
            },
            '/se/': {
                lang: 'se-SE',
                tableOfContents: 'Innehållsförteckning',
                repoLabel: 'Bidra',
                lastUpdated: 'Senast uppdaterad',
                loadingMarkdown: 'Laddar markdown ...',
                backLink: 'Tillbaka',
                editLink: 'Redigera den här sidan',
                deleteLink: 'Ta bort den här sidan',
                commitButton: 'Begå förändringar',
                pageDoesntExistYet: 'Denna sida existerar inte än.',
                pageDoesntExist: 'Den här sidan existerar inte.',
                wantToCreatePage: 'Vill du skapa den?',
                downloadAsPdf: 'Ladda ner som PDF',
                success: 'Framgång',
                saveSuccessMessage: 'Ändringarna sparades framgångsrikt. Dokumentationen är nu ombyggnad och dina ändringar kommer att synas om några minuter och en uppdatering av sidan.',
                deleteSuccessMessage: 'Den här sidan har tagits bort. Dokumentationen är nu ombyggnad och dina ändringar kommer att synas om några minuter och en uppdatering av sidan.',
                deletePageModalTitle: 'Ta bort sida',
                deletePageModalCopy: 'Är du säker på att du vill ta bort den här sidan? Det kan inte bli ogjort. Vänligen skriv in titeln på den här sidan för att bekräfta.',
                deletePageModalPlaceholder: 'Skriv sidtitel här',
                deletePageModalCTA: 'Ta bort den här filen',
                cancel: 'Annullera',
                publishPage: 'Publicera sida',
                publishPageSuccess: 'Sidan skapades framgångsrikt. Dokumentationen är nu ombyggnad och sidan kommer att synas om några minuter och en uppdatering av sidan.',
                saving: 'Sparande...',
                commit: 'Begå',
                commitMesasgeHeader: 'Commit change',
                commitMessageExplanation: 'Vänligen skriv ett kort åtagande om dina ändringar.',
                unauthorizedHeader: 'Bidra till Victron-dokumentation',
                unauthorizedCopy: 'För att göra ändringar i Victron-dokumentationen loggar du in med ditt GitHub-konto.',
                continue: 'Fortsätta',
                forbiddenHeader: 'Du har inte rätt behörighet',
                forbiddenCopy: 'Du har lyckats logga in via GitHub, men ditt konto har inte de behöriga behörigheterna. Vänligen kontakta Victron Energy för att begära samarbetsbehörigheter.',
                saveFailedHeader: 'Misslyckades med att redigera sidan',
                saveFailedCopy: 'Något gick fel när du redigerade den här sidan. Vänligen försök igen senare.',
                viewOnGitHub: 'Visa på GitHub',
                fileLockedModalTitle: 'Den här sidan är låst',
                fileLockedModalCopy: 'Denna sida är för närvarande redan redigerad av:',
                close: 'Stänga',
                includedSnippet: 'Inkluderat fragment:',
                editSectionLink: 'Redigera detta avsnitt',
            },
        }
    },
    locales: {
        '/': {
            lang: 'en-US',
            title: 'Victron Energy documentation',
            description: 'Victron Energy documentation',
        },
        '/de/': {
            lang: 'de-DE',
            title: 'Victron Energy dokumentation',
            description: 'Victron Energy dokumentation',
        },
        '/es/': {
            lang: 'es-ES',
            title: 'Victron Energy documentación',
            description: 'Victron Energy documentación',
        },
        '/fr/': {
            lang: 'fr-FR',
            title: 'Victron Energy documentation',
            description: 'Victron Energy documentation',
        },
        '/nl/': {
            lang: 'nl-NL',
            title: 'Victron Energy documentatie',
            description: 'Victron Energy documentatie',
        },
        '/se/': {
            lang: 'se-SE',
            title: 'Victron Energy dokumentation',
            description: 'Victron Energy dokumentation',
        },
    },
};
