const mixin = {
  created() {
    // console.log('yeah')
  },
  methods: {
    translate(input) {
      console.log(this.$site.locales['/'][input])

      if(this.$themeLocaleConfig[input]) {
        console.log(this.$themeLocaleConfig[input]);
        return this.$themeLocaleConfig[input];
      } else if(this.$site.themeConfig.locales['/'][input]) {
        return this.$site.themeConfig.locales['/'][input]; //english fallback
      } else {
        console.log(`couldn't translate '${input}'`)
        return input;
      }
    }
  }

      // this.$themeLocaleConfig.editLink ||
      // this.$site.themeConfig.editLink ||
      // 'Edit this page'
}


export default ({
  Vue, // the version of Vue being used in the VuePress app
  options, // the options for the root Vue instance
  // router, // the router instance for the app
  // siteData // site metadata
}) => {
  Vue.mixin(mixin)
}