/* eslint-env node */

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const markdownLinkExtractor = require('markdown-link-extractor');

// Handle unhandled promise rejections
process.on('unhandledRejection', function(err, promise) {
    console.error('Unhandled rejected', promise);
    process.exit(1);
});

const inputDir = path.join(__dirname, '../../data/docs');

const args = process.argv.slice(2);

// ![alt-text](./iimages/df2f2b90ccc486e548118057aaa4cd994dcb533c96e3b399d78bfefa4fd72fa3.svg)

Promise.all([
    globby(
        [...(args.length ? args : [`**/*.md`]), `!README.md`, `!.vuepress`],
        {
            cwd: inputDir,
            gitignore: true,
        }
    ),
]).then(([filePaths]) =>
    Promise.all(
        filePaths.map(async filePath =>
            fs
                .readFile(path.join(inputDir, filePath), 'utf8')
                .then(md => checkMarkdownFile(md))
                .then(new_md =>
                    fs.writeFile(path.join(inputDir, filePath), new_md)
                )
        )
    )
);

const extensions = ['jpg', 'jpeg', 'png', 'svg', 'gif', 'tiff'];

function checkExtension(link) {
    for (const e of extensions) {
        if (!link.startsWith('http') && link.endsWith(e)) {
            return true;
        }
    }
    return false;
}

async function checkMarkdownFile(md) {
    const links = markdownLinkExtractor(md);
    const assets = links.filter(link => checkExtension(link));
    const non_existing = assets.filter(asset => !checkIfExists(asset));

    for (let i = 0; i < non_existing.length; i++) {
        const link = non_existing[i];
        const regex = new RegExp(`!\\[(.)*\\]\\(${escapeRegExp(link)}\\)`);
        md = md.replace(
            regex,
            `<p id="gdcalert${i}" ><span style="color: red; font-weight: bold">>>>>> alert: inline image link here (to ${link}). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert${(i +
                1) %
                non_existing.length}">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>`
        );
    }

    return md;
}

function checkIfExists(link) {
    return fs.existsSync(path.join(inputDir, link));
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
