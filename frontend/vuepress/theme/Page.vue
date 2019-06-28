<template>
    <div class="page" :class="{ 'edit-mode': $store.state.isInEditMode }">
        <slot name="top" />

        <div
            v-if="$store.state.saveSuccess"
            class="tip custom-block save-success-block"
        >
            <p class="custom-block-title">{{ translate('success') }}</p>
            <p>{{ translate('saveSuccessMessage') }}</p>
        </div>

        <div
            v-if="$store.state.saveFailed"
            class="tip custom-block save-success-block danger"
        >
            <p class="custom-block-title">
                {{ translate('saveFailedHeader') }}
            </p>
            <p>{{ translate('saveFailedCopy') }}</p>
        </div>

        <div
            v-if="$store.state.deleteSuccess"
            class="tip custom-block save-success-block"
        >
            <p class="custom-block-title">{{ translate('success') }}</p>
            <p>{{ translate('deleteSuccessMessage') }}</p>
        </div>

        <modal-file-locked></modal-file-locked>

        <ClientOnly
            v-if="
                $store.state.isInEditMode &&
                    !$store.state.saveSuccess &&
                    !$store.state.saveFailed
            "
        >
            <vicpress-editor :mode="'edit'"></vicpress-editor>
        </ClientOnly>

        <Content v-else :custom="false" />

        <div v-if="!$store.state.isInEditMode && editAllowed" class="page-edit">
            <div v-if="this.$site.themeConfig.enableEditor" class="edit-link">
                <a
                    v-if="
                        !$store.state.isInEditMode &&
                            !$store.state.deleteSuccess
                    "
                    rel="noopener noreferrer"
                    @click="tryEdit()"
                    >{{ translate('editLink') }}</a
                >
                <a
                    v-else-if="
                        !$store.state.isInEditMode &&
                            !$store.state.deleteSuccess
                    "
                    rel="noopener noreferrer"
                    @click="stopEditing()"
                    >{{ translate('backLink') }}</a
                >
            </div>

            <div style="display: flex; align-items: center;">
                <div v-if="lastUpdated" class="last-updated">
                    <span class="prefix">{{ translate('lastUpdated') }}:</span>
                    <span class="time">{{ lastUpdated }}</span>
                </div>
                <a
                    v-if="$store.state.isInEditMode"
                    class="button"
                    @click="commitClicked()"
                    >{{ translate('commitButton') }}</a
                >
            </div>
        </div>

        <div v-if="prev || next" class="page-nav">
            <p class="inner">
                <span v-if="prev" class="prev">
                    ←
                    <router-link v-if="prev" class="prev" :to="prev.path">
                        {{ prev.title || prev.path }}
                    </router-link>
                </span>

                <span v-if="next" class="next">
                    <router-link v-if="next" :to="next.path">
                        {{ next.title || next.path }} </router-link
                    >→
                </span>
            </p>
        </div>

        <slot name="bottom" />
    </div>
</template>

<script>
import axios from 'axios';
import { resolvePage, normalize, endingSlashRE, getUrlParameter } from './util';
import VicpressEditor from './VicpressEditor';
import ModalFileLocked from './ModalFileLocked';

