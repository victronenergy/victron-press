<template>
    <modal
        v-if="$store.state.deleteModalVisible"
        @close="$store.commit('deleteModalVisible', false)"
    >
        <h3 slot="header" class="no-heading-number">
            {{ translate('deletePageModalTitle') }}
        </h3>
        <div slot="body">
            <p>{{ translate('deletePageModalCopy') }}</p>
            <p>
                <strong>{{ title }}</strong>
            </p>
            <input
                ref="deleteConfirmationTextInput"
                v-model="deleteConfirmationText"
                type="text"
                :placeholder="translate('deletePageModalPlaceholder')"
            />
        </div>

        <div
            slot="footer"
            style="display: flex; justify-content: space-between; align-items: center;"
        >
            <a
                class="button danger"
                :class="{ disabled: deleteConfirmationText !== title }"
                @click="tryDelete"
                >{{ translate('deletePageModalCTA') }}</a
            >
            <a @click="$store.commit('deleteModalVisible', false)">{{
                translate('cancel')
            }}</a>
        </div>
    </modal>
</template>

<script>
import Vue from 'vue';
import axios from 'axios';
import { normalize, endingSlashRE } from './util';
import Modal from './Modal';
import { mapState } from 'vuex';

export default {
    components: { Modal },
    data() {
        return {
            deleteConfirmationText: '',
        };
    },
    computed: {
        ...mapState(['deleteModalVisible']),
        title() {
            if (window) {
                // TODO: replace with a less brittle solution
                return window.location.pathname.split('/')[1].split('.')[0];
            } else {
                return 'no-title';
            }
        },
    },
    watch: {
        deleteModalVisible(newValue, oldValue) {
            if (newValue === true) {
                Vue.nextTick().then(() => {
                    this.$refs.deleteConfirmationTextInput.focus();
                });
            }
        },
    },
    methods: {
        tryDelete() {
            if (this.deleteConfirmationText === this.title) {
                this.$store.commit('isDeleting', true);

                let path = normalize(this.$page.path);
                if (endingSlashRE.test(path)) {
                    path += 'README.md';
                } else {
                    path += '.md';
                }

                axios.delete(path).then(response => {
                    this.$store.commit('isDeleting', false);
                    this.$store.commit('deleteModalVisible', false);
                    this.$store.commit('isInEditMode', false);
                    this.$store.commit('deleteSuccess', true);
                    this.$store.commit('sidebarVisible', true);
                    this.$router.push({});
                });
            }
        },
    },
};
</script>

<style></style>
