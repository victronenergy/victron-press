/* eslint-env node */

const dotenv = require('dotenv');
const fs = require('fs-extra');
const globby = require('globby');
const hummus = require('hummus');
const markdownit = require('markdown-it');
const memoryStreams = require('memory-streams');
const moment = require('moment');
const path = require('path');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode');
const vuepressUtil = require('vuepress/lib/util');

// Handle unhandled promise rejections
process.on('unhandledRejection', function(err, promise) {
    console.error('Unhandled rejected', promise);
    process.exit(1);
});

// Load environment variables
dotenv.config();

const inputDir = path.join(__dirname, '../../data/docs');
const outputDir = path.join(__dirname, '../../data/build/pdf');

const markdownitRenderer = new markdownit({
    html: true,
    linkify: true,
    highlight: require('vuepress/lib/markdown/highlight'),
})
    // Plugins used by VuePress
    .use(require('vuepress/lib/markdown/component'))
    .use(require('vuepress/lib/markdown/highlightLines'))
    .use(require('vuepress/lib/markdown/preWrapper'))
    .use(require('vuepress/lib/markdown/snippet'))
    .use(require('vuepress/lib/markdown/containers'))
    .use(require('markdown-it-emoji'))
    .use(require('markdown-it-anchor'), {
        slugify: require('vuepress/lib/markdown/slugify'),
        permalink: false,
    })
    .use(require('markdown-it-table-of-contents'), {
        slugify: require('vuepress/lib/markdown/slugify'),
        includeLevel: [2, 3],
        format: require('vuepress/lib/util/parseHeaders').parseHeaders,
    })
    // Custom plugins
    .use(require('markdown-it-abbr'))
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-kbd'))
    .use(require('markdown-it-sub'))
    .use(require('markdown-it-sup'))
    .use(require('markdown-it-task-lists'))
    .use(require('../markdown-it-plugins/floating-image'))
    .use(require('../markdown-it-plugins/include'))
    .use(require('../markdown-it-plugins/inline-relative-images'))
    .use(require('../markdown-it-plugins/page-break'))
    .use(require('../markdown-it-plugins/table-renderer'))
    .use(require('../markdown-it-plugins/url-fixer'), {
        forceHttps: true,
        forceMarkdownExt: 'pdf',
    })
    .use(require('../markdown-it-plugins/video-thumb'));

const args = process.argv.slice(2);

let languages = new Map();

// Define a mapping between language codes and translation of 'Manual'
const manual_translations = {
    en: 'Manual',
    es: 'Manual',
    pt: 'Manual',
    de: 'Anleitung',
    fr: 'Manuel',
    it: 'Manuale',
    nl: 'Handleiding',
    se: 'Anvandarhandbok',
    fi: 'Ohjeet',
    cz: 'Manuál',
    ro: 'Instrucțiuni',
    tr: 'Talimatlar',
};

// Define the ordering of the pages
const ordering = [
    'en',
    'es',
    'pt',
    'de',
    'fr',
    'it',
    'nl',
    'se',
    'fi',
    'cz',
    'ro',
    'tr',
];

const baseUrl = process.env.BASE_URL || 'https://docs.victronenergy.com/';
if (!process.env.BASE_URL) {
    console.warn(
        `Variable BASE_URL not found in environment; Using ${baseUrl} as BASE_URL`
    );
}