export default {
    components: { VicpressEditor, ModalFileLocked },
    props: {
        sidebarItems: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            deleteConfirmationText: null,
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
        editAllowed() {
            if ('editAllowed' in this.$page.frontmatter) {
                return this.$page.frontmatter.editAllowed;
            } else {
                return true;
            }
        },
        lastUpdated() {
            if (this.$page.lastUpdated) {
                return new Date(this.$page.lastUpdated).toLocaleString(
                    this.$lang
                );
            }
            return false;
        },

        title() {
            if (window) {
                //client only
                return window.location.pathname.split('/')[1].split('.')[0]; //a bit brittle...
            } else {
                return 'no-title';
            }
        },

        prev() {
            const prev = this.$page.frontmatter.prev;
            if (prev === false) {
                return;
            } else if (prev) {
                return resolvePage(this.$site.pages, prev, this.$route.path);
            } else {
                return resolvePrev(this.$page, this.sidebarItems);
            }
        },

        next() {
            const next = this.$page.frontmatter.next;
            if (next === false) {
                return;
            } else if (next) {
                return resolvePage(this.$site.pages, next, this.$route.path);
            } else {
                return resolveNext(this.$page, this.sidebarItems);
            }
        },
    },

    mounted() {
        this.$store.commit('isInEditMode', !!getUrlParameter('editmode'));

        if (getUrlParameter('section')) {
            this.$store.commit('sectionToEdit', getUrlParameter('section'));
        } else {
            this.$store.commit('sectionToEdit', null);
        }

        if (this.$store.state.isInEditMode) {
            this.$emit('setSidebar', false);

            let isAuthorized = true;

            this.isSubscribed()
                .then(data => {
                    return new Promise((resolve, reject) => {
                        data.success ? resolve() : reject(data);
                    });
                })
                .catch(data => {
                    isAuthorized = false;
                    this.$router.push({
                        name: 'unauthorized',
                        query: { redirectUrl: data.redirectUrl },
                    });
                })
                .then(() => {
                    if (isAuthorized) {
                        return this.$store.dispatch('lockFile', this);
                    }
                })
                .catch(data => {
                    this.$store.commit('fileLockedModalVisible', true);
                });
        } else {
            this.$emit('setSidebar', true);
        }
    },

    methods: {
        isSubscribed() {
            const url = '/api/v1/auth?file=' + this.path.split('/')[1];
            return axios.get(url).then(response => {
                return response.data;
            });
        },
        setSaveSuccess(state) {
            this.saveSuccess = state;
            this.$store.commit('saveSuccess', state);
        },

        setSaveFailed(state) {
            this.saveFailed = state;
            this.$store.commit('saveFailed', state);
        },

        tryEdit(section) {
            let canEdit = true;
            let isAuthorized = true;

            this.isSubscribed()
                .then(data => {
                    return new Promise((resolve, reject) => {
                        data.success ? resolve() : reject(data);
                    });
                })
                .catch(data => {
                    isAuthorized = false;
                    this.$router.push({
                        name: 'unauthorized',
                        query: { redirectUrl: data.redirectUrl },
                    });
                })
                .then(() => {
                    if (isAuthorized) {
                        if (section !== undefined) {
                            this.$store.commit('sectionToEdit', section);
                        } else {
                            this.$store.commit('sectionToEdit', null);
                        }

                        return this.$store.dispatch('lockFile', this);
                    }
                })
                .catch(data => {
                    canEdit = false;
                    this.$store.commit('fileLockedModalVisible', true);
                })
                .then(() => {
                    if (canEdit && isAuthorized) {
                        this.doEdit();
                    }
                });
        },
        tryLockFile() {
            const url = '/api/v1/lock?file=' + this.path.split('/')[1];
            return axios.post(url).then(response => {
                const success = response.data.success;
                if (!success) {
                    throw new Error('Locked!');
                } else {
                    return response.data;
                }
            });
        },
        doEdit() {
            this.saveSuccess = false;
            this.$store.commit('saveSuccess', false);

            this.saveFailed = false;
            this.$store.commit('saveFailed', false);

            this.isInEditMode = true;
            this.$store.commit('isInEditMode', true);

            this.$store.commit('sidebarVisible', false);

            if (this.$store.state.sectionToEdit !== null) {
                this.$router.push({
                    query: Object.assign(
                        {},
                        {
                            editmode: true,
                            section: this.$store.state.sectionToEdit,
                        }
                    ),
                });
            } else {
                this.$router.push({
                    query: Object.assign({}, { editmode: true }),
                });
            }
        },
    },
};

function resolvePrev(page, items) {
    return find(page, items, -1);
}

function resolveNext(page, items) {
    return find(page, items, 1);
}

function find(page, items, offset) {
    const res = [];
    items.forEach(item => {
        if (item.type === 'group') {
            res.push(...(item.children || []));
        } else {
            res.push(item);
        }
    });
    for (let i = 0; i < res.length; i++) {
        const cur = res[i];
        if (cur.type === 'page' && cur.path === page.path) {
            return res[i + offset];
        }
    }
}
</script>

<style lang="stylus">
@import './styles/config.styl';
@require './styles/wrapper.styl';

.danger {
  color: #dc3545;
}

.page {
  padding-bottom: 2rem;
}

.page.edit-mode {
  padding-bottom: 0;
}

.edit-options-bar {
  padding: 20px 24px;
  text-align: right;

  .last-updated {
    display: inline-block;
    margin-right: 30px;
  }

  .button-group {
    display: inline-block;
  }
}

.last-updated {
  font-size: 0.9em;

  .prefix {
    font-weight: 500;
    color: lighten($textColor, 25%);
  }

  .time {
    font-weight: 400;
    color: #aaa;
  }
}

.page-edit {
  @extend $wrapper;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
  overflow: auto;

  .edit-link {
    display: inline-block;

    a {
      color: lighten($textColor, 25%);
      margin-right: 0.25rem;
    }
  }

  .last-updated {
    float: right;
    text-align: right;
  }
}

.page-nav {
  @extend $wrapper;
  padding-top: 1rem;
  padding-bottom: 0;

  .inner {
    min-height: 2rem;
    margin-top: 0;
    border-top: 1px solid $borderColor;
    padding-top: 1rem;
    overflow: auto; // clear float
  }

  .next {
    float: right;
  }
}

.save-success-block {
  @extend $wrapper;
  margin: 20px auto !important;
}

@media (max-width: $MQMobile) {
  .page-edit {
    .edit-link {
      // margin-bottom .5rem
    }

    .last-updated {
      font-size: 0.8em;
      float: none;
      text-align: right;
    }
  }
}
</style>
