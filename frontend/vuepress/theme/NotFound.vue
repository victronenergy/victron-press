<template>
  <div class="theme-container">
    <Navbar :sidebarToggleEnabled="false" />

    <div class="content">
      <h1>{{title}}</h1>
      <router-link to="/">{{copy}}</router-link>
    </div>
  </div>
</template>

<script>
import Navbar from './Navbar.vue'

const msgs = [
  `There's nothing here.`,
  `How did we get here?`,
  `That's a Four-Oh-Four.`,
  `Looks like we've got some broken links.`
]

export default {
  components: { Navbar },
  methods: {
    getMsg () {
      return msgs[Math.floor(Math.random() * msgs.length)]
    }
  },
  computed: {
    title() {
      return this.$themeLocaleConfig.pageDoesntExist
    },
    copy() {
      return this.$themeLocaleConfig.wantToCreatePage
    }
  }
}
</script>

<style scoped>
.content {
  text-align: center;
  padding-top: 80px;
}
</style>
