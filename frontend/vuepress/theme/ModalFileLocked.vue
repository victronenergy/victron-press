<template>
  <modal
    @close="$store.commit('fileLockedModalVisible', false);"
    v-if="$store.state.fileLockedModalVisible"
  >
    <h3 slot="header">{{translate('fileLockedModalTitle')}}</h3>
    <div slot="body">
      <p>{{translate('fileLockedModalCopy')}}</p>
    </div>

    <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
      <a @click="$store.commit('fileLockedModalVisible', false);">{{ translate('close') }}</a>
    </div>
  </modal>
</template>

<script>
// import axios from "axios";
// import { normalize, endingSlashRE } from "./util";
import Modal from "./Modal";

export default {
}
</script>

<style>
</style>
