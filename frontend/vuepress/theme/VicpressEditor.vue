<template>
  <div>
    <div class="edit-options-bar" v-if="$store.state.isInEditMode">
      <div class="last-updated" v-if="lastUpdated">
        <span class="prefix">{{ translate('lastUpdated') }}:</span>
        <span class="time">{{ lastUpdated }}</span>
      </div>

      <div class="button-group" v-if="mode === 'edit'">
        <div class="button-group-item" @click="stopEditing">{{ translate('cancel') }}</div>
        <a :href="gitHubUrl" class="button-group-item">{{translate('viewOnGitHub')}}</a>
        <div class="button-group-item danger" @click="toggleDeleteModal">{{translate('deleteLink')}}</div>
        <div class="button-group-item" @click="commitClicked">{{ translate('commitButton') }}</div>
      </div>

      <div class="button-group" v-if="mode === 'create'">
        <div
          class="button-group-item"
          @click="$store.commit('isInEditMode', false)"
        >{{ translate('cancel') }}</div>
        <div class="button-group-item" @click="commitClicked">{{ translate('publishPage') }}</div>
      </div>
    </div>

    <modal-commit></modal-commit>
    <modal-delete></modal-delete>

    <vicpress-editor-internals :mode="mode"></vicpress-editor-internals>
  </div>
</template>

<script>
import ModalCommit from "./ModalCommit";
import ModalDelete from "./ModalDelete";
import VicpressEditorInternals from "./VicpressEditorInternals";
import { resolvePage, normalize, endingSlashRE } from "./util";
import axios from "axios";

export default {
  components: { ModalCommit, ModalDelete, VicpressEditorInternals },
  props: ["mode"],
  data() {
    return {
      fileLockInterval: null
    }
  },
  mounted() {
    this.$store.commit("sidebarVisible", false);

    this.fileLockInterval = setInterval(() => {
      if(!this.$store.state.fileLockedModalVisible)
        this.$store.dispatch('lockFile', this);
    }, 60000);
    
  },
  computed: {
    path() {
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += "README.md";
      } else {
        path += ".md";
      }
      return path;
    },
    lastUpdated() {
      if (this.$page.lastUpdated) {
        return new Date(this.$page.lastUpdated).toLocaleString(this.$lang);
      }
      return false;
    },
    gitHubUrl() {
      return `https://github.com/${process.env.GITHUB_USER}/${
        process.env.GITHUB_REPO
      }/blob/${process.env.GITHUB_BRANCH}${this.path}`;
    }
  },
  methods: {
    stopEditing() {
      this.$store.commit("isInEditMode", false);
      this.$store.commit("sidebarVisible", true);
      this.$store.dispatch('unlockFile', this);
      this.$router.push({});
    },
    toggleDeleteModal() {
      this.$store.commit(
        "deleteModalVisible",
        !this.$store.state.deleteModalVisible
      );
    },
    commitClicked() {
      this.$store.commit("commitModalVisible", true);
    }
  },
  destroyed() {
    clearInterval(this.fileLockInterval);
  }
};
</script>

<style>
</style>
