<template>
  <div class="page" :class="{ 'edit-mode': editModeEnabled }">
    <div class="edit-options-bar" v-if="editModeEnabled">
      <!-- <a @click="stopEditing()" rel="noopener noreferrer">{{translate('backLink')}}</a>
      <a @click="toggleDeleteModal" class="danger" rel="noopener noreferrer">{{translate('deleteLink')}}</a> -->
      
      <div class="last-updated" v-if="lastUpdated" >
        <span class="prefix">{{ translate('lastUpdated') }}: </span>
        <span class="time">{{ lastUpdated }}</span>
      </div>

      <div class="button-group">
        <div class="button-group-item" @click="stopEditing">{{ translate('cancel') }}</div>
        <a :href="gitHubUrl" class="button-group-item">{{translate('viewOnGithub')}}</a>
        <div class="button-group-item danger" @click="toggleDeleteModal">{{translate('deleteLink')}}</div>
        <div class="button-group-item" @click="commitClicked">{{ translate('commitButton') }}</div>
      </div>

    </div>
 
    <slot name="top"/>



    <div class="tip custom-block save-success-block" v-if="saveSuccess">
      <p class="custom-block-title">{{ translate('success') }}</p>
      <p>{{ translate('saveSuccessMessage') }}</p>
    </div>

    <div class="tip custom-block save-success-block danger" v-if="saveFailed">
      <p class="custom-block-title">{{ translate('saveFailedHeader') }}</p>
      <p>{{ translate('saveFailedCopy') }}</p>
    </div>
    
    
    <div class="tip custom-block save-success-block" v-if="deleteSuccess">
      <p class="custom-block-title">{{ translate('success') }}</p>
      <p>{{ translate('deleteSuccessMessage') }}</p>
    </div>


    <modal @close="toggleDeleteModal" v-if="deleteModalVisible">
      <h3 slot="header">{{translate('deletePageModalTitle')}}</h3>
      <div slot="body">
        <p>{{translate('deletePageModalCopy')}}</p>
        <p><strong>{{title}}</strong></p>
        <input type="text" :placeholder="translate('deletePageModalPlaceholder')" v-model="deleteConfirmationText">
      </div>

      <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
        <a class="button danger" :class="{ 'disabled': deleteConfirmationText !== title }" @click="tryDelete">{{ translate('deletePageModalCTA') }}</a>
        <a @click="toggleDeleteModal">{{ translate('cancel') }}</a>
      </div>
    </modal> 


    <ClientOnly v-if="editModeEnabled && !saveSuccess && !saveFailed">
      <page-edit
        ref="pageEdit"
        @saveSuccess="setSaveSuccess"
        @saveFailed="setSaveFailed"
      >
      </page-edit>
    </ClientOnly>

    <Content v-else :custom="false"/>


    <div class="page-edit" v-if="!editModeEnabled && editAllowed">
      <div class="edit-link" v-if="this.$site.themeConfig.enableEditor">
        <a v-if="!editModeEnabled && !deleteSuccess" @click="tryEdit" rel="noopener noreferrer">{{ translate('editLink') }}</a>
        <a v-else @click="stopEditing()" rel="noopener noreferrer">{{ translate('backLink') }}</a>
      </div>

      <div style="display: flex; align-items: center;">
        <div class="last-updated" v-if="lastUpdated" >
          <span class="prefix">{{ translate('lastUpdated') }}: </span>
          <span class="time">{{ lastUpdated }}</span>
        </div>
        <a class="button" @click="commitClicked()" v-if="editModeEnabled">{{ translate('commitButton') }}</a>
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
      saveFailed: false,
      deleteSuccess: false,
      deleteConfirmationText: null,
      isDeleting: false
    }
  },

  components: { PageEdit, Modal },

  mounted() {
    // this.translate('downloadAsPdf', 'Download as Pdfff');
    this.editModeEnabled = window.location.search.includes('editmode');
    if(this.editModeEnabled) {
      this.$emit('setSidebar', false);
    } else {
      this.$emit('setSidebar', true);
    }
  },

  computed: {
    editAllowed() {
      if(this.$page.frontmatter.hasOwnProperty('editAllowed')) {
        return this.$page.frontmatter.editAllowed;
      } else {
        return true;
      }
    },
    gitHubUrl() {
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }
      return `https://github.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/blob/${process.env.GITHUB_BRANCH}${path}`
    },
    lastUpdated () {
      if (this.$page.lastUpdated) {
        return new Date(this.$page.lastUpdated).toLocaleString(this.$lang)
      }
      return false
    },

    title() {
      if(window) { //client only
        return window.location.pathname.split('/')[1].split('.')[0]; //a bit brittle...
      } else {
        return "no-title";
      }
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
  },

  methods: {
    isSubscribed() {
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }
      const url = '/api/v1/auth?file=' + path.split('/')[1];
      return axios.get(url)
        .then(response => {
          return response.data;
        });
    },
    tryDelete() {
      // this.isSubscribed();
      if(this.deleteConfirmationText === this.title ) {
        this.isDeleting = true;

        let path = normalize(this.$page.path);
        if (endingSlashRE.test(path)) {
          path += 'README.md'
        } else {
          path += '.md'
        }
        // const url = 'file=' + path.split('/')[1];
        //http://localhost:8080/berend.md

        /* Disabled for safety reasons, will enable once create page works */
        axios.delete(path).then((response) => {
          this.editModeEnabled = false;
          this.isDeleting = false;
          this.deleteSuccess = true;
          this.$emit('setSidebar', true);
          this.$router.push({});
        });

        this.toggleDeleteModal();
      }
    },
    commitClicked() {
      // this.$refs.pageEdit.commit();
      this.$refs.pageEdit.toggleCommitModal();
    },
    setSaveSuccess(state) {
      this.saveSuccess = state;
      this.stopEditing();
    },
    setSaveFailed(state) {
     this.saveFailed = state;
      this.stopEditing(); 
    },
    tryEdit() {
      this.isSubscribed().then(data => {
        if(data.success === true) {
          this.doEdit();
        } else {
          this.$router.push({ name: 'unauthorized', query: { redirectUrl: data.redirectUrl } });
        }
      }); 
    },
    doEdit() {
      this.saveSuccess = false;
      this.saveFailed = false,
      this.editModeEnabled = true;
      this.$emit('setSidebar', false);

      this.$router.push({ query: Object.assign({}, { editmode: true }) })
    },

    stopEditing() {
      this.editModeEnabled = false;
      this.$emit('setSidebar', true);
      this.$router.push({});
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

.page.edit-mode
  padding-bottom 0

.edit-options-bar 
  padding 20px 24px
  text-align right
  
  .last-updated
    display inline-block
    margin-right 30px

  .button-group
    display inline-block
    
.last-updated
  font-size 0.9em
  .prefix
    font-weight 500
    color lighten($textColor, 25%)
  .time
    font-weight 400
    color #aaa



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