Promise.all([
    fs.ensureDir(outputDir),
    globby(
        [...(args.length ? args : [`**/*.md`]), `!README.md`, `!.vuepress`],
        {
            cwd: inputDir,
            gitignore: true,
        }
    ),
    puppeteer.launch({
        args: []
            .concat(
                process.env.PUPPETEER_DISABLE_DEV_SHM_USAGE === 'true'
                    ? ['--disable-dev-shm-usage']
                    : []
            )
            .concat(
                process.env.PUPPETEER_NO_SANDBOX === 'true'
                    ? ['--no-sandbox']
                    : []
            ),
    }),
    Promise.all([
        fs.readFile(path.join(__dirname, 'pdf.css')),
        fs.readFile(
            path.join(
                __dirname,
                '../vuepress/theme/fonts/MuseoSans/MuseoSans-300.woff'
            )
        ),
        fs.readFile(
            path.join(
                __dirname,
                '../vuepress/theme/fonts/MuseoSans/MuseoSans-700.woff'
            )
        ),
    ]).then(
        ([css, museoSans300, museoSans700]) => `
            @font-face {
                font-family: 'Museo Sans';
                src: url('data:font/woff;base64,${museoSans300.toString(
                    'base64'
                )}') format('woff');
                font-weight: 300;
            }
            @font-face {
                font-family: 'Museo Sans';
                src: url('data:font/woff;base64,${museoSans700.toString(
                    'base64'
                )}') format('woff');
                font-weight: 700;
            }
            ${css}
        `
    ),
    fs.readFile(path.join(__dirname, 'frontpage.css')),
    fs.readFile(path.join(__dirname, 'booklet.css')),
    fs.readFile(
        path.join(__dirname, '../vuepress/theme/images/victron-logo.svg')
    ),
]).then(([_, filePaths, browser, css, fpCSS, bookletCSS, logoSVG]) =>
    Promise.all(
        filePaths.map(async filePath =>
            Promise.all([
                fs
                    .readFile(path.join(inputDir, filePath), 'utf8')
                    .then(md => generateBodyFromMarkdown(md, filePath))
                    .then(([frontmatter, html]) =>
                        generateSinglePDF(
                            frontmatter,
                            filePath,
                            browser,
                            html,
                            css,
                            logoSVG
                        )
                    ),
                fs.ensureDir(
                    // Ensure the necessary output directories exist
                    path.join(outputDir, path.dirname(filePath))
                ),
            ]).then(pdfs =>
                Promise.all([
                    pdfs.map(pdf =>
                        fs.writeFile(
                            path.join(
                                outputDir,
                                filePath.replace(/\.md$/, '.pdf')
                            ),
                            pdf
                        )
                    ),
                    renderEmptyPage(browser, 'A6'), // Generate an empty page we can use in our booklets
                ])
            )
        )
    )
        .then(([[, emptyPage]]) =>
            Promise.all(
                // Loop over all distinct markdown files
                Array.from(languages.keys(), async manual => {
                    // Create variable to store config options of this manual
                    let frontmatter, booklet_config;

                    // Check whether the markdown file exists in the root folder
                    if (fs.existsSync(path.join(inputDir, manual))) {
                        // Parse Frontmatter for config extraction
                        frontmatter = vuepressUtil.parseFrontmatter(
                            await fs.readFile(
                                path.join(inputDir, manual),
                                'utf8'
                            )
                        );

                        booklet_config = frontmatter.data.config;

                        // If there is no config, we don't need to generate a booklet
                        if (!frontmatter.data.config) {
                            return;
                        }
                    } else {
                        // If this md file does not exist in the root folder, we can skip it.
                        return;
                    }

                    console.log(`Generating booklet for ${manual}`);

                    // Create a booklet for each language set in the frontmatter
                    return Promise.all(
                        Array.from(Object.keys(booklet_config.languages)).map(
                            async set => {
                                // Create an array with the different languages + ordering for this booklet
                                const langs = ordering.filter(value => {
                                    return (
                                        languages.get(manual).has(value) &&
                                        booklet_config.languages[set].includes(
                                            value
                                        )
                                    );
                                });

                                // Print a warning to console.error when a language is specified in frontmatter, but no html is generated for that language.
                                booklet_config.languages[set].forEach(lang => {
                                    if (!languages.get(manual).has(lang)) {
                                        console.error(
                                            `Language ${lang} is specified in front matter of ${manual}, but cannot find markdown file ${lang}/${manual}`
                                        );
                                    }
                                });

                                // Generate the front page of this booklet
                                const frontPage = generateFrontPagePDF(
                                    browser,
                                    frontmatter,
                                    manual,
                                    css,
                                    fpCSS,
                                    logoSVG,
                                    langs,
                                    /* Dynamically generate link to online documentation */
                                    baseUrl + manual.replace(/\.md$/, '.html')
                                );

                                //  Create an empty map to store, per language, generated PDF's with and without sidebar
                                let sidebarPDFs = new Map();
                                let noSidebarPDFs = new Map();

                                // Store the page count so that we can set the correct page number per PDF
                                let pageCount = 1;

                                // Loop through the languages that should be contained in this PDF
                                for (const lang of langs) {
                                    // Get the HTML for language `lang`
                                    const html = languages
                                        .get(manual)
                                        .get(lang);

                                    // Generate a PDF with sidebar for `lang` and store it in the sidebar map
                                    sidebarPDFs.set(
                                        lang,
                                        await generateBooklet(
                                            browser,
                                            booklet_config.generic_name,
                                            html,
                                            css,
                                            bookletCSS,
                                            logoSVG,
                                            lang,
                                            langs,
                                            true,
                                            pageCount
                                        )
                                    );

                                    // Generate a PDF without sidebar for `lang` and store it in the sidebar map
                                    noSidebarPDFs.set(
                                        lang,
                                        await generateBooklet(
                                            browser,
                                            booklet_config.generic_name,
                                            html,
                                            css,
                                            bookletCSS,
                                            logoSVG,
                                            lang,
                                            langs,
                                            false,
                                            pageCount
                                        )
                                    );

                                    // Increment the page count with the amount of pages in the PDF for `lang`.
                                    // If the pageCount is even, we add an empty page later on, so we need to increment the page counter by 1
                                    pageCount += await getPageCount(
                                        sidebarPDFs.get(lang)
                                    );
                                    if (pageCount % 2 == 0) pageCount += 1;
                                }

                                // Merge PDF's with and without side bar, so that we only get a side bar on the right pages of the booklet
                                const merged = await mergeLeftRight(
                                    sidebarPDFs,
                                    noSidebarPDFs
                                );

                                // Create an array to store the PDF's we want to merge into one booklet
                                let pdfs = [await frontPage, await emptyPage];

                                // Loop through through the languages in order
                                for (const lang of ordering) {
                                    // If the merged PDF has the language, add it to the array
                                    if (merged.has(lang)) {
                                        const mergedPDF = merged.get(lang);
                                        pdfs.push(mergedPDF);

                                        // If the PDF has an odd amount of pages, we need to add an empty page for formatting
                                        if (
                                            (await getPageCount(mergedPDF)) %
                                                2 ==
                                            1
                                        ) {
                                            pdfs.push(emptyPage);
                                        }
                                    }
                                }

                                // Create a booklet by merging all PDFs into one PDF
                                const booklet = await mergePDFs(...pdfs);

                                // Write the booklet to a file
                                fs.writeFile(
                                    path.join(
                                        outputDir,
                                        `manual_${set}_${manual.replace(
                                            /\.md$/,
                                            '.pdf'
                                        )}`
                                    ),
                                    booklet
                                );
                            }
                        )
                    );
                })
            )
        )
        .finally(() => {
            browser.close();
        })
);

