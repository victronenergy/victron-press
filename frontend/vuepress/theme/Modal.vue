<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <slot name="header">[[modal header]]</slot>
          </div>

          <div class="modal-body">
            <slot name="body">[[modal body]]</slot>
          </div>

          <div class="modal-footer">
            <slot name="footer">
              [[modal footer]]
              <button class="modal-default-button" @click="$emit('close')">OK</button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "modal",
  data() {
    return {
      escapeKeyHandler: e => {
        if (e.key === "Escape") {
          this.$emit("close");
        }
      }
    };
  },
  mounted() {
    if (window) {
      window.addEventListener("keydown", this.escapeKeyHandler);
    }
  },
  destroyed() {
    if (window) {
      window.removeEventListener("keydown", this.escapeKeyHandler);
    }
  }
};
</script>

<style>
</style>
