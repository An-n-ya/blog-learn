<style>
    /* header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid lightgray;
        padding-left: 4vw;
        padding-right: 4vw;
        height: 4em;
    } */
    /*footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid lightgray;
        padding-left: 4vw;
        padding-right: 4vw;
        bottom: 0;
        height: 4em;
        width: calc(100% - 8vw);
    }
    footer a {
        font-size: 16px;
    } */
</style>
<script>
    import "../app.css";
    let dark_mode = "Dark";
    function toggleLight() {
        if (dark_mode == "Dark") {
            dark_mode = "Light";
            document.getElementsByTagName("html")[0].setAttribute("class", "");
        } else {
            dark_mode = "Dark";
            document.getElementsByTagName("html")[0].setAttribute("class", "dark");
        }
    }
</script>

<header class="flex bg-slate-50 dark:bg-slate-800 dark:border-slate-500 bg-white px-3 py-4 border-solid border border-t-0 border-x-0 items-center justify-between">
    <h1><a href="/">My Blog</a></h1>
    <nav class="">
        <button class="text-lg" on:click={toggleLight}>{dark_mode}</button>
        <a class="ml-3 text-lg" href="/">Home</a>
        <a class="ml-3 text-lg" href="/posts">Posts</a>
    </nav>
</header>

<slot></slot>

<footer class="flex bg-slate-100 dark:bg-slate-900 dark:border-slate-500 bg-white items-center justify-between px-3 py-4 border-solid border border-b-0 border-x-0">
    <div><a class="text-base" href="http://beian.miit.gov.cn/">鄂ICP备20005759号-2</a></div>
    <div>Email: ankh04@icloud.com</div>
    <div><a class="text-base" href="https://github.com/ankh04">Github</a></div>
</footer>
