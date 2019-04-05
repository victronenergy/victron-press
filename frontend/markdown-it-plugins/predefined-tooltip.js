// Add v-tooltip spans to predefined words
//
'use strict';

module.exports = function predefined_tooltip_plugin(md, options) {
    // Import utils from markdown-it
    const escapeRE = md.utils.escapeRE;
    const arrayReplaceAt = md.utils.arrayReplaceAt;

    // Characters that may delimit a word
    const UNICODE_PUNCT_RE = md.utils.lib.ucmicro.P.source;
    const UNICODE_SPACE_RE = md.utils.lib.ucmicro.Z.source;
    const OTHER_CHARS = ' \r\n$+<=>^`|~';

    // Parse options
    options = options || {};
    const tooltips = options.tooltips || {};
    const attr = options.position
        ? 'v-tooltip.' + options.position
        : 'v-tooltip';

    // Convert given tooltips to regexes
    const tooltipsRE = Object.keys(tooltips)
        .map(x => x.substr(1))
        .sort((a, b) => b.length - a.length)
        .map(escapeRE)
        .join('|');

    // Fast regex for just checking if a word matches
    const regexSimple = new RegExp('(?:' + tooltipsRE + ')');

    // More complex regex for the actual splitting
    const splitChars =
        `${UNICODE_PUNCT_RE}|${UNICODE_SPACE_RE}|[` +
        OTHER_CHARS.split('')
            .map(escapeRE)
            .join('') +
        ']';
    const regexText = `(^|${splitChars})(${tooltipsRE})($|${splitChars})`;

    // Rule for replacing words with tooltipped versions
    md.core.ruler.after('linkify', 'predefined_tooltip_replace', state => {
        const blockTokens = state.tokens;

        // If no tooltips were defined, don't do anything
        if (!Object.keys(tooltips).length) {
            return;
        }

        let regex = new RegExp(regexText, 'g');

        for (let i = 0, l = blockTokens.length; i < l; i++) {
            // Only process inline blocks
            if (blockTokens[i].type !== 'inline') {
                continue;
            }
            let tokens = blockTokens[i].children;

            // We scan from the end, to keep position when new tags added.
            for (let j = tokens.length - 1; j >= 0; j--) {
                const currentToken = tokens[j];

                // Only process text tokens
                if (currentToken.type !== 'text') {
                    continue;
                }

                let pos = 0;
                const text = currentToken.content;
                regex.lastIndex = 0;
                let nodes = [];

                // Quick check if words even occur in this token
                if (!regexSimple.test(text)) {
                    continue;
                }

                let m, token;
                while ((m = regex.exec(text))) {
                    if (m.index > 0 || m[1].length > 0) {
                        token = new state.Token('text', '', 0);
                        token.content = text.slice(pos, m.index + m[1].length);
                        nodes.push(token);
                    }

                    token = new state.Token('tooltip_open', 'span', 1);
                    token.attrs = [[attr, tooltips[':' + m[2]]]];
                    nodes.push(token);

                    token = new state.Token('text', '', 0);
                    token.content = m[2];
                    nodes.push(token);

                    token = new state.Token('tooltip_close', 'span', -1);
                    nodes.push(token);

                    regex.lastIndex -= m[3].length;
                    pos = regex.lastIndex;
                }

                if (!nodes.length) {
                    continue;
                }

                if (pos < text.length) {
                    token = new state.Token('text', '', 0);
                    token.content = text.slice(pos);
                    nodes.push(token);
                }

                // replace current node
                blockTokens[i].children = tokens = arrayReplaceAt(
                    tokens,
                    j,
                    nodes
                );
            }
        }
    });
};
