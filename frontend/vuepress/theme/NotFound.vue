<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false" />

    <div class="content" v-if="!editModeEnabled">
      <h1>{{title}}</h1>
      <!-- <router-link to="/">{{copy}}</router-link> -->
      <a @click="editModeEnabled = true">{{copy}}</a>
    </div>

    <ClientOnly>
      <div class="editor-container" 
           v-if="editModeEnabled">
        <!-- <h3>{{pageTitle}}</h3> -->
        <page-create ref="pageCreate"/>

        <div style="display: flex; align-items: center;">
        <a class="button" @click="commitClicked()" v-if="editModeEnabled">Commit</a>
      </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script>
import Navbar from './Navbar.vue';
import PageCreate from './PageCreate';
import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'


export default {
  components: { Navbar, PageCreate },
  data() {
    return {
      editModeEnabled: false,
      isSaving: false,
      hasSaved: false
    }
  },
  methods: {
    commitClicked() {
      this.$refs.pageCreate.commit();
    },
  },
  computed: {
    title() {
      return this.$themeLocaleConfig.pageDoesntExist;
    },
    copy() {
      return this.$themeLocaleConfig.wantToCreatePage;
    },
    pageTitle() {
      // const title = window.location.pathname; //Deze is goed!
    
      // return title;
    },
    url() {
      // return normalize(this.pageTitle) + '.md';
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
