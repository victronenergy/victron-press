module.exports = (options, ctx) => ({
    name: 'my-page-time',
    extendPageData ({ _content }) {
        return {
            size: (_content.length / 1024).toFixed(2) + 'kb',
        };
    }
})