<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false"/>

    <div class="content">
      <h1>{{ translate('forbiddenHeader') }}</h1>
      <p>{{ translate('forbiddenCopy') }}</p>
    </div>
  </div>
</template>



<script>
import Navbar from "./Navbar.vue";
export default {
  components: { Navbar }
};
</script>


<style scoped>
.content {
  text-align: center;
  padding-top: 100px;
}
</style>
