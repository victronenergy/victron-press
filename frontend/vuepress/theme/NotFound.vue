<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false"/>

    <div class="content" v-if="!$store.state.isInEditMode && !$store.state.saveSuccess">
      <h1 v-if="canCreatePage">{{ translate('pageDoesntExistYet') }}</h1>
      <h1 v-else>{{ translate('pageDoesntExist') }}</h1>
      <a
        v-if="canCreatePage"
        @click="$store.commit('isInEditMode', true)"
      >{{ translate('wantToCreatePage') }}</a>
    </div>

    <ClientOnly>
      <div class="editor-container" v-if="$store.state.isInEditMode">
        <vicpress-editor :mode="'create'"></vicpress-editor>
      </div>
      <div v-else-if="$store.state.saveSuccess" class="save-success-container">
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
import VicpressEditor from "./VicpressEditor";

export default {
  components: { 
    Navbar,
    VicpressEditor
  },
  data() {
    return {
      canCreatePage: false,
      editModeEnabled: false,
      isSaving: false,
      hasSaved: false
    };
  },
  mounted() {
    this.$store.commit(
      "isInEditMode",
      window.location.search.includes("editmode")
    );

    this.canCreatePage =
      !!window.location.pathname.match(/\.html$/) &&
      !window.location.pathname.match(/(^\/\d{3}\.html$|\/README\.html$)/);
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
