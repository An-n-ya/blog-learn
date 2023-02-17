<script>
    import "../app.css";
    import {onMount} from "svelte";
    import algoliasearch from 'algoliasearch';
    import instantsearch from 'instantsearch.js';
    import { searchBox, hits } from 'instantsearch.js/es/widgets'
    import { connectHits, connectSearchBox } from 'instantsearch.js/es/connectors'
    let dark_mode = "Bright";
    let hidden_search = true;
    function toggleLight() {
        if (dark_mode == "Bright") {
            dark_mode = "Dark";
            document.getElementsByTagName("html")[0].setAttribute("class", "");
            document.querySelector("link#bright")?.removeAttribute("disabled");
            document.querySelector("link#dark")?.setAttribute("disabled", "disabled");
        } else {
            dark_mode = "Bright";
            document.getElementsByTagName("html")[0].setAttribute("class", "dark");
            document.querySelector("link#dark")?.removeAttribute("disabled");
            document.querySelector("link#bright")?.setAttribute("disabled", "disabled");
        }
    }
    
    onMount(() => {
        document.querySelector("link#dark")?.removeAttribute("disabled");
        document.querySelector("link#bright")?.setAttribute("disabled", "disabled");
        
        // Replace with your own values
        const searchClient = algoliasearch(
        '7DUWWNDT93',
        '53b0f22838dd9c2475b04faf8971b5f2' // search only API key, not admin API key
        )
        	

        const search = instantsearch({
            indexName: 'blog',
            searchClient,
            routing: true,
        })

        // Create the render function
        const renderHits = (/** @type {{ hits: any; widgetParams: any; }} */ renderOptions , /** @type {any} */ isFirstRender ) => {
            const { hits, widgetParams } = renderOptions;

            widgetParams.container.innerHTML = `
                <ul>
                ${hits
                    .map(
                        (/** @type {any} */ item) =>
                        `
                        <a href="${item.url}">
                        <li>
                            <p id="head">${item.title}</p>
                            <p id="content">${instantsearch.highlight({ attribute: 'content', hit: item })}</p>
                        </li>
                        </a>
                        `
                    )
                    .join('')}
                </ul> 
            `;
        };

        // Create the custom widget
        const customHits = connectHits(renderHits);


        // Create a render function
        const renderSearchBox = (/** @type {{ query: any; refine: any; clear: any; isSearchStalled: any; widgetParams: any; }} */ renderOptions, /** @type {any} */ isFirstRender) => {
            const { query, refine, widgetParams } = renderOptions;

            if (isFirstRender) {
                const input = document.createElement('input');
                input.placeholder = "搜索文档";

                input.addEventListener('input', event => {
                    if (event.target?.value) {
                        refine(event.target?.value);
                    }
                });

                input.addEventListener('focus', ()=> {
                    hidden_search = false;
                })

                input.addEventListener('blur', ()=> {
                    hidden_search = true;
                })

                widgetParams.container.appendChild(input);
            }

            widgetParams.container.querySelector('input').value = query;
        };

        // create custom widget
        const customSearchBox = connectSearchBox(
            renderSearchBox
        );

        search.addWidgets([
            // 2. Create an interactive search box
            customSearchBox({
              container: document.querySelector('#search-box'),
            }),
            customHits({
                container: document.querySelector('#hits'),
            })
        ]);

        search.start()
    });

    
</script>

<header class="flex bg-slate-50 dark:bg-slate-800 dark:border-slate-500 bg-white px-3 py-4 border-solid border border-t-0 border-x-0 items-center justify-between">
    <h1><a href="/">My Blog</a></h1>
    <nav class="flex">
        <button class="text-lg" on:click={toggleLight}>{dark_mode}</button>
        <a class="ml-3 text-lg leading-10" href="/">Home</a>
        <a class="ml-3 text-lg leading-10" href="/posts">Posts</a>
        <div id="search-box" class="ml-3 flex items-center"></div>
    </nav>
</header>
<div id="hits" style="{hidden_search ? "visibility:hidden" : "visibility:visible"}" class="z-50 text-slate-600 p-2 absolute text-left w-[25rem] h-[25rem] overflow-y-auto right-3 top-14 bg-slate-50 rounded-sm"/>
<main>
    <div id="products"></div>
    <div id="brand"></div>
</main>

<slot></slot>

<footer class="flex bg-slate-100 dark:bg-slate-900 dark:border-slate-500 bg-white items-center justify-between px-3 py-4 border-solid border border-b-0 border-x-0">
    <div><a class="text-base" href="http://beian.miit.gov.cn/">鄂ICP备20005759号-2</a></div>
    <div>Email: ankh04@icloud.com</div>
    <div><a class="text-base" href="https://github.com/ankh04">Github</a></div>
</footer>
