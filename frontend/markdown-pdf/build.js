/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const markdownit = require('markdown-it');
const path = require('path');
const puppeteer = require('puppeteer');

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
    .use(require('markdown-it-anchor'))
    // Custom plugins
    .use(require('../markdown-it-plugins/video-thumb'))
    .use(require('../markdown-it-plugins/floating-image'))
    .use(require('../markdown-it-plugins/table-renderer'));

const args = process.argv.slice(2);
Promise.all([
    fs.ensureDir(outputDir),
    globby([...(args.length ? args : [`**/*.md`]), `!README.md`, `!.vuepress`], {
        cwd: inputDir,
        gitignore: true,
    }),
    puppeteer.launch({
        ...(process.env.PUPPETEER_NO_SANDBOX === 'true' && {
            args: ['--no-sandbox'],
        }),
    }),
    fs.readFile(path.join(__dirname, '../vuepress/theme/images/victron-logo.svg')),
]).then(([_, filePaths, browser, logoSVG]) =>
    Promise.all(
        filePaths.map(async filePath =>
            Promise.all([
                fs.ensureDir(path.dirname(path.join(outputDir, filePath))),
                Promise.all([
                    fs
                        .readFile(path.join(inputDir, filePath), 'utf8')
                        .then(md => markdownitRenderer.render(md)),
                    browser.newPage(),
                ]).then(async ([html, page]) => {
                    await page.setContent(html);
                    await page.addStyleTag({
                        path: path.join(__dirname, 'pdf.css'),
                    });
                    await page.emulateMedia('screen');
                    return page.pdf({
                        format: 'A4',
                        margin: {
                            top: '25mm',
                            right: '10mm',
                            bottom: '25mm',
                            left: '10mm',
                        },
                        displayHeaderFooter: true,
                        headerTemplate: `
                            <style type="text/css">
                                header {
                                    -webkit-print-color-adjust: exact;
                                    color-adjust: exact;
                                    color: #272622;
                                    font-family: Helvetica, sans-serif;
                                    font-size: 9px;
                                    font-weight: 400;
                                    padding: 0.25cm 1cm;
                                    text-size-adjust: 100%;
                                    user-select: none;
                                    vertical-align: center;
                                    width: 100%;
                                }
                                .logo {
                                    float: left;
                                    height: 20px;
                                    width: auto;
                                    margin-right: 20px;
                                }
                            </style>
                            <header>
                                <img src="data:image/svg+xml;base64,${logoSVG.toString('base64')}" class="logo" />
                                ${filePath.replace(/\.md$/, '')}
                            </header>`,
                        footerTemplate: `
                            <style type="text/css">
                                footer {
                                    -webkit-print-color-adjust: exact;
                                    color-adjust: exact;
                                    color: #ccc;
                                    font-family: Helvetica, sans-serif;
                                    font-size: 9px;
                                    font-weight: 400;
                                    padding: 0.25cm 1cm;
                                    text-align: right;
                                    text-size-adjust: 100%;
                                    user-select: none;
                                    width: 100%;
                                }
                            </style>
                            <footer>
                                <span class="pageNumber"></span> / <span class="totalPages"></span>
                            </footer>`,
                    });
                }),
            ]).then(([, pdf]) =>
                fs.writeFile(
                    path.join(outputDir, filePath.replace('.md', '.pdf')),
                    pdf
                )
            )
        )
    ).then(() => browser.close())
);
