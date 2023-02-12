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
    import CalendarIcon from "/src/components/icon/calendar-icon.svelte";
    import {Active_Heading} from "/src/stores/index.js";
    export let data: PageData;
    
    let timer: NodeJS.Timeout | null;
    let scroll_callback = () => {
        if (timer) { return; }
        timer = setTimeout(() => {
            let _scrollTop =
                (window.scrollY ||
                window.pageYOffset ||
                document.documentElement.scrollTop) + 100;

            let headings = document.querySelectorAll("h2,h3,h4,h5,h6");
            let headings_height: number[] = [];
            // 这里多了两个一个是logo这里的h1标签，一个是文章的h1标签 (因此我们就不查找h1，
            // 以后记得只使用h2以后的)
            for (let i = 0; i < headings?.length; i++) {
                headings_height.push((headings[i] as HTMLElement).offsetTop);                    
            }
            
            if (headings_height[0] > _scrollTop) {
                Active_Heading.update(() => 0);
            } else if (headings_height[headings.length - 1] < _scrollTop) {
                Active_Heading.update(() => headings.length - 1)
            } else {
                for (let i = 0; i < headings.length - 1; i++) {
                    if (headings_height[i] < _scrollTop && headings_height[i + 1] > _scrollTop ) {
                        Active_Heading.update(() => i);
                        break;
                    }
                }
            }
            timer = null;
        }, 50);
    }
    

</script>

<svelte:head>
    <title>{data.post.attributes.title}</title>
    <meta name="description" content={data.post.description}>
</svelte:head>

<svelte:window on:scroll={scroll_callback}/>

<div class="max-w-[90rem] mx-auto">
    <article class="max-w-3xl xl:max-w-5xl">
        <h1>{data.post.attributes.title}</h1>
        <div>
            <div>
                <CalendarIcon/>{data.post.attributes.mtime}
            </div>
        </div>
        {@html data.post.body}
    </article>

    <div class="fixed top-40 right-[max(0px,calc(50%-55rem))] w-[19.5rem]">
        <TOC toc={data.post.toc}></TOC>
    </div>
</div>