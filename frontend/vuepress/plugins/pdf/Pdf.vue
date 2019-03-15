<template>
    <p>Page Size: {{ pageSize }}</p>
</template>

<script>
    export default {
        name: 'PageSize',
        computed: {
            pageSize() { return this.$page.size || 'no value' },
        },
    }
</script>