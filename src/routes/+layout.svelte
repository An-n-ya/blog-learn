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

<header>
    <h1><a href="/">My Blog</a></h1>
    <nav>
        <a href="/">Home</a>
        <a href="/posts">Posts</a>
    </nav>
</header>

<slot></slot>

<footer>
    <div>备案号:</div>
    <div>Email: ankh04@icloud.com</div>
    <div><a href="https://github.com/ankh04">Github</a></div>
</footer>