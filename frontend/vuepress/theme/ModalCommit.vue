<template>
  <modal @close="$store.commit('commitModalVisible', false)" v-if="$store.state.commitModalVisible">
    <h3 class="no-heading-number" slot="header">{{ translate('commitMesasgeHeader') }}</h3>
    <div slot="body">
      <p>{{ translate('commitMessageExplanation') }}</p>
      <input
        type="text"
        placeholder="Commit message"
        v-model="customCommitMessage"
        ref="commitMessageInput"
      >
    </div>

    <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
      <a @click="$store.commit('commitModalVisible', false)">{{ translate('cancel') }}</a>
      <a
        v-if="!$store.state.isSaving"
        class="button"
        style="margin: 0;"
        :class="{ 'disabled': customCommitMessage.length === 0 }"
        @click="commit"
      >{{ translate('commit') }}</a>
      <a
        v-if="$store.state.isSaving"
        class="button disabled"
        style="margin: 0;"
      >{{ translate('saving') }}</a>
    </div>
  </modal>
</template>

<script>
import Vue from 'vue';
import Modal from "./Modal";
import { normalize, endingSlashRE } from "./util";
import axios from "axios";
import { mapState } from 'vuex';


export default {
  components: { Modal },
  data() {
    return {
      customCommitMessage: ""
    };
  },
  computed: mapState(['commitModalVisible']),
  watch: {
    commitModalVisible(newValue, oldValue) {
      if(newValue === true) {
        console.log('commit modal became visible.');
        Vue.nextTick().then(() => {
          this.$refs.commitMessageInput.focus();
        })
      }
    }
  },
  methods: {
    commit() {
      if (this.$store.state.isSaving === true) return;
      if (this.customCommitMessage.length === 0) return;
      this.$store.commit("isSaving", true);

      let path;

      if (this.$page.path === "") {
        //page doesn't exist yet
        path = normalize(window.location.pathname);
      } else {
        path = normalize(this.$page.path);
      }

      if (endingSlashRE.test(path)) {
        path += "README.md";
      } else {
        path += ".md";
      }

      console.log(this.$page);
      console.log(path);

      axios
        .put(path, this.$store.state.editorContent, {
          headers: {
            "Commit-Message": this.customCommitMessage
          }
        })
        .then(response => {
          console.log("done uplading", response);

          if (
            response.status == 200 ||
            response.status == 201 ||
            response.status == 204
          ) {
            this.customCommitMessage = "";
            this.$store.commit("isSaving", false);
            this.$store.commit("saveSuccess", true);
            this.$store.commit("commitModalVisible", false);
            this.$store.commit("isInEditMode", false);
            // this.$emit("saveSuccess", true);
            this.$store.commit("sidebarVisible", true);
            this.$router.push({});
          }
        })
        .catch(response => {
          console.log("didnt succeed", response);
          // this.$store.commit('isSaving', false);
          // this.$emit("saveFailed", true);
        });
    }
  }
};
</script>

<style>
</style>
