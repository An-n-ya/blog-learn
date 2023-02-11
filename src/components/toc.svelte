<script>
    /**
     * @type {Array<any>}
     */
     export let toc;
     
     
</script>

<style>
    ul {
		padding: 0.2em 0 0 0.5em;
		margin: 0 0 0 0.5em;
		list-style: none;
	}

	li {
		padding: 0.2em 0;
	}
</style>

<ul>
{#each toc as item }
    <li>
        <a href={"#" + item.name}>
            {item.name}
        </a>
        {#if item.child.length != 0}
            <svelte:self toc={item.child}/>
        {/if}
    </li>
{/each}
</ul>