<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false" />

    <div class="content" v-if="!editModeEnabled && !hasSaved">
      <h1>{{ translate('pageDoesntExist') }}</h1>
      <a @click="editModeEnabled = true">{{ translate('wantToCreatePage') }}</a>
    </div>

    {{editModeEnabled}}

    
    <!-- <router-view></router-view> -->


    <ClientOnly>
      <div class="editor-container" 
           v-if="editModeEnabled">
        <!-- <h3>{{pageTitle}}</h3> -->
        <page-create
          @saveSuccess="onHasSaved()"
          ref="pageCreate"/>

        <div style="display: flex; align-items: center;" class="cta-container">
          <a class="button" @click="commitClicked()" v-if="editModeEnabled">{{ translate('publishPage') }}</a>
        </div>
      </div>
      <div v-else-if="hasSaved" class="save-success-container"> 
        <div class="tip custom-block save-success-block">
          <p class="custom-block-title">{{ translate('success') }}</p>
          <p>{{ translate('publishPageSuccess') }}</p>
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
  mounted() {
    this.editModeEnabled = window.location.search.includes('editmode');
  },
  methods: {
    commitClicked() {
      this.$refs.pageCreate.commit();
    },
    onHasSaved() {
      this.hasSaved = true;
      this.editModeEnabled = false;
    }
  },
  computed: {
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

.save-success-container {
  padding-top: 80px;
}

.cta-container {
  max-width: 740px;
  margin: 0 auto;
  padding: 2rem 2.5rem; 
}
</style>