/**
 * This function is used to generate the HTML body of a markdown file, using markdown-it
 * @param {*} md Markdown file that needs to be parsed
 * @param {*} filePath filePath to the markdown file
 */
async function generateBodyFromMarkdown(md, filePath) {
    // Parse the frontmatter of the markdown file
    const frontmatter = vuepressUtil.parseFrontmatter(md);

    // Generate the HTML content for the markdown file using markdown-it
    const html =
        markdownitRenderer.render(frontmatter.content, {
            basePath: inputDir,
            selfPath: path.join(inputDir, filePath),
        }) || '&nbsp;'; // Prevent puppeteer crash on empty body

    // Wrap the HTML content in a page-break div
    const result = `
        <div class="page-break">
            ${html}
        </div>
    `;

    // Add generated HTML to the languages map so that we can use it later when
    // creating the booklets.
    const lang = filePath.split('/').length > 1 ? filePath.split('/')[0] : 'en';
    const file =
        filePath.split('/').length > 1 ? filePath.split('/')[1] : filePath;
    if (!languages.has(file)) {
        languages.set(file, new Map());
    }
    languages.get(file).set(lang, result);

    return [frontmatter, result];
}

/**
 * This function is used to generate a single PDF for an HTML page, given
 * it has the path to the used markdown file, a puppeteer browser, HTML contents,
 * CSS and the Victron logo
 * @param {*} frontmatter Frontmatter of the markdown file corresponding to the (to-be) generated PDF
 * @param {*} filePath Path to the used markdown file (used to get frontmatter)
 * @param {*} browser Puppeteer browser instance
 * @param {*} html HTML content for the PDF page
 * @param {*} css CSS for the PDF page
 * @param {*} logoSVG Logo of victron energy
 */
