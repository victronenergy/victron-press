<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false" />

    <div class="content">
      <h1>{{ translate('unauthorizedHeader') }}</h1>
      <p>{{ translate('unauthorizedCopy') }}</p>
      <br>
      <div class="button">{{ translate('continue') }}</div>
    </div>
  </div>  
</template>

<script>
import Navbar from './Navbar.vue';
export default {
  components: { Navbar },
  props: ['redirectLink'],
  created() {
    console.log('ik ben gemaakt')
    console.log('redirectLink: ', this.redirectLink);
  }
}
</script>

<style scoped>

.content {
  text-align: center;
  padding-top: 100px;
}

</style>

