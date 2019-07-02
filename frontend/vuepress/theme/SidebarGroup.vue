<template>
    <div class="sidebar-group" :class="{ first, collapsable }">
        <p class="sidebar-heading" :class="{ open }" @click="$emit('toggle')">
            <span>{{ translate('tableOfContents') }}</span>
            <span
                v-if="collapsable"
                class="arrow"
                :class="open ? 'down' : 'right'"
            ></span>
        </p>

        <DropdownTransition>
            <ul
                v-if="open || !collapsable"
                ref="items"
                class="sidebar-group-items"
            >
                <li v-for="child in item.children" :key="child">
                    <SidebarLink :item="child" />
                </li>
            </ul>
        </DropdownTransition>
    </div>
</template>

<script>
import SidebarLink from './SidebarLink.vue';
import DropdownTransition from './DropdownTransition.vue';

export default {
    name: 'SidebarGroup',
    components: { SidebarLink, DropdownTransition },
    props: {
        item: {
            type: Object, // See util.js:237
            required: true,
        },
        first: Boolean,
        open: Boolean,
        collapsable: Boolean,
    },
};
</script>

<style lang="stylus">
.sidebar-group {
  &:not(.first) {
    margin-top: 1em;
  }

  .sidebar-group {
    padding-left: 0.5em;
  }

  &:not(.collapsable) {
    .sidebar-heading {
      cursor: auto;
      color: inherit;
    }
  }
}

.sidebar-heading {
  color: #999;
  transition: color 0.15s ease;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  padding: 0 1.5rem;
  margin-top: 0;
  margin-bottom: 0.5rem;

  &.open, &:hover {
    color: inherit;
  }

  .arrow {
    position: relative;
    top: -0.12em;
    left: 0.5em;
  }

  &:.open .arrow {
    top: -0.18em;
  }
}

.sidebar-group-items {
  transition: height 0.1s ease-out;
  overflow: hidden;
}
</style>
