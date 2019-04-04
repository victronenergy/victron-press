<template>
  <div id="edit" ref="edit">
    <ClientOnly>

      <modal @close="toggleCommitModal" v-if="commitModalVisible">
        <h3 slot="header">{{ translate('commitMesasgeHeader') }}</h3>
        <div slot="body">
          <p>{{ translate('commitMessageExplanation') }}</p>
          <input type="text" placeholder="Commit message" v-model="customCommitMessage">
        </div>

        <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
          <a @click="toggleCommitModal">{{ translate('cancel') }}</a>
          <a v-if="!saving" class="button" style="margin: 0;" :class="{ 'disabled': customCommitMessage.length === 0 }" @click="commit()">{{ translate('commit') }}</a>
          <a v-if="saving" class="button disabled" style="margin: 0;">{{ translate('saving') }}</a>
        </div>
      </modal>

      <editor
        ref="editor"
        v-if="editorLoadable"
        v-show="editorVisible"
        :options="editorOptions"
        @load="onEditorLoad"
        v-model="editorValue"
        id="tui-editor"
        height="calc(100vh - 350px)"
        previewStyle="vertical"
      />
      <div v-show="!editorVisible">
        <p style="max-width: 740px; margin: 0 auto;">
          <span class="spinner"><span></span><span></span><span></span><span></span></span>
          {{ loadingMarkdownText }}
        </p>
      </div>
    </ClientOnly>
  </div>
</template>

<script>
import axios from 'axios';
import 'tui-editor/dist/tui-editor.css';

import 'codemirror/lib/codemirror.css';

import Modal from './Modal';
import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'


export default {
  name: "PageEdit",
  components: {
    Editor: () => import('@toast-ui/vue-editor/src/Editor'), //dynamic vue import for ssr
    Modal
  },
  data() {
    return {
      editorOptions: {
        usageStatistics: false,
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        language: this.$lang, // TODO: not available at time of instantiation?
        exts: [
          'scrollSync',
          'table'
        ],
        hooks: {
          addImageBlobHook: function (blob, callback) {
            var reader = new FileReader();
            reader.onloadend = function() {
              var base64data = reader.result;
              axios.put(blob.name, reader.result, {
                headers: {
                  'Content-Type': blob.type,
                },
              }).then((data) => {
                callback(data.headers['content-location'], 'alt-text');
              }).catch((error) => {
                console.log(error);
                window.alert('Invalid image');
              });
            };
            reader.readAsArrayBuffer(blob);
          }
        }
      },
      customCommitMessage: "",
      editorValue: "",
      editorLoadable: false,
      editorVisible: false,
      commitModalVisible: false,
      saving: false
    }
  },
  beforeMount() {
    // Load TUI.Editor plugins
    import('tui-editor/dist/tui-editor-extScrollSync.js');
    import('tui-editor/dist/tui-editor-extTable.js');

    // Load markdown-it plugins (to be attached later in onEditorLoad)
    this.editorMarkdownPlugins = [
      // Plugins used by VuePress
      // import('vuepress/lib/markdown/component'),
      // import('vuepress/lib/markdown/highlightLines'),
      // import('vuepress/lib/markdown/preWrapper'),
      // import('vuepress/lib/markdown/snippet'),
      // import('vuepress/lib/markdown/hoist'),
      // import('vuepress/lib/markdown/containers'),
      import('markdown-it-emoji'),
      // Custom plugins
      import('../../markdown-it-plugins/markdown-it-floating-image.js'),
    ];
    this.editorLoaded = new Promise((resolve, reject) => {
      this.editorLoadedResolve = resolve;
    });
  },
  created(){

  },
  mounted() {
    // First, check if we're authorized
    this.isSubscribed().then(data => {
      if(data.success) {
        // Start loading the editor
        this.editorLoadable = true;

        // Retrieve the raw Markdown contents from the server
        this.getMDContents().then((data) => {
          // Wait for the editor to load
          this.editorLoaded
            .then((editor) => {
              // Load all markdown-it plugins into the editor
              Promise.all(this.editorMarkdownPlugins.map(x => x.then(({ default: plugin }) => {
                editor.constructor.markdownit.use(plugin);
                editor.constructor.markdownitHighlight.use(plugin);
              }))).then(() => {
                // Editor is ready, load the content and show
                this.editorValue = data;
                this.editorVisible = true;
              });
            })
        });
      } else {
          window.location.replace(data.redirectUrl);
      }
    });
  },

  computed: {
    loadingMarkdownText () {
      return (
        this.$themeLocaleConfig.loadingMarkdown ||
        this.$site.themeConfig.loadingMarkdown ||
        'Loading Markdown...'
      )
    }
  },

  methods: {
    onEditorLoad(editor) {
      this.editorLoadedResolve(editor);
    },
    isSubscribed() {
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }
      return axios.get('/api/v1/auth?file=' + encodeURIComponent(path))
        .then(response => {
          return response.data;
        });
    },
    getMDContents() {
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }
      return axios.get(path)
        .then(response => {
          return response.data;
        });
    },
    toggleCommitModal() {
      this.commitModalVisible = !this.commitModalVisible
    },
    commit() {
      if(this.saving) return;
      if (this.customCommitMessage.length === 0) return;

      this.saving = true;
      console.log('this.$page ', this.$page);
      let path;
      if(this.$page.path === "") { //page doesn't exist yet
        path = window.location.pathname;
      } else {
        path = normalize(this.$page.path);
      }

      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }

      return axios.put( path, this.editorValue, {
          headers: {
          'Commit-Message': this.customCommitMessage
          }
        }
      ).then(response => {
        if(response.status == 200 || response.status == 201 || response.status == 204) {
          this.saving = false;

          this.$emit('saveSuccess', true); //deze zet ook de editmode weer op false.
        }
        console.log('posted content, response:', response)
      })
    }
  },
}
</script>

<style>
#edit {
  margin: 0 auto;
  padding: 2rem 2.5rem;

}

#tui-editor {
  height: calc(100vh - 300px);
  min-height: 600px;
}


.button:hover {
  background-color: #599bd5;
}

.button {
  /* margin-top: 20px; */
  margin-left: 20px;
  border: none;
  display: inline-block;
  font-size: 1rem;
  color: #fff;
  background-color: #4790d0;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  transition: background-color 0.1s ease;
  box-sizing: border-box;
  border-bottom: 1px solid #3382c8;
  cursor: pointer;
  text-align: center;
  flex-shrink: 2;
}

</style>
