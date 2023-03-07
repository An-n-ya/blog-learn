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
     /**
      * @type {String}
     */
     export let time;

    import CalendarIcon from "/src/components/icon/calendar-icon.svelte";
</script>

<article class="mx-auto my-8 p-4 rounded-md max-w-3xl border bg-slate-50 dark:bg-slate-800 darl:border-slate-500">
    <a href={url} class="dark:text-slate-300 text-slate-70">
        <h1 class="text-3xl mb-0">{title}</h1>
        <div class="mb-2">
            <CalendarIcon/>{time}
        </div>
        <p>{description}</p>
    </a>
</article>