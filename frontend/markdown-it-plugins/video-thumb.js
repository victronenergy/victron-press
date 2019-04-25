// based on markdown-it-video 0.6.3

// Process @[youtube](youtubeVideoID)
// Process @[vimeo](vimeoVideoID)

const ytRegex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
function youtubeParser(url) {
    const match = url.match(ytRegex);
    return match && match[7].length === 11 ? match[7] : url;
}

/* eslint-disable max-len */
const vimeoRegex = /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
/* eslint-enable max-len */
function vimeoParser(url) {
    const match = url.match(vimeoRegex);
    return match && typeof match[3] === 'string' ? match[3] : url;
}

const EMBED_REGEX = /@\[([a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;

function videoThumb(md, options) {
    function videoReturn(state, silent) {
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

        theState.pos += theState.src.indexOf(')', theState.pos);
        return true;
    }

    return videoReturn;
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

function tokenizeVideo(md, options) {
    function tokenizeReturn(tokens, idx) {
        const videoID = md.utils.escapeHtml(tokens[idx].videoID);
        const service = md.utils.escapeHtml(tokens[idx].service).toLowerCase();

        return videoID === ''
            ? ''
            : '<a href="' +
                  options.videoUrl(service, videoID, options) +
                  '"><img src="' +
                  options.imageUrl(service, videoID, options) +
                  '" width="' +
                  options[service].width +
                  '" height="' +
                  options[service].height +
                  '"  ></a>';
    }

    return tokenizeReturn;
}

const defaults = {
    imageUrl: imageUrl,
    videoUrl: videoUrl,
    youtube: { width: 640, height: 390 },
    vimeo: { width: 500, height: 281 }
};

module.exports = function videoThumbPlugin(md, options) {
    var theOptions = options;
    var theMd = md;
    if (theOptions) {
        Object.keys(defaults).forEach(function checkForKeys(key) {
            if (typeof theOptions[key] === 'undefined') {
                theOptions[key] = defaults[key];
            }
        });
    } else {
        theOptions = defaults;
    }
    theMd.renderer.rules.video = tokenizeVideo(theMd, theOptions);
    theMd.inline.ruler.before(
        'emphasis',
        'video',
        videoThumb(theMd, theOptions)
    );
};
