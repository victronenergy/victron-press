import Forbidden from './theme/Forbidden.vue';
import Tooltip from 'vue-directive-tooltip';
import Unauthorized from './theme/Unauthorized.vue';
import Vuex from 'vuex';
import store from './theme/store.js';
import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';

export default ({ Vue, options, router, siteData }) => {
    Vue.use(Tooltip);
    Vue.use(Vuex);
    Vue.mixin({ store });
    Vue.config.devtools = true;

    Vue.mixin({
        methods: {
            translate(input) {
                if (this.$themeLocaleConfig[input]) {
                    return this.$themeLocaleConfig[input];
                } else if (this.$site.themeConfig.locales['/'][input]) {
                    return this.$site.themeConfig.locales['/'][input]; //english fallback
                } else {
                    return input;
                }
            },
        },
    });

    router.addRoutes([
        {
            name: 'unauthorized',
            path: '/401.html',
            props: true,
            component: Unauthorized,
        },
        {
            name: 'forbidden',
            path: '/403.html',
            // props: { redirectLink },
            component: Forbidden,
        },
    ]);

    /* global process */
    try {
        if (process.env.SENTRY_DSN_FRONTEND) {
            Sentry.init({
                dsn: process.env.SENTRY_DSN_FRONTEND,
                integrations: [
                    new SentryIntegrations.Vue({
                        Vue,
                        attachProps: true,
                    }),
                ],
            });
        }
    } catch (e) {
        if (!(e instanceof ReferenceError)) {
            throw e;
        }
    }
};
