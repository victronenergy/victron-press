/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const markdownit = require('markdown-it');
const path = require('path');
const puppeteer = require('puppeteer');
const vuepressUtil = require('vuepress/lib/util');

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
    .use(require('markdown-it-abbr'))
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-kbd'))
    .use(require('markdown-it-sub'))
    .use(require('markdown-it-sup'))
    .use(require('markdown-it-task-lists'))
    .use(require('../markdown-it-plugins/floating-image'))
    .use(require('../markdown-it-plugins/inline-relative-images'))
    .use(require('../markdown-it-plugins/table-renderer'))
    .use(require('../markdown-it-plugins/url-fixer'), {
        forceHttps: true,
        forceMarkdownExt: 'pdf',
    })
    .use(require('../markdown-it-plugins/video-thumb'));

const args = process.argv.slice(2);
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
        ...(process.env.PUPPETEER_NO_SANDBOX === 'true' && {
            args: ['--no-sandbox'],
        }),
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
    fs.readFile(
        path.join(__dirname, '../vuepress/theme/images/victron-logo.svg')
    ),
]).then(([_, filePaths, browser, css, logoSVG]) =>
    Promise.all(
        filePaths.map(async filePath =>
            Promise.all([
                fs.ensureDir(path.dirname(path.join(outputDir, filePath))),
                Promise.all([
                    fs
                        .readFile(path.join(inputDir, filePath), 'utf8')
                        .then(md => {
                            const frontmatter = vuepressUtil.parseFrontmatter(md);
                            const inferredTitle = vuepressUtil.inferTitle(frontmatter);
                            const html = markdownitRenderer.render(
                                frontmatter.content,
                                {
                                    basePath: path.join(
                                        inputDir,
                                        path.dirname(filePath)
                                    ),
                                }
                            );
                            return `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>${inferredTitle}</title>
                                    <style>${css}</style>
                                </head>
                                <body>${html}</body>
                                </html>
                            `;
                        }),
                    browser
                        .newPage()
                        .then(page =>
                            page.emulateMedia('screen').then(() => page)
                        ),
                ]).then(async ([html, page]) => {
                    await page.setContent(html);
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
                            <style>${css}</style>
                            <header>
                                <img src="data:image/svg+xml;base64,${logoSVG.toString(
                                    'base64'
                                )}" class="logo" />
                                ${filePath.replace(/\.md$/, '')}
                            </header>`,
                        footerTemplate: `
                            <style>${css}</style>
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
