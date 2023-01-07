<script>
    /**
     * @type {String}
     */
     export let title;
     /**
      * @type {String}
      */
     export let description;
     /**
      * @type {String}
      */
     export let url;
</script>

<a href={url}>
    <article>
        <h1>{title}</h1>
        <p>{description}</p>
    </article>
</a>