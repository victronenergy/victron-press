/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const spawn = require('cross-spawn');

const inputDir = path.join(__dirname, '../data/docs');
const outputDir = path.join(__dirname, '../data/build/index');

Promise.all([
    fs.ensureDir(outputDir),
    globby([`**/*.md`, `!README.md`, `!.vuepress`], {
        cwd: inputDir,
        gitignore: true,
    }),
])
    .then(([, filePaths]) =>
        Promise.all(
            filePaths.map(
                filePath =>
                    new Promise((resolve, reject) => {
                        let process = spawn(
                            'git',
                            ['log', '-1', '--format=%H,%at,%aN', filePath],
                            { cwd: inputDir, stdio: 'pipe' }
                        );
                        process.once('exit', (code, signal) => {
                            const stdout = process.stdout
                                .setEncoding('utf8')
                                .read();
                            if (
                                code !== 0 ||
                                signal !== null ||
                                !stdout ||
                                !stdout.length
                            ) {
                                resolve([filePath, {}]);
                            }

                            // Parse Git data
                            const [
                                commitHash,
                                authorTime,
                                authorName,
                            ] = stdout.trim().split(',', 3);

                            resolve([
                                filePath,
                                {
                                    lastUpdated: parseInt(authorTime),
                                    commitHash: commitHash,
                                    lastAuthor: authorName,
                                },
                            ]);
                        });
                    })
            )
        )
    )
    .then(files => {
        let result = {};
        const langRegex = /^([a-z]{2})\//;
        for (const [filePath, gitData] of files) {
            const lang = (filePath.match(langRegex) || [null, 'en'])[1];
            const basename = filePath
                .replace(langRegex, '')
                .replace(/\.md$/, '');
            if (!result[basename]) {
                result[basename] = {};
            }
            result[basename][lang] = {
                url: {
                    md: filePath,
                    html: filePath.replace('.md', '.html'),
                    pdf: filePath.replace('.md', '.pdf'),
                },
                ...gitData,
            };
        }
        return fs.writeJson(path.join(outputDir, 'index.json'), result);
    });
