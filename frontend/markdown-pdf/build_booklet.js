/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const markdownit = require('markdown-it');
const path = require('path');
const puppeteer = require('puppeteer');
const vuepressUtil = require('vuepress/lib/util');
const hummus = require('hummus');
const memoryStreams = require('memory-streams');

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
                console.log(`${path.join(inputDir, manual)} exists`);
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
                console.log(`${path.join(inputDir, manual)} does not exist`);
                return;
            }

            console.log(`Generating booklet for ${manual}`);

            const langs = Array.from(languages.get(manual).keys());
            const frontPage = generateFrontPagePDF(browser, manual, css, fpCSS, logoSVG, langs);
            
            var sidebarPDFs = new Map();
            languages.get(manual).forEach((html, lang) => sidebarPDFs.set(lang, generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, langs)));
            var noSidebarPDFs = new Map();
            languages.get(manual).forEach((html, lang) => noSidebarPDFs.set(lang, generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, langs, false)));
            
            var pdfs = await mergeLeftRight(sidebarPDFs, noSidebarPDFs);
            pdfs.set('fp', frontPage);

            const booklet = await mergePDFs(...Array.from(pdfs.values()));
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

async function renderPDF(browser, logoSVG, html, css, fp_css= '', format='A4', margin={top: '25mm', right: '10mm', left: '10mm', bottom: '25mm'}) {
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
                <span class="pageNumber"></span> / <span class="totalPages"></span>
            </footer>`,
    });
}

manual_translations = {
    'en': [1, 'Manual'],
    'nl': [2, 'Handleiding'],
    'fr': [3, 'Manuel'],
    'de': [4, 'Anleitung'],
    'es': [5, 'Manual'],
    'se': [6, 'Anvandarhandbok'],
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

async function generateBooklet(browser, html, css, bookletCSS, logoSVG, lang, languages, display_sidebar = true) {

    const tmp = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>${css}</style>
        <style>${bookletCSS}</style>
    </head>
    <body>
        <div class="page-break">
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

    return renderPDF(browser, logoSVG, tmp, css, bookletCSS, 'A6', {top: '25mm', right: '0mm', left: '10mm', bottom: '25mm'});
}

async function mergeLeftRight(sidebarPDFs, noSidebarPDFs, swith_LR=false) {
    var result = new Map();
    for (key of sidebarPDFs.keys()) {
        if (swith_LR) {
            var left = sidebarPDFs.get(key);
            var right = noSidebarPDFs.get(key);
        } else {
            var left = noSidebarPDFs.get(key);
            var right = sidebarPDFs.get(key);
        }

        var outStream = new memoryStreams.WritableStream();

        try {
            console.log(key);
            console.log(sidebarPDFs);
            console.log(noSidebarPDFs);
            console.log(await left);
            console.log(await right);
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
        return result;
    }
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