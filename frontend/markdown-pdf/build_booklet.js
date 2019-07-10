/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const markdownit = require('markdown-it');
const path = require('path');
const puppeteer = require('puppeteer');
const vuepressUtil = require('vuepress/lib/util');
const hummus = require('hummus');
const memoryStreams = require('memory-streams');
var util = require('util');

// Handle unhandled promise rejections
process.on('unhandledRejection', function(err, promise) {
    console.error('Unhandled rejected', promise);
    process.exit(1);
});

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
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: '#',
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

var languages = new Map();

var ordering = [
    'fp',
    'en',
    'es',
    'de',
    'fr',
    'nl',
]

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
        //devtools: true
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
                            .then(html => generatePDF(filePath, browser, html, css, logoSVG)),
                        fs.ensureDir(path.join(outputDir, ...filePath.split("/").slice(0, -1))), // Ensure the necessary output directories exist
                ]).then(pdfs =>
                    Promise.all(
                        pdfs.map(pdf => 
                            fs.writeFile( 
                                path.join(outputDir, filePath.replace('.md', '.pdf')),
                                pdf
                            )
                        ),
                    )
                )
        )
    ).then(() => 
    Promise.all(
        Array.from(languages.keys(), async manual => {
            if (fs.existsSync(path.join(inputDir, manual))) {
                const frontmatter = vuepressUtil.parseFrontmatter(
                    await fs.readFile(path.join(inputDir, manual), 'utf8')
                );

                // Combine all elements in the frontmatter into 1 dict
                var meta = {};
                if (frontmatter.data.meta) {
                    frontmatter.data.meta.forEach(elem => {
                        meta[elem.name] = elem.content;
                    });
                } else {
                    return;
                }

                if (!meta.generate_booklet) {
                    return;
                }
            } else {
                return;
            }

            console.log(`Generating booklet for ${manual}`);

            const langs = ordering.filter(value => languages.get(manual).has(value));
            const frontPage = generateFrontPagePDF(browser, manual, css, fpCSS, logoSVG, langs);
            const emptyPage = renderEmptyPage(browser, 'A6');
            
            var sidebarPDFs = new Map();
            var noSidebarPDFs = new Map();
            var pageCount = 1;
            for (const lang of langs) {
                const html = languages.get(manual).get(lang);

                sidebarPDFs.set(lang, await generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, langs, true, pageCount));
                noSidebarPDFs.set(lang, await generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, langs, false, pageCount));

                pageCount += await getPageCount(sidebarPDFs.get(lang));
                if (pageCount % 2 == 0) pageCount += 1;
            }
            
            var merged = await mergeLeftRight(sidebarPDFs, noSidebarPDFs);
            pdfs = [await frontPage, await emptyPage];
            for (key of ordering) {
                if (merged.has(key)) {
                    const mergedPDF = merged.get(key)
                    pdfs.push(mergedPDF);
                    if ((await getPageCount(mergedPDF)) % 2 == 1) {
                        pdfs.push(emptyPage);
                    }
                }
            }

            const booklet = await mergePDFs(...pdfs);
            fs.writeFile(
                path.join(outputDir, "manual_" + manual.replace(".md", ".pdf")),
                booklet
            )
        })
    )).finally(() => {
        browser.close();
    })
);

async function generateBodyFromMarkdown(md, filePath) {
    const frontmatter = vuepressUtil.parseFrontmatter(
        md
    );

    const html =
        markdownitRenderer.render(frontmatter.content, {
            basePath: inputDir,
            selfPath: path.join(inputDir, filePath),
        }) || '&nbsp;'; // Prevent puppeteer crash on empty body
    
    const result = `
        <div class="page-break">
            ${html}
        </div>
    `
    // Add generated HTML to a dict
    const lang = filePath.split("/").length > 1 ? filePath.split("/")[0] : 'en';
    const file = filePath.split("/").length > 1 ? filePath.split("/")[1] : filePath;
    if (!languages.has(file)) {
        languages.set(file, new Map());
    } 
    languages.get(file).set(lang, result);

    return result;
}

async function generatePDF(filePath, browser, html, css, logoSVG) {
    const frontmatter = vuepressUtil.parseFrontmatter(
        await fs.readFile(path.join(inputDir, filePath), 'utf8')
    );
    const inferredTitle = vuepressUtil.inferTitle(
        frontmatter
    );

    // Put all HTML of the other languages in a separate div, so that we can have page breaks between them
    // frontPage = generateFrontPageHTML(frontmatter, /*browser, css, fp_css,*/ languages.get(filePath));
    return renderPDF(browser, logoSVG, `
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
    `, css);
}

async function renderPDF(browser, logoSVG, html, css, fp_css= '', format='A4', margin={top: '25mm', right: '10mm', left: '10mm', bottom: '25mm'}, range='1-') {
    const page = await browser
        .newPage()
        .then(page =>
            page.emulateMedia('screen').then(() => page)
        );
    
    await page.setContent(html);
    
    return page.pdf({
        format: format,
        margin: margin,
        displayHeaderFooter: true,
        pageRanges: range,
        headerTemplate: `
            <style>${css}</style>
            <style>${fp_css}</style>
            <header>
                <img src="data:image/svg+xml;base64,${logoSVG.toString(
                    'base64'
                )}" class="logo" />
            </header>`,
        footerTemplate: `
            <style>${css}</style>
            <style>${fp_css}</style>
            <footer>
                <span class="pageNumber"></span>
            </footer>`,
    });
}

