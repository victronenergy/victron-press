'use strict';

// Note: only works in Node.js

const fs = require('fs-extra');
const path = require('path');

module.exports = function inline_relative_images(md, options) {
    const RELATIVE_REGEX = /^(?!https?:\/\/)/;
    const mimeTypes = {
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    };

    // Extract base path passed to options
    const optionsBasePath = (options || {}).basePath || '';

    md.core.ruler.push('inline-relative-images', function(state) {
        const basePath = state.env.basePath || (options || {}).basePath || optionsBasePath;
        const selfPath = state.env.selfPath || '';
        let hasFixed = false;
        for (let i = 0; i < state.tokens.length; i++) {
            const blockToken = state.tokens[i];
            if (blockToken.type === 'inline' && blockToken.children) {
                for (let j = 0; j < blockToken.children.length; j++) {
                    const token = blockToken.children[j];
                    if (token.tag === 'img' && token.attrs) {
                        for (let k = 0; k < token.attrs.length; k++) {
                            const attr = token.attrs[k];
                            if (attr[0] == 'src') {
                                const oldUrl = attr[1];
                                if (RELATIVE_REGEX.exec(oldUrl)) {
                                    const ext = path.extname(oldUrl);
                                    if (mimeTypes[ext]) {
                                        const urlPath = oldUrl[0] == '/' ?
                                            path.join(basePath, oldUrl) :
                                            path.join(path.dirname(selfPath), oldUrl);
                                        if (fs.existsSync(urlPath)) {
                                            const imageData = fs
                                                .readFileSync(urlPath)
                                                .toString('base64');
                                            attr[1] = `data:${mimeTypes[ext]};base64,${imageData}`;
                                            hasFixed = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return hasFixed;
    });
};
