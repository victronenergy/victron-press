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
            // newline = state.src.indexOf('\n', state.pos); // Using this syntax makes Webpack think this is a ES6 module
            var newline;
            do {
                state.pos++;
                newline = state.src;
            } while (
                state.pos < state.src.length &&
                state.src.charCodeAt(state.pos - 1) !== 10
            );

            if (newline !== -1) {
                state.pos = newline;
            } else {
                state.pos = state.pos + state.posMax + 1;
            }
        }

        return true;
    });

    // Create link for included files
    md.renderer.rules.include = (tokens, idx, options, env, self) => {
        // eslint-disable-next-line no-console
        console.log(options);

        var filePath = tokens[idx].filePath;
        // remove the .md of the file
        var pathname = filePath.substring(0, filePath.length - 3) + '.html?editmode=true'
        // return built of link
        var url = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + pathname;

        if (filePath.length > 1 && filePath.charCodeAt(0) == 47) {
            filePath = filePath.substring(1, filePath.length);
        }

        return '<p class="snippet">Included snippet: ' + '<a class="snippet-desc" href="' + url + '" target="_blank">' + filePath + '</a></p>';
    };
};