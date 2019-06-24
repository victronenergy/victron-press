// Editor preview for include plugin syntax
//
'use strict';

module.exports = function include_preview_plugin(md, options) {
    // Regex for matching include tag
    const includeTagRegex = /^\[\[([^\]:\n]+\.md)(:([^\]\n]+))?\]\]/i;

    // Rule for replacing include tag with token
    md.inline.ruler.after('emphasis', 'include', (state, silent) => {
        // Reject if the token does not start with the correct char
        if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */ ) {
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
            state.pos += match[0].length;
        }

        return true;
    });

    // Create link for included files
    md.renderer.rules.include = (tokens, idx, options, env, self) => {
        var filePath = tokens[idx].filePath;
        // remove the .md of the file
        var pathname = filePath.substring(0, filePath.length - 3) + '.html?editmode=true'
        // return built of link
        var url = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port
        if (filePath.charCodeAt(0) == 47) {
            url = url + pathname;

            if (filePath.length > 1) {
                filePath = filePath.substring(1, filePath.length);
            }
        } else {
            url = url + '/' + pathname;
        }

        // TODO: load correct translation at runtime
        return `
            <p class="snippet">
                Included snippet:
                <a class="snippet-desc" href="${url}" target="_blank">
                    ${filePath}
                </a>
            </p>
        `;
    };
};
