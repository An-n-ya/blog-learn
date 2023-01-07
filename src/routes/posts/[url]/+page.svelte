<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<article>
    <h1>{data.post.attributes.title}</h1>
    {@html data.post.body}
</article>