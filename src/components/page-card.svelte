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
    <article class="mx-auto my-8 p-4 rounded-md max-w-3xl border bg-slate-50 dark:bg-slate-800 darl:border-slate-500">
        <h1 class="text-3xl">{title}</h1>
        <p>{description}</p>
    </article>
</a>