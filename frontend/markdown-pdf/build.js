/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const markdownpdf = require('markdown-pdf')

const inputDir = path.join(__dirname, '../../data/docs');
const outputDir = path.join(__dirname, '../../data/build/pdf');

fs.ensureDir(outputDir)
    .then(() => {
        return globby([`**/*.md`, `!.vuepress`], {
            cwd: inputDir,
            gitignore: true
        });
    })
    .then((filePaths) => {
        let promises = [];
        for (const filePath of filePaths) {
            promises.push(new Promise((resolve, reject) => {
                markdownpdf({
                    runningsPath: path.join(__dirname, 'runnings.js'),
                    cssPath: path.join(__dirname, 'pdf.css'),
                    paperBorder: '10mm',
                })
                    .from(path.join(inputDir, filePath))
                    .to(path.join(outputDir, filePath.replace('.md', '.pdf')), resolve)
            }))
        }
        return Promise.all(promises);
    });
