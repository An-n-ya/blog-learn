<style>
    :global(article) {
        padding: 4vw;
    }
</style>

<script lang="ts">
    import type {PageData} from "./$types";
    export let data: PageData;
</script>

<svelte:head>
    <title>{data.post.attributes.title}</title>
    <meta name="description" content={data.post.description}>
</svelte:head>

<article>
    <h1>{data.post.attributes.title}</h1>
    {@html data.post.body}
</article>