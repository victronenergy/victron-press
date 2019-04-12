<template>
  <div id="create" ref="create">
    <ClientOnly>
      <modal @close="toggleCommitModal" v-if="commitModalVisible">
        <h3 slot="header">{{ translate('commitMesasgeHeader') }}</h3>
        <div slot="body">
          <p>{{ translate('commitMessageExplanation') }}</p>
          <input type="text" placeholder="Commit message" v-model="customCommitMessage">
        </div>

        <div
          slot="footer"
          style="display: flex; justify-content: space-between; align-items: center;"
        >
          <a @click="toggleCommitModal">{{ translate('cancel') }}</a>
          <a
            v-if="!saving"
            class="button"
            style="margin: 0;"
            :class="{ 'disabled': customCommitMessage.length === 0 }"
            @click="commit()"
          >{{ translate('commit') }}</a>
          <a v-if="saving" class="button disabled" style="margin: 0;">{{ translate('saving') }}</a>
        </div>
      </modal>

      <editor
        ref="editor"
        :options="editorOptions"
        @load="onEditorLoad"
        v-model="editorValue"
        id="tui-editor"
        height="calc(100vh - 155px)"
        previewStyle="vertical"
      />
    </ClientOnly>
  </div>
</template>

<script>
import axios from "axios";
import "tui-editor/dist/tui-editor.css";

import "codemirror/lib/codemirror.css";

import Modal from "./Modal";
import { resolvePage, normalize, makeRelative, outboundRE, endingSlashRE } from "./util";

export default {
  name: "PageCreates",
  components: {
    Editor: () => import("@toast-ui/vue-editor/src/Editor"), //dynamic vue import for ssr
    Modal
  },
  data() {
    return {
      editorOptions: {
        usageStatistics: false,
        initialEditType: "markdown",
        previewStyle: "vertical",
        language: this.$lang, // TODO: not available at time of instantiation?
        exts: ["scrollSync", "table"],
        hooks: {
          addImageBlobHook: function(blob, callback) {
            var reader = new FileReader();
            reader.onloadend = function() {
              var base64data = reader.result;
              axios
                .put(blob.name, reader.result, {
                  headers: {
                    "Content-Type": blob.type
                  }
                })
                .then(data => {
                  callback(makeRelative(window.location.pathname, data.headers["content-location"]), "alt-text");
                })
                .catch(error => {
                  console.log(error);
                  window.alert("Invalid image");
                });
            };
            reader.readAsArrayBuffer(blob);
          }
        }
      },
      customCommitMessage: "",
      editorValue: "",
      commitModalVisible: false,
      saving: false
    };
  },

  beforeMount() {
    // Load TUI.Editor plugins
    import("tui-editor/dist/tui-editor-extScrollSync.js");
    import("tui-editor/dist/tui-editor-extTable.js");

    // Load markdown-it plugins (to be attached later in onEditorLoad)
    this.editorMarkdownPlugins = [
      // Plugins used by VuePress
      // import('vuepress/lib/markdown/component'),
      // import('vuepress/lib/markdown/highlightLines'),
      // import('vuepress/lib/markdown/preWrapper'),
      // import('vuepress/lib/markdown/snippet'),
      // import('vuepress/lib/markdown/hoist'),
      // import('vuepress/lib/markdown/containers'),
      import("markdown-it-emoji"),
      // Custom plugins
      import("markdown-it-abbr"),
      import("../../markdown-it-plugins/floating-image.js")
      //import('../../markdown-it-plugins/predefined-tooltip.js'),
    ];
    this.editorLoaded = new Promise((resolve, reject) => {
      this.editorLoadedResolve = resolve;
    });
  },

  created() {},

  mounted() {
    // First, check if we're authorized
    this.isSubscribed().then(data => {
      if (data.success) {
        // Wait for the editor to load
        this.editorLoaded.then(editor => {
          // Load all markdown-it plugins into the editor
          this.editorMarkdownPlugins.foreach(x =>
            x.then(({ default: plugin }) => {
              editor.constructor.markdownit.use(plugin);
              editor.constructor.markdownitHighlight.use(plugin);
            })
          )
        });
      } else {
        window.location.replace(data.redirectUrl);
      }
    });
  },

  methods: {
    onEditorLoad(editor) {
      this.editorLoadedResolve(editor);
    },

    isSubscribed() {
      let path = normalize(window.location.pathname);
      if (endingSlashRE.test(path)) {
        path += "README.md";
      } else {
        path += ".md";
      }
      return axios
        .get("/api/v1/auth?file=" + encodeURIComponent(path))
        .then(response => {
          return response.data;
        });
    },

    commit() {
      // Lock
      if (this.saving) return;
      if (this.customCommitMessage.length === 0) return;
      this.saving = true;

      let path = normalize(window.location.pathname);
      if (endingSlashRE.test(path)) {
        path += "README.md";
      } else {
        path += ".md";
      }

      return axios
        .put(path, this.editorValue, {
          headers: {
            "Commit-Message": this.customCommitMessage
          }
        })
        .then(response => {
          if (
            response.status == 200 ||
            response.status == 201 ||
            response.status == 204
          ) {
            this.saving = false;
            this.createMode = false;

            this.$emit("saveSuccess", true); //deze zet ook de editmode weer op false.
            this.$router.push({});
          }
          console.log("posted content, response:", response);
        });
    },

    toggleCommitModal() {
      this.commitModalVisible = !this.commitModalVisible;
    },
  }
};
</script>

<style>
#create {
  /* margin: 0 auto;
  padding: 2rem 2.5rem; */
}


#tui-editor {
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
