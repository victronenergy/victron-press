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

Promise.all([
    fs.ensureDir(outputDir),
    globby([`**/*.md`, `!.vuepress`], {
        cwd: inputDir,
        gitignore: true,
    }),
    puppeteer.launch(),
]).then(([_, filePaths, browser]) =>
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
                        headerTemplate:
                            '<div style="font-size: 20px; font-family: Helvetica, sans-serif; color: #4790d0; text-align: center;"><span style="border-bottom: 1px solid #4790d0; padding-bottom: 0.3cm; font-weight: 700;">Victron Energy</span></div>',
                        footerTemplate:
                            '<div style="font-family: Helvetica, sans-serif; font-weight: 400; font-size: 9px; text-align: right; padding-top: 1cm;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
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
