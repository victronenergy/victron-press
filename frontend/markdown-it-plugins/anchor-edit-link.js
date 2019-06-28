// Renderer for adding edit links to headers
// For use with the markdown-it-anchor renderPermalink option

'use strict';

const position = {
    false: 'push',
    true: 'unshift',
};

module.exports = (slug, opts, state, idx) => {
    const linkTokens = [
        Object.assign(new state.Token('link_open', 'a', 1), {
            attrs: [
                ['class', 'edit-section'],
                [
                    '@click',
                    'tryEdit(' +
                        JSON.stringify(state.tokens[idx + 1].content) +
                        ')',
                ],
                ['aria-hidden', 'true'],
            ],
        }),
        Object.assign(new state.Token('html_block', '', 0), {
            content: "{{ translate('editSectionLink') }}",
        }),
        new state.Token('link_close', 'a', -1),
    ];
    if (opts.permalinkSpace) {
        linkTokens[position[!opts.permalinkBefore]](
            Object.assign(new state.Token('text', '', 0), {
                content: ' ',
            })
        );
    }
    state.tokens[idx + 1].children[position[opts.permalinkBefore]](
        ...linkTokens
    );
};
