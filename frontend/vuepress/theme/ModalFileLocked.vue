<template>
    <modal
        v-if="$store.state.fileLockedModalVisible"
        @close="$store.commit('fileLockedModalVisible', false)"
    >
        <h3 slot="header" class="no-heading-number">
            {{ translate('fileLockedModalTitle') }}
        </h3>
        <div slot="body">
            <p>{{ translate('fileLockedModalCopy') }}</p>
            <p>
                <strong>{{ $store.state.fileLockedBy }}</strong>
            </p>
        </div>

        <div
            slot="footer"
            style="display: flex; justify-content: space-between; align-items: center;"
        >
            <a @click="$store.commit('fileLockedModalVisible', false)">{{
                translate('close')
            }}</a>
        </div>
    </modal>
</template>

<script>
import Modal from './Modal';

export default {
    components: { Modal },
};
</script>

<style></style>
