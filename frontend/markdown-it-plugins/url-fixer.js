'use strict';

module.exports = function url_fixer(md, options) {
    options = options || {};
    options = {
        selfUrl: options.selfUrl || undefined,
        forceAbsolute: options.forceAbsolute || false,
        forceRelative: options.forceRelative || false,
        forceMarkdownExt: options.forceMarkdownExt || null,
        forceLanguage: options.forceLanguage || null,
        forceHttps: options.forceHttps || false,
        forceHttpsDomains: options.forceHttpsDomains || [
            'docs.victronenergy.com',
            'vrm.victronenergy.com',
            'www.victronenergy.cn',
            'www.victronenergy.com',
            'www.victronenergy.com.es',
            'www.victronenergy.com.tr',
            'www.victronenergy.cz',
            'www.victronenergy.de',
            'www.victronenergy.dk',
            'www.victronenergy.fi',
            'www.victronenergy.fr',
            'www.victronenergy.gr',
            'www.victronenergy.hu',
            'www.victronenergy.it',
            'www.victronenergy.nl',
            'www.victronenergy.no',
            'www.victronenergy.pl',
            'www.victronenergy.pt',
            'www.victronenergy.ro',
            'www.victronenergy.ru',
            'www.victronenergy.se',
            'www.victronenergy.si',
        ],
    };

    if (options.forceAbsolute && options.forceRelative) {
        throw new Error('Cannot force both relative and absolute urls!');
    }
    if (
        (options.forceAbsolute ||
            options.forceRelative ||
            options.forceLanguage) &&
        !options.selfUrl
    ) {
        throw new Error(
            'selfUrl is required when forcing absolute, relative and/or language!'
        );
    }

    const DATAURI_REGEX = /^data:/;
    const RELATIVE_REGEX = /^(?!https?:\/\/)/;
    const ISO639_1_REGEX = /a[abefkmnrsvyz]|b[aeghimnors]|c[aaehorsuuuuuvy]|d[aevvvz]|e[elnosstu]|f[afijory]|g[addlnuv]|h[aeiorttuyz]|i[adeegiikostu]|j[av]|k[agiijjkllmnorsuvwyy]|l[abbgiiinotuv]|m[ghiklnrsty]|n[abbddegllnnorrvvyyy]|o[cjmrss]|p[aailsst]|q[u]|r[mnooouw]|s[acdegiiklmnoqrstuvw]|t[aeghiklnorstwy]|u[ggkrz]|v[eio]|w[ao]|x[h]|y[io]|z[aahu]/;
    const FORCE_LANGUAGE_REGEX = /^(\/)((?:(?:a[abefkmnrsvyz]|b[aeghimnors]|c[aaehorsuuuuuvy]|d[aevvvz]|e[elnosstu]|f[afijory]|g[addlnuv]|h[aeiorttuyz]|i[adeegiikostu]|j[av]|k[agiijjkllmnorsuvwyy]|l[abbgiiinotuv]|m[ghiklnrsty]|n[abbddegllnnorrvvyyy]|o[cjmrss]|p[aailsst]|q[u]|r[mnooouw]|s[acdegiiklmnoqrstuvw]|t[aeghiklnorstwy]|u[ggkrz]|v[eio]|w[ao]|x[h]|y[io]|z[aahu])\/)?)(.*)$/i;
    const FORCE_EXT_REGEX = /^(.*)\.md$/i;

    if (
        options.forceLanguage !== null &&
        options.forceLanguage !== false &&
        !ISO639_1_REGEX.exec(options.forceLanguage)
    ) {
        throw new Error('Invalid language code!');
    }

    // We cannot use `new URL()` or `.toString()` because that
    // makes Webpack detect this plugin as a ES6 module
    // To use these anyway, we use Function to create these functions
    const parseUrl = new Function('url', 'base', 'return new URL(url, base);');
    const renderUrl = new Function(
        'url',
        'base',
        'return (new URL(url, base)).toString();'
    );
    const splitPath = new Function('path', 'return path.split(\'/\');');

    function fixUrl(url, token, env) {
        // Do not process data URL's
        if (DATAURI_REGEX.exec(url)) {
            return url;
        }

        // Determine whether URL is relative
        const isRelative = !!RELATIVE_REGEX.exec(url);

        // Retrieve the URL of this file itself
        const selfUrl = env.selfUrl || options.selfUrl;
        const parsedSelfUrl = selfUrl ? parseUrl(selfUrl) : null;

        // Check if we can parse the URL
        const isParsable = !isRelative || selfUrl;

        // Check if the URL is on the same domain as this file is
        const isOnSameDomain = selfUrl
            ? parsedSelfUrl.host === parseUrl(url, selfUrl).host
            : isRelative;

        // Force extension
        if (isOnSameDomain && options.forceMarkdownExt) {
            const match = FORCE_EXT_REGEX.exec(url);
            if (match) {
                url = match[1] + '.' + options.forceMarkdownExt;
            }
        }

        // Some operations are only possible if we can parse the URL
        if(isParsable) {
            const parsedUrl = isParsable ? parseUrl(url, selfUrl) : null;

            // Force HTTPS for specified domains
            if (
                (!isRelative || options.forceAbsolute) &&
                options.forceHttps &&
                options.forceHttpsDomains
            ) {
                if (parsedUrl.protocol === 'http:') {
                    for (let i in options.forceHttpsDomains) {
                        if (parsedUrl.host === options.forceHttpsDomains[i]) {
                            parsedUrl.protocol = 'https';
                            break;
                        }
                    }
                }
            }

            // Force language
            if (
                isOnSameDomain &&
                options.forceLanguage !== null &&
                options.forceLanguage !== false
            ) {
                const match = FORCE_LANGUAGE_REGEX.exec(parsedUrl.pathname);
                if (match) {
                    parsedUrl.pathname =
                        match[1] +
                        (options.forceLanguage === 'en'
                            ? ''
                            : options.forceLanguage + '/') +
                        match[3];
                }
            }

            // Render as relative?
            if (
                selfUrl &&
                parsedUrl.origin === parsedSelfUrl.origin &&
                (options.forceRelative || (isRelative && !options.forceAbsolute))
            ) {
                // Appearantly this triggers Webpack to see this as a ES6 module,
                // so we aquire the desired result using eval
                const urlSuffix = eval('parsedUrl.search + parsedUrl.hash');

                // Same file only needs suffix
                if (parsedUrl.pathname === parsedSelfUrl.pathname) {
                    url = urlSuffix;
                } else {
                    // Calculate the relative path
                    let urlPath = parsedUrl.pathname;
                    let selfUrlPath = parsedSelfUrl.pathname;

                    // Using `.split('/')` makes Webpack handle this module as ES6
                    urlPath = splitPath(urlPath);
                    selfUrlPath = splitPath(selfUrlPath);

                    // Pop off last element, the basename
                    selfUrlPath.pop();
                    const urlBasename = urlPath.pop();

                    // Remove path elements from the front as long as they're equal
                    while (
                        selfUrlPath.length > 0 &&
                        urlPath.length > 0 &&
                        selfUrlPath[0] === urlPath[0]
                    ) {
                        selfUrlPath.shift();
                        urlPath.shift();
                    }

                    // The remaining path elements in our own URL should be replaced with ../
                    // to move up the required number of levels
                    let urlPrefix = '';
                    if (selfUrlPath.length > 0) {
                        for (let i = 0; i < selfUrlPath.length; i++) {
                            urlPrefix += '../';
                        }
                    } else {
                        urlPrefix = './';
                    }

                    // Build the new relative url
                    for (let i in urlPath) {
                        urlPath[i] += '/';
                    }
                    url = urlPrefix + urlPath.join('') + urlBasename + urlSuffix;
                }
            } else {
                // Render absolute URL
                url = renderUrl(parsedUrl);
            }
        }

        return url;
    }

    md.core.ruler.push('url-fixer', function(state) {
        let hasFixed = false;
        for (let i = 0; i < state.tokens.length; i++) {
            const blockToken = state.tokens[i];
            if (blockToken.type === 'inline' && blockToken.children) {
                for (let j = 0; j < blockToken.children.length; j++) {
                    const token = blockToken.children[j];
                    if (token.attrs) {
                        for (let k = 0; k < token.attrs.length; k++) {
                            const attr = token.attrs[k];
                            if (attr[0] == 'href' || attr[0] == 'src') {
                                const oldUrl = attr[1];
                                const newUrl = fixUrl(oldUrl, token, state.env);
                                if (newUrl !== oldUrl) {
                                    attr[1] = newUrl;
                                    hasFixed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return hasFixed;
    });
};
