<style>
    main {
        padding: 4vw;
    }
</style>

<script>
// @ts-nocheck
    // @ts-ignore
    import PageCard from "/src/components/page-card.svelte";

    /** @type {import('./$types').PageData} */ 
    export let data;

</script>

<main>
    {#each data.posts as post}
        <PageCard {...post}></PageCard>
    {/each}
</main>
