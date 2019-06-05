import Vue from 'vue';
import Vuex from 'vuex';
import axios from "axios";
import { resolvePage, normalize, endingSlashRE } from "./util";

Vue.config.devtools = true;
Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        isInEditMode: false,
        isSaving: false,
        saveSuccess: false,
        saveFailed: false,
        deleteSuccess: false,
        isDeleting: false,
        commitModalVisible: false,
        deleteModalVisible: false,
        fileLockedModalVisible: false,
        sidebarVisible: true,
        editorContent: '',
    },
    mutations: {
        isInEditMode(state, value) {
            state.isInEditMode = value;
        },
        isSaving(state, value) {
            state.isSaving = value;
        },
        saveSuccess(state, value) {
            state.saveSuccess = value;
        },
        saveFailed(state, value) {
            state.saveFailed = value;
        },
        deleteSuccess(state, value) {
            state.deleteSuccess = value;
        },
        isDeleting(state, value) {
            state.isDeleting = value;
        },
        commitModalVisible(state, value) {
            state.commitModalVisible = value;
        },
        deleteModalVisible(state, value) {
            state.deleteModalVisible = value;
        },
        fileLockedModalVisible(state, value) {
            state.fileLockedModalVisible = value;
        },
        sidebarVisible(state, value) {
            state.sidebarVisible = value;
        },
        editorContent(state, value) {
            state.editorContent = value;
        },
    },
    actions: {
        lockFile(state, context) {
            let path = normalize(context.$page.path);
            if (endingSlashRE.test(path)) {
              path += "README.md";
            } else {
              path += ".md";
            }
            
            const url = "/api/v1/lock?file=" + path.split("/")[1];

            return new Promise((resolve, reject) => {
                axios.post(url).then(response => {
                   console.log('file is locked from within action');
                    response.data.success ? resolve(response) : reject(response);
                  });
            });
        },

        unlockFile(state, context) {
          let path = normalize(context.$page.path);
          if (endingSlashRE.test(path)) {
            path += "README.md";
          } else {
            path += ".md";
          }
          const unlockURL = "/api/v1/unlock?file=" + path.split("/")[1];

          return new Promise((resolve, reject) => {
            axios.post(unlockURL).then(response => {
              console.log('file is unlocked from within action');
              response.status === 204 ? resolve(response) : reject(response)
            });
          });
        }
    }
});
