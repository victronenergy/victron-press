import Unauthorized from './theme/Unauthorized.vue';
import Forbidden from './theme/Forbidden.vue';

const mixin = {
  methods: {
    translate(input) {
      if(this.$themeLocaleConfig[input]) {
        return this.$themeLocaleConfig[input];
      } else if(this.$site.themeConfig.locales['/'][input]) {
        return this.$site.themeConfig.locales['/'][input]; //english fallback
      } else {
        return input;
      }
    }
  }
}

export default ({
  Vue, // the version of Vue being used in the VuePress app
  // options, // the options for the root Vue instance
  router, // the router instance for the app
  // siteData // site metadata
}) => {
  Vue.mixin(mixin);

  router.addRoutes([{
    name: 'unauthorized',
    path: '/401.html',
    props:  true,
    component: Unauthorized
  },  
  {
    name: 'forbidden',
    path: '/403.html',
    // props: { redirectLink },
    component: Forbidden
  } 
  ])
}