async function generateSinglePDF(
    frontmatter,
    filePath,
    browser,
    html,
    css,
    logoSVG
) {
    // Infer the title from the frontmatter
    const inferredTitle = vuepressUtil.inferTitle(frontmatter);

    // Render a PDF with the provided contents, and return a buffer containing the PDF
    return renderPDF(
        browser,
        logoSVG,
        filePath.replace(/\.md$/, ''),
        `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${inferredTitle}</title>
            <style>${css}</style>
        </head>
            <body>
                <div class="page-break">
                    ${html}
                </div>
            </body>
        </html>
        `,
        css
    );
}

/**
 * This function is used to actually render the PDF from the HTML contents.
 * @param {*} browser Puppeteer browser instance
 * @param {*} logoSVG SVG file containing logo of Victron Energy
 * @param {*} title Title of the page that will be displayed at the bottom
 * @param {*} html HTML content for the to-be generated PDF
 * @param {*} css CSS for the PDF
 * @param {*} extraCSS [Optional] Extra CSS for the PDF, useful when generating the booklets (default '')
 * @param {*} format [Optional] Format of the generated pdf (default 'A4')
 * @param {*} margin [Optional] Margins of the generated pdf (default '{ top: '25mm', right: '10mm', left: '10mm', bottom: '25mm' }')
 * @param {*} range [Optional] Range of pages to print to PDF (default '1-')
 */
async function renderPDF(
    browser,
    logoSVG,
    title,
    html,
    css,
    extraCSS = '',
    format = 'A4',
    margin = { top: '25mm', right: '10mm', left: '10mm', bottom: '25mm' },
    range = '1-'
) {
    // Create a page in the browser
    const page = await browser
        .newPage()
        .then(page => page.emulateMedia('screen').then(() => page));

    // Add the HTML content to the page
    await page.setContent(html);

    // Return a PDF Buffer generated from the provided HTML and CSS
    return page.pdf({
        format: format,
        margin: margin,
        displayHeaderFooter: true,
        pageRanges: range,
        headerTemplate: `
            <style>${css}</style>
            <style>${extraCSS}</style>
            <header>
                <img src="data:image/svg+xml;base64,${logoSVG.toString(
                    'base64'
                )}" class="logo" />
            </header>`,
        footerTemplate: `
            <style>${css}</style>
            <style>${extraCSS}</style>
            <footer>
                <span class="pageNumber"></span> <span class="doc-title">${title}</span>
            </footer>`,
    });
}

/**
 * This function is used to generate the front page of a booklet
 * @param {*} browser Puppeteer browser instance
 * @param {*} frontmatter Frontmatter of the booklet markdown file
 * @param {*} filePath Path to the markdown file for the booklet
 * @param {*} css CSS for the front page
 * @param {*} fp_css extra CSS front page
 * @param {*} logoSVG SVG file containing the victron logo
 * @param {*} languages Array with the languages that will be in this booklet.
 */
