<style>
    header {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid lightgray;
        padding-left: 4vw;
        padding-right: 4vw;
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