<template>
  <div class="page">
    <div class="page-edit" v-if="editModeEnabled">
      <a @click="doEdit()" rel="noopener noreferrer">{{ backLinkText }}</a>

      <a @click="toggleDeleteModal" class="danger" rel="noopener noreferrer">{{ deleteLinkText }}</a>
    </div>

    <slot name="top"/>


    <div class="tip custom-block save-success-block" v-if="saveSuccess">
      <p class="custom-block-title">Success</p>
      <p>The changes were saved successfully. The documentation is now rebuilding and your changes should be visible in a couple of minutes.</p>
    </div>


    <modal @close="toggleDeleteModal" v-if="deleteModalVisible">
      <h3 slot="header">Delete page</h3>
      <div slot="body">
        <p>Are you sure you want to delete this page? It cannot be undone. Please type in the title of this page to confirm.</p>
        <p><strong>{{title}}</strong></p>
        <input type="text" placeholder="Type page title here" v-model="deleteConfirmationText">

      </div>

      <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
        <a class="button danger" :class="{ 'disabled': deleteConfirmationText !== title }" @click="tryDelete">Delete this file</a>
        <a @click="toggleDeleteModal">Cancel</a>
      </div>
    </modal>


    <ClientOnly v-if="editModeEnabled && !saveSuccess">
      <page-edit
        ref="pageEdit"
        @editmode-toggle="$emit('editmode-toggle', true)"
        @saveSuccess="setSaveState"
      >
      </page-edit>
    </ClientOnly>

    <Content v-else :custom="false"/>


    <div class="page-edit">
      <div class="edit-link" v-if="this.$site.themeConfig.enableEditor">
        <a v-if="!editModeEnabled" @click="doEdit()" rel="noopener noreferrer">{{ editLinkText }}</a>
        <a v-else @click="doEdit()" rel="noopener noreferrer">{{backLinkText}}</a>
      </div>

      <div style="display: flex; align-items: center;">
        <div class="last-updated" v-if="lastUpdated" >
          <span class="prefix">{{ lastUpdatedText }}: </span>
          <span class="time">{{ lastUpdated }}</span>
        </div>
        <a class="button" @click="commitClicked()" v-if="editModeEnabled">{{ commitButtonText }}</a>
      </div>
    </div>



    <div class="page-nav" v-if="prev || next">
      <p class="inner">
        <span
          v-if="prev"
          class="prev"
        >
          ←
          <router-link
            v-if="prev"
            class="prev"
            :to="prev.path"
          >
            {{ prev.title || prev.path }}
          </router-link>
        </span>

        <span
          v-if="next"
          class="next"
        >
          <router-link
            v-if="next"
            :to="next.path"
          >
            {{ next.title || next.path }}
          </router-link>
          →
        </span>
      </p>
    </div>


    <slot name="bottom"/>
  </div>
</template>

<script>
import axios from 'axios';
import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'
import PageEdit from './PageEdit';
import Modal from './Modal';

