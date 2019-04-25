// Process ![image]>(<src> "title")

'use strict';

module.exports = function floating_image_plugin(md, options) {
    const normalizeReference = md.utils.normalizeReference;
    const isWhiteSpace = md.utils.isWhiteSpace;

    function floating_image(state, silent) {
        const oldPos = state.pos;
        const max = state.posMax;

        if (state.src.charCodeAt(state.pos) !== 0x21 /* ! */) {
            return false;
        }
        if (state.src.charCodeAt(state.pos + 1) !== 0x5b /* [ */) {
            return false;
        }

        const labelStart = state.pos + 2;
        const labelEnd = state.md.helpers.parseLinkLabel(
            state,
            state.pos + 1,
            false
        );

        // parser failed to find ']', so it's not a valid link
        if (labelEnd < 0) {
            return false;
        }

        let pos = labelEnd + 1;
        let float;
        if (state.src.charCodeAt(pos) === 0x3c /* < */) {
            float = 'left';
        } else if (state.src.charCodeAt(pos) === 0x3e /* > */) {
            float = 'right';
        } else {
            return false;
        }

        pos = labelEnd + 2;
        let title,
            href = '';
        if (pos < max && state.src.charCodeAt(pos) === 0x28 /* ( */) {
            //
            // Inline link
            //

            // [link](  <href>  "title"  )
            //        ^^ skipping these spaces
            pos++;
            for (; pos < max; pos++) {
                if (!isWhiteSpace(state.src.charCodeAt(pos))) {
                    break;
                }
            }
            if (pos >= max) {
                return false;
            }

            // [link](  <href>  "title"  )
            //          ^^^^^^ parsing link destination
            const linkDest = state.md.helpers.parseLinkDestination(
                state.src,
                pos,
                state.posMax
            );
            if (linkDest.ok) {
                href = state.md.normalizeLink(linkDest.str);
                if (state.md.validateLink(href)) {
                    pos = linkDest.pos;
                } else {
                    href = '';
                }
            }

            // [link](  <href>  "title"  )
            //                ^^ skipping these spaces
            const start = pos;
            for (; pos < max; pos++) {
                if (!isWhiteSpace(state.src.charCodeAt(pos))) {
                    break;
                }
            }

            // [link](  <href>  "title"  )
            //                  ^^^^^^^ parsing link title
            const linkTitle = state.md.helpers.parseLinkTitle(
                state.src,
                pos,
                state.posMax
            );
            if (pos < max && start !== pos && linkTitle.ok) {
                title = linkTitle.str;
                pos = linkTitle.pos;

                // [link](  <href>  "title"  )
                //                         ^^ skipping these spaces
                for (; pos < max; pos++) {
                    if (!isWhiteSpace(state.src.charCodeAt(pos))) {
                        break;
                    }
                }
            } else {
                title = '';
            }

            if (pos >= max || state.src.charCodeAt(pos) !== 0x29 /* ) */) {
                state.pos = oldPos;
                return false;
            }
            pos++;
        } else {
            //
            // Link reference
            //
            if (typeof state.env.references === 'undefined') {
                return false;
            }

            let label;
            if (pos < max && state.src.charCodeAt(pos) === 0x5b /* [ */) {
                const start = pos + 1;
                pos = state.md.helpers.parseLinkLabel(state, pos);
                if (pos >= 0) {
                    label = state.src.slice(start, pos++);
                } else {
                    pos = labelEnd + 2;
                }
            } else {
                pos = labelEnd + 2;
            }

            // covers label === '' and label === undefined
            // (collapsed reference link and shortcut reference link respectively)
            if (!label) {
                label = state.src.slice(labelStart, labelEnd);
            }

            const ref = state.env.references[normalizeReference(label)];
            if (!ref) {
                state.pos = oldPos;
                return false;
            }
            href = ref.href;
            title = ref.title;
        }

        //
        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        //
        if (!silent) {
            const content = state.src.slice(labelStart, labelEnd);

            let tokens = [];
            state.md.inline.parse(content, state.md, state.env, tokens);

            const token = state.push('floating_image', 'img', 0);
            token.attrs = [
                ['src', href],
                ['alt', ''],
                ['class', 'floating-image floating-image-' + float],
                //...(title && ['title', title]), // Using this syntax makes Webpack think this is a ES6 module
            ];
            token.children = tokens;
            token.content = content;

            // Using this syntax instead doesn't mess with Webpack
            if (title) {
                token.attrs.push(['title', title]);
            }
        }

        state.pos = pos;
        state.posMax = max;
        return true;
    }

    md.inline.ruler.before('image', 'floating_image', floating_image);
};
