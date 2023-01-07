/** @type {import('./$types').PageLoad} */
export async function load({fetch}) {
    const posts = await fetch("/posts").then(r => r.json());
    return {
        posts
    }
}