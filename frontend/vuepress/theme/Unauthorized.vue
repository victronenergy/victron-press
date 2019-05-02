<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false"/>

    <div class="content">
      <h1>{{ translate('unauthorizedHeader') }}</h1>
      <p>{{ translate('unauthorizedCopy') }}</p>
      <br>
      <a class="button" :href="redirectUrl">{{ translate('continue') }}</a>
    </div>
  </div>
</template>

<script>
import Navbar from "./Navbar.vue";
export default {
  components: { Navbar },
  created() {},
  mounted() {
    document.querySelector('.nav-links').remove(); //ugly but it works. Better than bothering with vueprops.
  },
  computed: {
    redirectUrl() {
      return this.$route.query.redirectUrl;
    }
  }
};
</script>

<style scoped>
.content {
  text-align: center;
  padding-top: 100px;
}
</style>
