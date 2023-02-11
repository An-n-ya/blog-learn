<style>
    article {
        padding: 4vw 0;
        width: 1000px;
        position:relative;
        left: calc((100% - 1000px) / 2);
    }

</style>

<script lang="ts">
    import type {PageData} from "./$types";
    import TOC from "/src/components/toc.svelte";
    export let data: PageData;
</script>

<svelte:head>
    <title>{data.post.attributes.title}</title>
    <meta name="description" content={data.post.description}>
</svelte:head>

<div class="max-w-[90rem] mx-auto">
    <article class="max-w-3xl xl:max-w-5xl">
        <h1>{data.post.attributes.title}</h1>
        <div>
            <div>
                发表：{data.post.attributes.mtime}
            </div>
        </div>
        {@html data.post.body}
    </article>

    <div class="fixed top-40 right-[max(0px,calc(50%-55rem))] w-[19.5rem]">
        <TOC toc={data.post.toc}></TOC>
    </div>
</div>