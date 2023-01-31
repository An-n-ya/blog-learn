<style>
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid lightgray;
        padding-left: 4vw;
        padding-right: 4vw;
        height: 4em;
    }
    footer {
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
    }
    
    nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    h1 {
        margin: 5;
        font-weight: 400;
        font-size: 25px;
    }
    
    a {
        margin-left: 20px;
    }
</style>
<script>
    import "../app.css";
</script>

<header>
    <h1><a href="/">My Blog</a></h1>
    <nav>
        <a href="/">Home</a>
        <a href="/posts">Posts</a>
    </nav>
</header>

<slot></slot>

<footer>
    <div><a href="http://beian.miit.gov.cn/">鄂ICP备20005759号-2</a></div>
    <div>Email: ankh04@icloud.com</div>
    <div><a href="https://github.com/ankh04">Github</a></div>
</footer>