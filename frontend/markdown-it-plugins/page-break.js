// Allows adding a page break
//
'use strict';

module.exports = function page_break_plugin(md, options) {
    // Tag to be matched and replaced
    const breakTag = '[[page-break]]';

    // Precalculated tokens for matching
    const breakChar = breakTag.charCodeAt(0);
    const breakRegex = new RegExp(`^${md.utils.escapeRE(breakTag)}`, 'im');

    // Rule for replacing break tag with token
    md.inline.ruler.after('emphasis', 'page_break', (state, silent) => {
        // Reject if the token does not start with the correct char
        if (state.src.charCodeAt(state.pos) !== breakChar) {
            return false;
        }

        // Detect break tag
        if (!breakRegex.test(state.src.substr(state.pos))) {
            return false;
        }

        // Insert the break token
        if (!silent) {
            // Build content
            let token = state.push('page_break', 'page_break', 0);
            token.markup = breakTag;

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

    // Function rendering the break tag
    md.renderer.rules.page_break = () => '<div class="page-break"></div>';
};
