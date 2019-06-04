<template>
  <modal
    @close="$store.commit('deleteModalVisible', false);"
    v-if="$store.state.deleteModalVisible"
  >
    <h3 slot="header">{{translate('deletePageModalTitle')}}</h3>
    <div slot="body">
      <p>{{translate('deletePageModalCopy')}}</p>
      <p>
        <strong>{{title}}</strong>
      </p>
      <input
        type="text"
        :placeholder="translate('deletePageModalPlaceholder')"
        v-model="deleteConfirmationText"
      >
    </div>

    <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
      <a
        class="button danger"
        :class="{ 'disabled': deleteConfirmationText !== title }"
        @click="tryDelete"
      >{{ translate('deletePageModalCTA') }}</a>
      <a @click="$store.commit('deleteModalVisible', false);">{{ translate('cancel') }}</a>
    </div>
  </modal>
</template>

<script>
import axios from "axios";
import { normalize, endingSlashRE } from "./util";
import Modal from "./Modal";

export default {
  components: { Modal },
  data() {
    return {
      deleteConfirmationText: ""
    };
  },
  computed: {
    title() {
      if (window) {
        return window.location.pathname.split("/")[1].split(".")[0]; //a bit brittle...
      } else {
        return "no-title";
      }
    },
    tryDelete() {
      if (this.deleteConfirmationText === this.title) {
        this.$store.commit("isDeleting", true);

        let path = normalize(this.$page.path);
        if (endingSlashRE.test(path)) {
          path += "README.md";
        } else {
          path += ".md";
        }

        axios.delete(path).then(response => {
          this.$store.commit("isDeleting", false);
          this.$store.commit("deleteModalVisible", false);
          this.$store.commit("isInEditMode", false);
          this.$store.commit("deleteSuccess", true);
          this.$store.commit("sidebarVisible", true);
          this.$router.push({});
        });
      }
    }
  }
};
</script>

<style>
</style>