manual_translations = {
    'en': 'Manual',
    'nl': 'Handleiding',
    'fr': 'Manuel',
    'de': 'Anleitung',
    'es': 'Manual',
    'se': 'Anvandarhandbok',
}

async function generateFrontPagePDF(browser, filePath, css, fp_css, logoSVG, languages) {
    const frontmatter = vuepressUtil.parseFrontmatter(
        await fs.readFile(path.join(inputDir, filePath), 'utf8')
    );

    // Combine all elements in the frontmatter into 1 dict
    var meta = {};
    frontmatter.data.meta.forEach(elem => {
        meta[elem.name] = elem.content;
    });

    const inferredTitle = vuepressUtil.inferTitle(
        frontmatter
    );

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
                    ${languages.map(key => `<tr><td> ${manual_translations[key]} </td>
                    <td class="label-cell"> <span class="rotated"> ${key} </span> </td></tr>`).join('')}
                </table>
                <div class="title">
                    <b>${meta.generic_name}</b><br>
                    ${meta.product_nos.join('<br>')}
                </div>
            </div>
        </body>
    </html>
    `;

    return renderPDF(browser, logoSVG, html, css, fp_css, 'A6', {top: '25mm', right: '5mm', left: '5mm', bottom: '5mm'});
}

async function renderEmptyPage(browser, format='A4') {
    const page = await browser
        .newPage()
        .then(page =>
            page.emulateMedia('screen').then(() => page)
        );
    
    return page.pdf({
        format: format
    });
}

async function generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, languages, display_sidebar = true, pageNumber=10) {

    const tmp = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>${css}</style>
        <style>${bookletCSS}</style>
    </head>
    <body>
        ${[...Array(pageNumber).keys()].map(() => `<div class="empty-page">empty</div>`)}
        <div class="">
            <div class="sidebar" ${display_sidebar ? 'style=""' : 'style="display: none !important"'}>
                <table class="sidebar">
                    <tr>
                        ${languages.map(lang_ => {
                            if (lang_ === lang) {
                                return `<td class="sidebar selected">${lang_}</td>`
                            } else {
                                return `<td class="sidebar">${lang_}</td>`
                            }
                        }).join('')}
                    </tr>
                </table>
            </div>  
            ${html}
        </div>
    </body>
    </html>
    `;

    return renderPDF(browser, logoSVG, tmp, css, bookletCSS, 'A6', {top: '25mm', right: '0mm', left: '10mm', bottom: '25mm'}, range=`${pageNumber + 1}-`);
}

async function getPageCount(pdf) {
    var pdfStream = hummus.createReader(new hummus.PDFRStreamForBuffer(await pdf));
    return pdfStream.getPagesCount()
}

async function mergeLeftRight(sidebarPDFs, noSidebarPDFs, swith_LR=false) {
    var result = new Map();
    for (key of sidebarPDFs.keys()) {
        if (swith_LR) {
            var left = noSidebarPDFs.get(key);
            var right = sidebarPDFs.get(key);
        } else {
            var left = sidebarPDFs.get(key);
            var right = noSidebarPDFs.get(key);
        }

        var outStream = new memoryStreams.WritableStream();

        try {
            var pdfStreamLeft = new hummus.PDFRStreamForBuffer(await left);
            var pdfStreamRight = new hummus.PDFRStreamForBuffer(await right);
            var pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(outStream));
            
            var leftCopyingContext = pdfWriter.createPDFCopyingContext(pdfStreamLeft);
            var rightCopyingContext = pdfWriter.createPDFCopyingContext(pdfStreamRight);

            for (var i = 0; i < leftCopyingContext.getSourceDocumentParser().getPagesCount(); i++) {
                if (i % 2 == 0) {
                    leftCopyingContext.appendPDFPageFromPDF(i);
                } else {
                    rightCopyingContext.appendPDFPageFromPDF(i);
                }
            }

            pdfWriter.end();
            var newBuffer = outStream.toBuffer();
            outStream.end();

            result.set(key, newBuffer);
        } catch (e) {
            outStream.end();
            throw new Error("Error during PDF zip: " + e);
        }
    }

    return result;
}

async function mergePDFs(...pdfBuffers) {
    var outStream = new memoryStreams.WritableStream();

    try {
        var pdfStreams = pdfBuffers.map(async buf => new hummus.PDFRStreamForBuffer(await buf));
        var firstStream = await pdfStreams[0];
        var pdfWriter = hummus.createWriterToModify(firstStream, new hummus.PDFStreamForResponse(outStream));
        for (var i = 1; i < pdfStreams.length; i++) {
            pdfWriter.appendPDFPagesFromPDF(await pdfStreams[i]);
        }
        pdfWriter.end();
        var newBuffer = outStream.toBuffer();
        outStream.end();

        return newBuffer;
    } catch (e) {
        outStream.end();
        throw new Error("Error during PDF combination: " + e);
    }
}