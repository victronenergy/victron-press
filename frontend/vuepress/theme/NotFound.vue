<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false"/>

    <div class="content" v-if="!editModeEnabled && !hasSaved">
      <h1>{{ translate('pageDoesntExist') }}</h1>
      <a v-if="canCreatePage" @click="editModeEnabled = true">{{ translate('wantToCreatePage') }}</a>
    </div>

    <ClientOnly>
      <div class="editor-container" v-if="editModeEnabled">
        <div class="create-options-bar">
          <div class="button-group">
            <div
              class="button-group-item"
              @click="editModeEnabled = false"
            >{{ translate('cancel') }}</div>
            <div class="button-group-item" @click="commitClicked">{{ translate('publishPage') }}</div>
          </div>
        </div>

        <page-create @saveSuccess="onHasSaved()" ref="pageCreate"/>
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
import Navbar from "./Navbar.vue";
import PageCreate from "./PageCreate";

export default {
  components: { Navbar, PageCreate },
  data() {
    return {
      canCreatePage: false,
      editModeEnabled: false,
      isSaving: false,
      hasSaved: false
    };
  },
  mounted() {
    this.editModeEnabled = window.location.search.includes("editmode");
    this.canCreatePage = !!window.location.href.match(/\.html$/);
  },
  methods: {
    commitClicked() {
      this.$refs.pageCreate.toggleCommitModal();
    },
    onHasSaved() {
      this.hasSaved = true;
      this.editModeEnabled = false;
    }
  },
};
</script>

<style scoped>
.content {
  text-align: center;
  padding-top: 80px;
}

.create-options-bar {
  padding: 20px 24px;
  text-align: right;
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
