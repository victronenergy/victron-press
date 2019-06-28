<template>
    <div id="edit" ref="edit">
        <ClientOnly>
            <editor
                v-if="editorLoadable"
                v-show="editorVisible"
                id="tui-editor"
                ref="editor"
                v-model="editorValue"
                :options="editorOptions"
                height="calc(100vh - 149px)"
                preview-style="vertical"
                @load="onEditorLoad"
                @input="$store.commit('editorContent', $event)"
            />
            <div v-show="!editorVisible">
                <p style="max-width: 740px; margin: 0 auto;">
                    <span class="spinner">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
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

import { normalize, makeRelative, endingSlashRE } from './util';

export default {
    name: 'PageEdit',
    components: {
        Editor: () => import('@toast-ui/vue-editor/src/Editor'),
    },
    props: {
        mode: {
            type: String,
            required: true,
        },
    },

    data() {
        const self = this;
        return {
            editorOptions: {
                usageStatistics: false,
                initialEditType: 'markdown',
                hideModeSwitch: true,
                previewStyle: 'vertical',
                get language() {
                    return self.$lang ? self.$lang.replace('-', '_') : 'en_US';
                },
                exts: ['scrollSync', 'table'],
                hooks: {
                    addImageBlobHook: function(blob, callback) {
                        var reader = new FileReader();
                        reader.onloadend = function() {
                            axios
                                .put(blob.name, reader.result, {
                                    headers: {
                                        'Content-Type': blob.type,
                                    },
                                })
                                .then(data => {
                                    callback(
                                        makeRelative(
                                            window.location.pathname,
                                            data.headers['content-location']
                                        ),
                                        'alt-text'
                                    );
                                })
                                .catch(error => {
                                    console.log(error, error.response);
                                    if (
                                        error.response &&
                                        error.reponse.status === 405
                                    ) {
                                        window.alert(
                                            'Unrecognized image file name.'
                                        );
                                    } else if (
                                        error.response &&
                                        error.reponse.status === 415
                                    ) {
                                        window.alert('Unsupported image type.');
                                    } else {
                                        window.alert('Failed to upload image');
                                    }
                                });
                        };
                        reader.readAsArrayBuffer(blob);
                    },
                },
            },
            customCommitMessage: '',
            editorValue: '',
            editorLoadable: false,
            editorVisible: false,
            commitModalVisible: false,
        };
    },

    computed: {
        path() {
            let path = normalize(this.$page.path);
            if (endingSlashRE.test(path)) {
                path += 'README.md';
            } else {
                path += '.md';
            }
            return path;
        },
        loadingMarkdownText() {
            return (
                this.$themeLocaleConfig.loadingMarkdown ||
                this.$site.themeConfig.loadingMarkdown ||
                'Loading Markdown...'
            );
        },
    },

    beforeMount() {
        // Load TUI.Editor plugins
        import('tui-editor/dist/tui-editor-extScrollSync.js');
        import('tui-editor/dist/tui-editor-extTable.js');

        // Load markdown-it plugins (to be attached later in onEditorLoad)
        this.editorMarkdownPlugins = [
            // Plugins used by VuePress
            // import("vuepress/lib/markdown/component"),
            // import("vuepress/lib/markdown/highlightLines"),
            // import("vuepress/lib/markdown/preWrapper"),
            // import("vuepress/lib/markdown/snippet"),
            // import("vuepress/lib/markdown/hoist"),
            // import("vuepress/lib/markdown/containers"),
            import('markdown-it-emoji'),
            // [import("markdown-it-anchor"), {
            //   slugify: import("vuepress/lib/markdown/slugify"), // TODO fix this
            //   permalink: true,
            //   permalinkBefore: true,
            //   permalinkSymbol: "#"
            // }],
            // [import("markdown-it-table-of-contents"), {
            //   slugify: import("vuepress/lib/markdown/slugify"), // TODO fix this
            //   includeLevel: [2, 3],
            //   format: import("vuepress/lib/util/parseHeaders").parseHeaders  // TODO fix this
            // }],
            // Custom plugins
            import('markdown-it-abbr'),
            import('markdown-it-footnote'),
            import('markdown-it-kbd'),
            import('markdown-it-sub'),
            import('markdown-it-sup'),
            import('markdown-it-task-lists'),
            import('../../../../frontend/markdown-it-plugins/floating-image'),
            import('../../../../frontend/markdown-it-plugins/include-preview'),
            //import("../../../../frontend/markdown-it-plugins/predefined-tooltip"),
            [
                import('../../../../frontend/markdown-it-plugins/url-fixer'),
                {
                    forceHttps: true,
                    forceMarkdownExt: 'html',
                },
            ],
            import('../../../../frontend/markdown-it-plugins/video-thumb'),
        ].map(plugin =>
            typeof plugin[Symbol.iterator] === 'function' ? plugin : [plugin]
        );
        this.editorLoaded = new Promise((resolve, reject) => {
            this.editorLoadedResolve = resolve;
        });
    },

    created() {},

    mounted() {
        // First, check if we're authorized
        this.isSubscribed().then(data => {
            if (data.success) {
                // Start loading the editor
                this.editorLoadable = true;

                if (this.mode === 'create') {
                    this.editorVisible = true;
                    return;
                }

                // Retrieve the raw Markdown contents from the server
                this.getMDContents().then(data => {
                    // Wait for the editor to load
                    this.editorLoaded.then(editor => {
                        editor.constructor.markdownit.set({ linkify: true });
                        editor.constructor.markdownitHighlight.set({
                            linkify: true,
                        });
                        // Load all markdown-it plugins into the editor
                        Promise.all(
                            this.editorMarkdownPlugins.map(
                                ([pluginPromise, ...options]) =>
                                    pluginPromise.then(
                                        ({ default: plugin }) => {
                                            editor.constructor.markdownit.use(
                                                plugin,
                                                ...options
                                            );
                                            editor.constructor.markdownitHighlight.use(
                                                plugin,
                                                ...options
                                            );
                                        }
                                    )
                            )
                        ).then(() => {
                            // Editor is ready, load the content and show
                            this.$store.commit('editorContent', data);
                            this.editorValue = data;
                            this.editorVisible = true;
                        });
                    });
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
            return axios
                .get('/api/v1/auth?file=' + encodeURIComponent(this.path))
                .then(response => {
                    return response.data;
                });
        },

        getMDContents() {
            return axios.get(this.path).then(response => {
                this.$store.commit(
                    'commitHash',
                    response.headers['commit-hash']
                );
                return response.data;
            });
        },
    },
};
</script>

<style>
#edit {
    margin: 0 auto;
}

#tui-editor {
    min-height: 600px;
}

.te-md-container .te-preview {
    max-width: none;
}

.button:hover {
    background-color: #599bd5;
}

.button {
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