async function generateFrontPagePDF(
    browser,
    frontmatter,
    filePath,
    css,
    fp_css,
    logoSVG,
    languages,
    url
) {
    // Combine all config elements in the frontmatter into 1 object
    const booklet_config = frontmatter.data.config;

    // Infer the title of the front page
    const inferredTitle = vuepressUtil.inferTitle(frontmatter);

    // Generate QR code with link to online documentation
    const qr = await qrcode.toDataURL(url);

    // Generate the HTML for the frontpage of the booklet
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${inferredTitle}</title>
        <style>${css}</style>
        <style>${fp_css}</style>
    </head>
        <body>
            <div class="page-break frontpage">
                <table style="border: none !important">
                    ${
                        /* Create a side bar from `languages` */
                        languages
                            .map(
                                key => `<tr><td> ${manual_translations[key]} </td>
                        <td class="label-cell"> <span class="rotated"> ${key} </span> </td></tr>`
                            )
                            .join('')
                    }
                </table>
                <div class="title">
                    <b>${booklet_config.generic_name}</b><br>
                    <i>${moment().format('YYYY-MM-MM hh:mm:ss')}</i><br>
                    ${booklet_config.product_nos.join('<br>')}
                </div>
                <img src="${qr}" class="qrcode" />
            </div>
        </body>
    </html>
    `;

    // Return a PDF Buffer generated containing the front page of the booklet
    return renderPDF(
        browser,
        logoSVG,
        filePath.replace(/\.md$/, ''),
        html,
        css,
        fp_css,
        'A6',
        {
            top: '25mm',
            right: '5mm',
            left: '5mm',
            bottom: '5mm',
        }
    );
}

/**
 * This function is used to generate an empty PDF page, which can be used
 * for the formatting of the booklet
 * @param {*} browser Puppeteer browser instance
 * @param {*} format Page size of the empty PDF page
 */
async function renderEmptyPage(browser, format = 'A4') {
    // Create a page in the browser
    const page = await browser
        .newPage()
        .then(page => page.emulateMedia('screen').then(() => page));

    // Return a Buffer containing the empty page
    return page.pdf({
        format: format,
    });
}

/**
 * This function is used to generate a booklet version of the PDF of a manual,
 * staring at page number `pageNumber`, given the HTML, CSS, (extra) booklet CSS,
 * logo of Victron Energy, the current language used in the HTML, a list with all
 * languages used in the booklet, and whether to display the sidebar
 * @param {*} browser Puppeteer browser instance
 * @param {*} title Title of the booklet that will be displayed at the bottom of the booklet
 * @param {*} html HTML content of the booklet
 * @param {*} css General CSS for the booklet
 * @param {*} bookletCSS Extra CSS for the booklet
 * @param {*} logoSVG SVG file containing the logo of Victron Energy
 * @param {*} currentLang Language used in the HTML
 * @param {*} languages All languages used in the booklet (necessary when display_sidebar is true)
 * @param {*} display_sidebar Boolean indicating whether we should display the sidebar
 * @param {*} pageNumber Pagenumber to start numbering from
 */
async function generateBooklet(
    browser,
    title,
    html,
    css,
    bookletCSS,
    logoSVG,
    currentLang,
    languages,
    display_sidebar = true,
    pageNumber = 1
) {
    // Generate the HTML for the content of the booklet
    const content = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>${css}</style>
        <style>${bookletCSS}</style>
    </head>
    <body>
        ${
            /* Add `pageNumber` empty pages to the HTML in order to increase the page number */
            '<div class="empty-page">empty</div>'.repeat(pageNumber)
        }
        <div class="">
            <div class="sidebar" ${
                /* Set display to 'none', depending on `display_sidebar` */
                display_sidebar
                    ? 'style=""'
                    : 'style="display: none !important"'
            }>
                <table class="sidebar">
                    <tr>
                        ${
                            /* Create a side bar from `languages`, where `lang` is selected */
                            languages
                                .map(lang => {
                                    if (lang === currentLang) {
                                        return `<td class="sidebar selected">${lang}</td>`;
                                    } else {
                                        return `<td class="sidebar">${lang}</td>`;
                                    }
                                })
                                .join('')
                        }
                    </tr>
                </table>
            </div>
            ${html}
        </div>
    </body>
    </html>
    `;

    // Return a PDF Buffer generated containing the content of the booklet
    return renderPDF(
        browser,
        logoSVG,
        title,
        content,
        css,
        bookletCSS,
        'A6',
        { top: '18mm', right: '0mm', left: '10mm', bottom: '15mm' },
        `${pageNumber +
            1}-` /* Discard the first `pageNumber` pages, which were filler for the page number */
    );
}

/**
 * This function is used to get the amount of pages that are in a PDF
 * @param {*} pdf PDF file to get the pagecount of
 */
