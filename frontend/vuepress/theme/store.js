import Vue from 'vue';
import Vuex from 'vuex';

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
        sidebarVisible(state, value) {
            state.sidebarVisible = value;
        },
        editorContent(state, value) {
            state.editorContent = value;
        },
    },
});
