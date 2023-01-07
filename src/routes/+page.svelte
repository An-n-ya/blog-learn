<style>
    main {
        padding: 4vw;
    }
</style>

<script lang="ts">
    // @ts-ignore
    import PageCard from "/src/components/page-card.svelte";
    import type {PageData} from './$types';

    export let data: PageData;

</script>

<main>
    {#each data.posts as post}
        <PageCard {...post}></PageCard>
    {/each}
</main>
