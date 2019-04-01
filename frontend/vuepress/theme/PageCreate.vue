<template>
  <div id="create" ref="create">
    <ClientOnly>
      <editor
        ref="editor"
        :options="editorOptions"
        v-model="editorValue"
        id="tui-editor"
        height="calc(100vh - 350px)"
        previewStyle="vertical"
      />
    </ClientOnly>
  </div>
</template>

<script>
import axios from 'axios';
import 'tui-editor/dist/tui-editor.css';

import 'codemirror/lib/codemirror.css';

import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'


export default {
  name: "PageCreates",
  components: {
    Editor: () => import('@toast-ui/vue-editor/src/Editor'), //dynamic vue import for ssr
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
      editorValue: "",
      saving: false
    }
  },
  beforeMount() {
    const importScrollSync = new Promise(resolve => {
      return import('tui-editor/dist/tui-editor-extScrollSync.js').then(({ default: scrollSync }) => {
        resolve(scrollSync);
      });
    });

    const importTable = new Promise(resolve => {
      return import('tui-editor/dist/tui-editor-extTable.js').then(({ default: extTable }) => {
        resolve(extTable);
      });
    });

    Promise.all([importScrollSync, importTable])
  },
  created(){
    
  },
  mounted() {
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
    commit() {
        console.log('commit called in createpage!')
      if(this.saving) return;

      this.saving = true;

      let path; 
      if(this.$page.path === "") { //page doesn't exist yet
        path = normalize(window.location.pathname);
      } else {
        path = normalize(this.$page.path);
      }


      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }

      return axios({
          method: 'put',
          url: path,
          headers: {
            'Commit-Message': `Created page '${path}'`
          },
          data: {
            ...this.editorValue
          }
        }
      ).then(response => {
        if(response.status == 200 || response.status == 201 || response.status == 204) {
          this.saving = false;
          this.createMode = false;

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
