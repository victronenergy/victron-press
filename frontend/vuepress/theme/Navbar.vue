<template>
    <header
        class="navbar"
        :class="{ 'has-sidebar-toggle': sidebarToggleEnabled }"
    >
        <SidebarButton
            v-if="sidebarToggleEnabled"
            @toggle-sidebar="$emit('toggle-sidebar')"
        />

        <img class="logo" src="./images/victron-logo.svg" :alt="$siteTitle" />

        <span
            v-if="$siteTitle"
            ref="siteName"
            class="site-name"
            :class="{ 'can-hide': $site.themeConfig.logo }"
            >{{ $siteTitle }}</span
        >

        <div
            class="links"
            :style="{
                'max-width': linksWrapMaxWidth + 'px',
            }"
        >
            <SearchBox v-if="$site.themeConfig.search !== false" />
            <NavLinks class="can-hide" />
        </div>
    </header>
</template>

<script>
import SidebarButton from './SidebarButton.vue';
import SearchBox from './SearchBox.vue';
import NavLinks from './NavLinks.vue';

export default {
    components: { SidebarButton, NavLinks, SearchBox },

    props: {
        sidebarToggleEnabled: {
            type: Boolean,
            default: true,
        },
    },

    data() {
        return {
            linksWrapMaxWidth: null,
        };
    },

    mounted() {
        const MOBILE_DESKTOP_BREAKPOINT = 719; // TODO: refer to config.styl
        const NAVBAR_VERTICAL_PADDING =
            parseInt(css(this.$el, 'paddingLeft')) +
            parseInt(css(this.$el, 'paddingRight'));
        const handleLinksWrapWidth = () => {
            if (
                document.documentElement.clientWidth < MOBILE_DESKTOP_BREAKPOINT
            ) {
                this.linksWrapMaxWidth = null;
            } else {
                this.linksWrapMaxWidth =
                    this.$el.offsetWidth -
                    NAVBAR_VERTICAL_PADDING -
                    ((this.$refs.siteName && this.$refs.siteName.offsetWidth) ||
                        0);
            }
        };
        handleLinksWrapWidth();
        window.addEventListener('resize', handleLinksWrapWidth, false);
    },
};

function css(el, property) {
    // NOTE: Known bug, will return 'auto' if style value is 'auto'
    const win = el.ownerDocument.defaultView;
    // null means not to return pseudo styles
    return win.getComputedStyle(el, null)[property];
}
</script>

<style lang="stylus">
@import './styles/config.styl';

$navbar-vertical-padding = 0.7rem;
$navbar-horizontal-padding = 1.5rem;

.navbar {
  padding: $navbar-vertical-padding $navbar-horizontal-padding;
  line-height: $navbarHeight - 1.4rem;
  position: relative;

  a, span, img {
    display: inline-block;
  }

  .logo {
    height: $navbarHeight - 1.4rem;
    min-width: $navbarHeight - 1.4rem;
    margin-right: 0.8rem;
    vertical-align: top;
  }

  .site-name {
    font-size: 1.3rem;
    font-weight: 600;
    color: $textColor;
    position: relative;
    display: none;
  }

  .links {
    padding-left: 1.5rem;
    box-sizing: border-box;
    background-color: white;
    white-space: nowrap;
    font-size: 0.9rem;
    position: absolute;
    right: $navbar-horizontal-padding;
    top: $navbar-vertical-padding;
    display: flex;

    .search-box {
      flex: 0 0 auto;
      vertical-align: top;
    }

    .nav-links {
      flex: 1;
    }
  }
}

@media (max-width: $MQMobile) {
  .navbar {
    &.has-sidebar-toggle {
      padding-left: 4rem;
    }

    .can-hide {
      display: none;
    }

    .links {
      padding-left: 1.5rem;
    }
  }
}
</style>
