<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false" />

    <div class="content" v-if="!editModeEnabled">
      <h1>{{title}}</h1>
      <!-- <router-link to="/">{{copy}}</router-link> -->
      <a @click="editModeEnabled = true">{{copy}}</a>
    </div>

    <ClientOnly>
      <div class="editor-container">
        <h3>{{pageTitle}}</h3>
        <page-edit 
          v-if="editModeEnabled"
          ref="pageEdit"
        >
        </page-edit>
      </div>
    </ClientOnly>
  </div>
</template>

<script>
import Navbar from './Navbar.vue';
import PageEdit from './PageEdit';
import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'


export default {
  components: { Navbar, PageEdit },
  data() {
    return {
      editModeEnabled: false,
      isSaving: false,
      hasSaved: false
    }
  },
  methods: {
  },
  computed: {
    title() {
      return this.$themeLocaleConfig.pageDoesntExist;
    },
    copy() {
      return this.$themeLocaleConfig.wantToCreatePage;
    },
    pageTitle() {
      const title = window.location.pathname; //Deze is goed!
    
      return title;
    },
    url() {
      return normalize(this.pageTitle) + '.md';
    }


  }
}
</script>

<style scoped>
.content {
  text-align: center;
  padding-top: 80px;
}

.editor-container {
  padding-top: 80px;
}
</style>
