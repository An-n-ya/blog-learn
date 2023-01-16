<style>
    main {
        padding: 0 4vw;
        height: calc(100% - 8em);
    }
</style>

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
        <PageCard {...post}></PageCard>
    {/each}
</main>
