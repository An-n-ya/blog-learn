<script lang="ts">
    // @ts-ignore
    import PageCard from "/src/components/page-card.svelte";
    import type {PageData} from './$types';

    export let data: PageData;

</script>

<svelte:head>
    <title>My Blog</title>
    <meta name="description" content="我的个人博客">
</svelte:head>

<main>
    {#each data.posts as post}
        <PageCard title={post.title} url={post.url} description={post.description}></PageCard>
    {/each}
</main>
