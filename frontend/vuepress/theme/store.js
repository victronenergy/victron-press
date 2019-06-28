import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { normalize, endingSlashRE } from './util';

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
        fileLockedBy: null,
        fileLockedUntil: null,
        sidebarVisible: true,
        editorContent: '',
        commitHash: null,
        sectionToEdit: null,
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
        fileLockedBy(state, value) {
            state.fileLockedBy = value;
        },
        fileLockedUntil(state, value) {
            state.fileLockedUntil = value;
        },
        commitHash(state, value) {
            state.commitHash = value;
        },
        sectionToEdit(state, value) {
            state.sectionToEdit = value;
        },
    },
    actions: {
        lockFile({ state, commit }, context) {
            let path = normalize(context.$page.path);
            if (endingSlashRE.test(path)) {
                path += 'README.md';
            } else {
                path += '.md';
            }

            const url = '/api/v1/lock?file=' + path.split('/')[1];

            return new Promise((resolve, reject) => {
                axios
                    .post(url)
                    .then(response => {
                        if (response.data.lockedBy) {
                            commit('fileLockedBy', response.data.lockedBy);
                        }
                        if (response.data.lockedUntil) {
                            commit(
                                'fileLockedUntil',
                                response.data.lockedUntil
                            );
                        }
                        response.data.success
                            ? resolve(response)
                            : reject(response);
                    })
                    .catch(error => {
                        // 409 = Conflicted = Already locked by someone else
                        if (error.response.status === 409) {
                            if (error.response.data.lockedBy) {
                                commit(
                                    'fileLockedBy',
                                    error.response.data.lockedBy
                                );
                            }
                            if (error.response.data.lockedUntil) {
                                commit(
                                    'fileLockedUntil',
                                    error.response.data.lockedUntil
                                );
                            }
                        }
                        reject(error);
                    });
            });
        },

        unlockFile(state, context) {
            let path = normalize(context.$page.path);
            if (endingSlashRE.test(path)) {
                path += 'README.md';
            } else {
                path += '.md';
            }
            const unlockURL = '/api/v1/unlock?file=' + path.split('/')[1];

            return new Promise((resolve, reject) => {
                axios.post(unlockURL).then(response => {
                    response.status === 204
                        ? resolve(response)
                        : reject(response);
                });
            });
        },
    },
});
