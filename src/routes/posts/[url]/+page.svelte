<style>
    article {
        padding: 4vw;
    }
</style>

<script lang="ts">
    import type {PageData} from "./$types";
    export let data: PageData;
</script>

<article>
    <h1>{data.post.attributes.title}</h1>
    {@html data.post.body}
</article>