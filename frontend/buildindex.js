/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const spawn = require('cross-spawn')

const cwd = path.join(__dirname, '../data/docs');
globby([`**/*.md`, `!.vuepress`], {
    cwd,
    gitignore: true
}).then((filePaths) => {
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
            const [commitHash, commitTime] = spawn.sync('git', ['log', '-1', '--format=%H,%ct', path.join(cwd, filePath)]).stdout.toString('utf-8').split(',');
            fResult.lastUpdated = parseInt(commitTime);
            fResult.commitHash = commitHash;
        } catch (e) { /* not available if spawning git fails */ }
        result[basename][lang] = fResult;
    }
    return fs.writeJson(path.join(__dirname, '../data/dist/index.json'), result);
});
