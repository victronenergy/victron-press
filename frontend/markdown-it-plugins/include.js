// Allows adding a page break
//
'use strict';

const fs = require('fs-extra');
const path = require('path');
const vuepressUtil = require('vuepress/lib/util');

module.exports = function include_plugin(md, options) {
    // Regex for matching include tag
    const includeTagRegex = /^\[\[([^\]:\n]+\.md)(:([^\]\n]+))?\]\]/i;

    // Regex for matching opening and closing fences / containers
    const blockRegex = /(^|\n)(```[a-zA-Z]*|::: [a-zA-Z]+( [^\n]+)?)(\n|$)/g;

    // Extract base path passed to options
    const optionsBasePath = (options || {}).basePath || '';

    // Rule for replacing include tag with token
    md.inline.ruler.after('emphasis', 'include', (state, silent) => {
        // Reject if the token does not start with the correct char
        if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */) {
            return false;
        }

        // Detect break tag
        const match = includeTagRegex.exec(state.src.substr(state.pos));
        if (!match) {
            return false;
        }

        // Insert the include token
        if (!silent) {
            // Build content
            let token = state.push('include', 'include', 0);
            token.filePath = match[1];
            token.heading = match[3];
            token.state = state;

            // Update pos so the parser can continue
            var newline = state.src.indexOf('\n', state.pos);
            if (newline !== -1) {
              state.pos = newline;
            } else {
              state.pos = state.pos + state.posMax + 1;
            }
        }

        return true;
    });

    // Renderer for included files
    md.renderer.rules.include = (tokens, idx, options, env, self) => {
        if (!env.includes) {
            env.includes = {};
        }
        const basePath = env.basePath || (options || {}).basePath || optionsBasePath;
        const selfPath = env.selfPath || '';
        const filePath = tokens[idx].filePath[0] == '/' ?
            path.join(basePath, tokens[idx].filePath) :
            path.join(path.dirname(selfPath), tokens[idx].filePath);
        if (!((':' + filePath) in env.includes)) {
            // We set it empty first to block any circular recursion
            env.includes[':' + filePath] = '';

            // Check if the included file exists
            if (fs.existsSync(filePath)) {
                // Read the included file
                let { content } = vuepressUtil.parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));

                // If a specific heading was specified, extract it
                const heading = tokens[idx].heading;
                if (heading) {
                    const firstHeading = (new RegExp(`^(#+) ${md.utils.escapeRE(heading)}$`, 'im')).exec(content);
                    if (!firstHeading) return '';
                    content = content.substr(firstHeading.index + firstHeading[1].length + 1 + heading.length + 1);

                    // The end of the extract is the next heading of equal or higher level, ignoring headers
                    // contained in a code fence or container (we check this by counting, which is not by any means
                    // an accurate solution, but it's a lot cheaper than doing a full token parse and works well
                    // enough for the time being).
                    const nextHeadingRegex = new RegExp(`(^|\n)#{1,${firstHeading[1].length}} [^\n]+(\n|$)`, 'g');
                    let nextHeading;
                    while(nextHeading = nextHeadingRegex.exec(content)) {
                        const extract = content.substr(0, nextHeading.index);
                        if ((extract.match(blockRegex) || []).length % 2 === 0) {
                            content = extract;
                            break;
                        }
                    }
                }

                // Initialize a new environment for rendering the included file
                const newEnv = {
                    basePath: basePath,
                    selfPath: filePath,
                    includes: env.includes,
                };
                if ('selfUrl' in env) {
                    // Use the relative path to the included file to calculate the new selfUrl
                    newEnv.selfUrl = (new URL(
                        path.relative(path.dirname(selfPath), filePath),
                        env.selfUrl
                    )).toString();
                }

                // Render the included markdown file
                let html = md.render(content, newEnv);
                if (typeof html !== 'string') {
                    // VuePress "enhances" the render() function to return an object
                    html = html.html;
                }
                env.includes[':' + filePath] = html;
            }
        }
        return env.includes[':' + filePath];
    };
};