export default {
  props: ['sidebarItems'],
  data() {
    return {
      editModeEnabled: false,
      deleteModalVisible: false,
      saveSuccess: false,
      deleteConfirmationText: null
    }
  },

  components: { PageEdit, Modal },

  mounted() {
    this.editModeEnabled = window.location.search.includes('editmode');
  },

  computed: {
    lastUpdated () {
      if (this.$page.lastUpdated) {
        return new Date(this.$page.lastUpdated).toLocaleString(this.$lang)
      }
      return false
    },

    title() {
      return this.$page.title;
    },

    prev () {
      const prev = this.$page.frontmatter.prev
      if (prev === false) {
        return
      } else if (prev) {
        return resolvePage(this.$site.pages, prev, this.$route.path)
      } else {
        return resolvePrev(this.$page, this.sidebarItems)
      }
    },

    next () {
      const next = this.$page.frontmatter.next
      if (next === false) {
        return
      } else if (next) {
        return resolvePage(this.$site.pages, next, this.$route.path)
      } else {
        return resolveNext(this.$page, this.sidebarItems)
      }
    },

    lastUpdatedText () {
      return (
        this.$themeLocaleConfig.lastUpdated ||
        this.$site.themeConfig.lastUpdated ||
        'Last Updated'
      )
    },
    backLinkText () {
      return (
        this.$themeLocaleConfig.backLink ||
        this.$site.themeConfig.backLink ||
        'Back'
      )
    },
    editLinkText () {
      return (
        this.$themeLocaleConfig.editLink ||
        this.$site.themeConfig.editLink ||
        'Edit this page'
      )
    },
    deleteLinkText () {
      return (
        this.$themeLocaleConfig.deleteLink ||
        this.$site.themeConfig.deleteLink ||
        'Delete this page'
      )
    },
    commitButtonText () {
      return (
        this.$themeLocaleConfig.commitButton ||
        this.$site.themeConfig.commitButton ||
        'Commit changes'
      )
    }
  },

  methods: {
    tryDelete() {
      if(this.deleteConfirmationText === this.$page.title ) {
        let path = normalize(this.$page.path);
        if (endingSlashRE.test(path)) {
          path += 'README.md'
        } else {
          path += '.md'
        }
        const url = '/api/v1/auth?file=' + path.split('/')[1];


        /* Disabled for safety reasons, will enable once create page works */
        // axios.delete(url).then((response) => {
        //   this.$router.push({});
        // });
        console.log('It should now call the API to delete it! :)');

        this.toggleDeleteModal();
      }
    },
    commitClicked() {
      this.$refs.pageEdit.commit();
    },
    setSaveState(state) {
      this.saveSuccess = state;

      if(state) {
        this.editModeEnabled = false;
      }

      if(this.editModeEnabled) {
        this.$router.push({ query: Object.assign({}, { editmode: true }) })
      } else {
        this.$router.push({});
      }
    },
    doEdit() {
      this.saveSuccess = false;
      this.editModeEnabled = !this.editModeEnabled;
      this.$emit('editmode-toggle', this.editModeEnabled);

      if(this.editModeEnabled) {
        this.$router.push({ query: Object.assign({}, { editmode: true }) })
      } else {
        this.$router.push({});
      }
    },

    toggleDeleteModal() {
      this.deleteModalVisible = !this.deleteModalVisible;
    }
  }
}

function resolvePrev (page, items) {
  return find(page, items, -1)
}

function resolveNext (page, items) {
  return find(page, items, 1)
}

function find (page, items, offset) {
  const res = []
  items.forEach(item => {
    if (item.type === 'group') {
      res.push(...item.children || [])
    } else {
      res.push(item)
    }
  })
  for (let i = 0; i < res.length; i++) {
    const cur = res[i]
    if (cur.type === 'page' && cur.path === page.path) {
      return res[i + offset]
    }
  }
}
</script>

<style lang="stylus">
@import './styles/config.styl'
@require './styles/wrapper.styl'

.danger
  color: #dc3545

.page
  padding-bottom 2rem

.page-edit
  @extend $wrapper
  display flex
  justify-content space-between
  align-items center
  padding-top 1rem
  padding-bottom 1rem
  overflow auto
  .edit-link
    display inline-block
    a
      color lighten($textColor, 25%)
      margin-right 0.25rem
  .last-updated
    float right
    text-align right
    font-size 0.9em
    .prefix
      font-weight 500
      color lighten($textColor, 25%)
    .time
      font-weight 400
      color #aaa

.page-nav
  @extend $wrapper
  padding-top 1rem
  padding-bottom 0
  .inner
    min-height 2rem
    margin-top 0
    border-top 1px solid $borderColor
    padding-top 1rem
    overflow auto // clear float
  .next
    float right

.save-success-block
  @extend $wrapper
  margin 20px auto !important

@media (max-width: $MQMobile)
  .page-edit
    .edit-link
      // margin-bottom .5rem
    .last-updated
      font-size .8em
      float none
      text-align right

</style>
