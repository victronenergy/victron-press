<template>
    <modal
        v-if="$store.state.commitModalVisible"
        @close="$store.commit('commitModalVisible', false)"
    >
        <h3 slot="header" class="no-heading-number">
            {{ translate('commitMesasgeHeader') }}
        </h3>

        <div slot="body">
            <form @submit.prevent="commit">
                <p>{{ translate('commitMessageExplanation') }}</p>
                <input
                    ref="commitMessageInput"
                    v-model="customCommitMessage"
                    type="text"
                    placeholder="Commit message"
                />

                <div
                    style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;"
                >
                    <a @click="$store.commit('commitModalVisible', false)">
                        {{ translate('cancel') }}
                    </a>
                    <input
                        v-if="!$store.state.isSaving"
                        type="submit"
                        class="button"
                        style="margin: 0;"
                        :class="{ disabled: customCommitMessage.length === 0 }"
                        :value="translate('commit')"
                    />

                    <input
                        v-if="$store.state.isSaving"
                        type="submit"
                        class="button disabled"
                        style="margin: 0;"
                        :value="translate('saving')"
                    />
                </div>
            </form>
        </div>

        <div slot="footer"></div>
    </modal>
</template>

<script>
import Vue from 'vue';
import Modal from './Modal';
import { normalize, endingSlashRE } from './util';
import axios from 'axios';
import { mapState } from 'vuex';

export default {
    components: { Modal },
    data() {
        return {
            customCommitMessage: '',
        };
    },
    computed: mapState(['commitModalVisible']),
    watch: {
        commitModalVisible(newValue, oldValue) {
            if (newValue === true) {
                Vue.nextTick().then(() => {
                    this.$refs.commitMessageInput.focus();
                });
            }
        },
    },
    methods: {
        commit() {
            if (this.$store.state.isSaving === true) return;
            if (this.customCommitMessage.length === 0) return;
            this.$store.commit('isSaving', true);

            let path;

            if (this.$page.path === '') {
                //page doesn't exist yet
                path = normalize(window.location.pathname);
            } else {
                path = normalize(this.$page.path);
            }

            if (endingSlashRE.test(path)) {
                path += 'README.md';
            } else {
                path += '.md';
            }

            const section = this.$store.state.sectionToEdit;
            const sectionPart = section === null ? '' : `?section=${section}`;

            path = path + sectionPart;

            let headers = {
                'Commit-Message': this.customCommitMessage,
            };

            if (this.$store.state.commitHash) {
                headers['Parent-Commit-Hash'] = this.$store.state.commitHash;
            }

            axios
                .put(path, this.$store.state.editorContent, {
                    headers: headers,
                })
                .then(response => {
                    if (
                        response.status == 200 ||
                        response.status == 201 ||
                        response.status == 204
                    ) {
                        this.customCommitMessage = '';
                        this.$store.commit('isSaving', false);
                        this.$store.commit('saveSuccess', true);
                        this.$store.commit('commitModalVisible', false);
                        this.$store.commit('isInEditMode', false);
                        this.$store.commit('sidebarVisible', true);
                        this.$router.push({});
                    }
                })
                .then(this.$store.dispatch('unlockFile', this))
                .catch(response => {
                    // TODO: handle error
                });
        },
    },
};
</script>

<style></style>
