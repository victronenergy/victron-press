// based on markdown-it-video 0.6.3

// Process @[youtube](youtubeVideoID)
// Process @[vimeo](vimeoVideoID)

'use strict';

module.exports = function video_thumb_plugin(md, options) {
    const ytRegex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    function youtubeParser(url) {
        // const match = url.match(ytRegex); // Using this syntax makes Webpack think this is a ES6 module
        const match = ytRegex.exec(url);
        return match && match[7].length === 11 ? match[7] : url;
    }

    /* eslint-disable max-len */
    const vimeoRegex = /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
    /* eslint-enable max-len */
    function vimeoParser(url) {
        // const match = url.match(vimeoRegex); // Using this syntax makes Webpack think this is a ES6 module
        const match = vimeoRegex.exec(url);
        return match && typeof match[3] === 'string' ? match[3] : url;
    }

    const EMBED_REGEX = /@\[([a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;

    function video_thumb(md, options) {
        return function(state, silent) {
            var serviceEnd;
            var serviceStart;
            var token;
            var videoID;
            var theState = state;
            const oldPos = state.pos;

            if (
                state.src.charCodeAt(oldPos) !== 0x40 /* @ */ ||
                state.src.charCodeAt(oldPos + 1) !== 0x5b /* [ */
            ) {
                return false;
            }

            const match = EMBED_REGEX.exec(
                state.src.slice(state.pos, state.src.length)
            );

            if (!match || match.length < 3) {
                return false;
            }

            const service = match[1];
            videoID = match[2];
            const serviceLower = service.toLowerCase();

            if (serviceLower === 'youtube') {
                videoID = youtubeParser(videoID);
            } else if (serviceLower === 'vimeo') {
                videoID = vimeoParser(videoID);
            } else if (!options[serviceLower]) {
                return false;
            }

            // If the videoID field is empty, regex currently make it the close parenthesis.
            if (videoID === ')') {
                videoID = '';
            }

            serviceStart = oldPos + 2;
            serviceEnd = md.helpers.parseLinkLabel(state, oldPos + 1, false);

            //
            // We found the end of the link, and know for a fact it's a valid link;
            // so all that's left to do is to call tokenizer.
            //
            if (!silent) {
                theState.pos = serviceStart;
                theState.service = theState.src.slice(serviceStart, serviceEnd);
                const newState = new theState.md.inline.State(
                    service,
                    theState.md,
                    theState.env,
                    []
                );
                newState.md.inline.tokenize(newState);

                token = theState.push('video', '');
                token.videoID = videoID;
                token.service = service;
                token.level = theState.level;
            }

            // theState.pos += theState.src.indexOf(')', theState.pos); // Using this syntax makes Webpack think this is a ES6 module
            do {
                theState.pos++;
            } while (
                theState.pos < theState.src.length &&
                theState.src.charCodeAt(theState.pos - 1) !== 0x29 /* ) */
            );
            return true;
        };
    }

    function videoUrl(service, videoID, options) {
        switch (service) {
            case 'youtube':
                return 'https://www.youtube.com/watch?v=' + videoID;
            case 'vimeo':
                return 'https://vimeo.com/' + videoID;
            default:
                return service;
        }
    }

    function imageUrl(service, videoID, options) {
        switch (service) {
            case 'youtube':
                return 'https://img.youtube.com/vi/' + videoID + '/0.jpg';
            case 'vimeo':
                return 'https://i.vimeocdn.com/video/' + videoID + '.jpg';
            default:
                return service;
        }
    }

    function video_thumb_renderer(md, options) {
        return function(tokens, idx) {
            const videoID = md.utils.escapeHtml(tokens[idx].videoID);
            const service = md.utils
                .escapeHtml(tokens[idx].service)
                .toLowerCase();

            return videoID === ''
                ? ''
                : '<div class="embed-responsive embed-responsive-16by9"><a href="' +
                      options.videoUrl(service, videoID, options) +
                      '" class="embed-responsive-item"><img src="' +
                      options.imageUrl(service, videoID, options) +
                      '" width="' +
                      options[service].width +
                      '" height="' +
                      options[service].height +
                      '" class="embed-responsive-item" /></a></div>';
        };
    }

    // Seeing any Object.*() method makes Webpack think this is a ES6 module
    options = options || {};
    options = {
        imageUrl: options.imageUrl || imageUrl,
        videoUrl: options.videoUrl || videoUrl,
        youtube: options.youtube || { width: 640, height: 390 },
        vimeo: options.vimeo || { width: 500, height: 281 },
    };

    md.renderer.rules.video = video_thumb_renderer(md, options);
    md.inline.ruler.before('emphasis', 'video', video_thumb(md, options));
};
