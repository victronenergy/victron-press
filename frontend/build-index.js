/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const spawn = require('cross-spawn')

const inputDir = path.join(__dirname, '../data/docs');
const outputDir = path.join(__dirname, '../data/dist');

fs.ensureDir(outputDir)
    .then(() => {
        return globby([`**/*.md`, `!.vuepress`], {
            cwd: inputDir,
            gitignore: true
        });
    })
    .then((filePaths) => {
        let result = {};
        const langRegex = /^([a-z]{2})\//;
        for (const filePath of filePaths) {
            const lang = (filePath.match(langRegex) || [null, 'en'])[1];
            const basename = filePath.replace(langRegex, '').replace(/\.md$/, '');
            if (!result[basename]) {
                result[basename] = {};
            }
            let fResult = {
                url: {
                    md: filePath,
                    html: filePath.replace('.md', '.html'),
                    pdf: filePath.replace('.md', '.pdf'),
                },
            };
            try {
                const [commitHash, authorTime, authorName] = spawn.sync('git', ['log', '-1', '--format=%H,%at,%aN', filePath], {cwd: inputDir}).stdout.toString('utf-8').trim().split(',', 3);
                fResult.lastUpdated = parseInt(authorTime);
                fResult.commitHash = commitHash;
                fResult.lastAuthor = authorName;
            } catch (e) { /* not available if spawning git fails */ }
            result[basename][lang] = fResult;
        }
        return result;
    })
    .then((result) => {
        return fs.writeJson(path.join(__dirname, '../data/dist/index.json'), result);
    });
