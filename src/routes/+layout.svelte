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
</script>

<header class="flex bg-white px-3 py-4 border-solid border border-x-0 items-center justify-between">
    <h1><a href="/">My Blog</a></h1>
    <nav class="">
        <a href="/">Home</a>
        <a class="ml-3" href="/posts">Posts</a>
    </nav>
</header>

<slot></slot>

<footer class="flex bg-white items-center justify-between px-3 py-4 border-solid border border-x-0">
    <div><a class="text-base" href="http://beian.miit.gov.cn/">鄂ICP备20005759号-2</a></div>
    <div>Email: ankh04@icloud.com</div>
    <div><a class="text-base" href="https://github.com/ankh04">Github</a></div>
</footer>