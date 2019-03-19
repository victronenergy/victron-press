<template>
  <div id="edit" ref="edit">
    <ClientOnly>
      <editor
        ref="editor"
        v-if="markdownLoaded"
        :options="editorOptions"
        v-model="editorValue"
        id="tui-editor"
        height="calc(100vh - 350px)"
        previewStyle="vertical"
      />
      <div v-else>
        <p style="max-width: 740px; margin: 0 auto;">Loading Markdown...</p>
      </div>
    </ClientOnly>
  </div>
</template>

<script>
import axios from 'axios';
import 'tui-editor/dist/tui-editor.css';

import 'codemirror/lib/codemirror.css';

import { resolvePage, normalize, outboundRE, endingSlashRE } from './util'


export default {
  name: "PageEdit",
  components: {
    Editor: () => import('@toast-ui/vue-editor/src/Editor'), //dynamic vue import for ssr
  },
  data() {
    return {
      editorOptions: {
        initialEditType: 'markdown',
        previewStyle: 'vertical',
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
                window.alert(error.response.data);
              });
            };
            reader.readAsArrayBuffer(blob);
          }
        }
      },
      editorValue: "",
      markdownLoaded: false,
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

  mounted() {
    this.isSubscribed().then(data => {
      if(data.success) {
        this.getMDContents().then((data) => {
          this.editorValue = data;
          this.markdownLoaded = true;
        });
      } else {
        setTimeout(()=> {
          window.location.replace(data.redirectUrl);
        }, 1000)
      }
    });
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
    commit() {
      if(this.saving) return;

      this.saving = true;
      let path = normalize(this.$page.path);
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }

      return axios.put(
        path,
        this.editorValue
      ).then(response => {
        if(response.status == 200 || response.status == 201 || response.status == 204) {
          this.saving = false;
          this.$emit('saveSuccess', true);
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