async function getPageCount(pdf) {
    // Create a Stream of the PDF contents
    let pdfStream = hummus.createReader(
        new hummus.PDFRStreamForBuffer(await pdf)
    );

    // Return the pagecount of the PDF
    return pdfStream.getPagesCount();
}

/**
 * This function is used to merge the sidebar and non-sidebar PDFs into one
 * PDF where we have alternating pages with and without sidebar.
 * @param {*} sidebarPDFs Mapping containing the generated PDFs with sidebar, per language
 * @param {*} noSidebarPDFs Mapping containing the generated PDFs without sidebar, per language
 * @param {*} switch_LR Boolean indicating whether the sidebar should be on the left or the right page
 */
async function mergeLeftRight(sidebarPDFs, noSidebarPDFs, switch_LR = false) {
    // Create a mapping to store the merged PDFs
    let result = new Map();

    // Loop through each of the keys in the mapping
    for (const key of sidebarPDFs.keys()) {
        // Determine the left and the right page of the booklet, based on `switch_LR`
        let left, right;
        if (switch_LR) {
            left = noSidebarPDFs.get(key);
            right = sidebarPDFs.get(key);
        } else {
            left = sidebarPDFs.get(key);
            right = noSidebarPDFs.get(key);
        }

        // Create an output stream for the merged pdf
        const outStream = new memoryStreams.WritableStream();

        try {
            // Create input streams for the left and right PDF
            const pdfStreamLeft = new hummus.PDFRStreamForBuffer(await left);
            const pdfStreamRight = new hummus.PDFRStreamForBuffer(await right);

            // Create a writer for the output PDF
            const pdfWriter = hummus.createWriter(
                new hummus.PDFStreamForResponse(outStream)
            );

            // Create copying contexts for the left and right PDF so that we
            // can copy pages from these PDFs
            const leftCopyingContext = pdfWriter.createPDFCopyingContext(
                pdfStreamLeft
            );
            const rightCopyingContext = pdfWriter.createPDFCopyingContext(
                pdfStreamRight
            );

            // Loop through all pages, and append alternating left and right pages.
            for (
                let i = 0;
                i <
                leftCopyingContext.getSourceDocumentParser().getPagesCount();
                i++
            ) {
                // If we are on a even number append a left page, else a right page
                if (i % 2 == 0) {
                    leftCopyingContext.appendPDFPageFromPDF(i);
                } else {
                    rightCopyingContext.appendPDFPageFromPDF(i);
                }
            }

            // Close the PDF and write it to a Buffer
            pdfWriter.end();
            const newBuffer = outStream.toBuffer();
            outStream.end();

            // Add the merged pdf to the result mapping
            result.set(key, newBuffer);
        } catch (e) {
            outStream.end();
            throw new Error('Error during PDF zip: ' + e);
        }
    }

    return result;
}

/**
 * This function is used to merge the separate PDFs (front page, white pages,
 * separate language pdfs) into a single PDF.
 * @param  {...any} pdfBuffers PDFs that have to be merged into 1 PDF
 */
async function mergePDFs(...pdfBuffers) {
    // Create an output stream for the combined PDF
    const outStream = new memoryStreams.WritableStream();

    try {
        // Create an input stream for each of the PDFs we want to combine
        const pdfStreams = pdfBuffers.map(
            async buf => new hummus.PDFRStreamForBuffer(await buf)
        );

        // Create a writer for the combined output PDF, from the first PDF (front page)
        const pdfWriter = hummus.createWriterToModify(
            await pdfStreams[0],
            new hummus.PDFStreamForResponse(outStream)
        );

        // Add all subsequent PDFs to the output PDF
        for (let i = 1; i < pdfStreams.length; i++) {
            pdfWriter.appendPDFPagesFromPDF(await pdfStreams[i]);
        }

        // Close the PDF and write it to a Buffer
        pdfWriter.end();
        const newBuffer = outStream.toBuffer();
        outStream.end();

        // Return the combined PDF
        return newBuffer;
    } catch (e) {
        outStream.end();
        throw new Error('Error during PDF combination: ' + e);
    }
}
