import type { PageLoad } from "./$types";

export const load = (async ({fetch}) => {
    const posts = await fetch("/posts").then(r => r.json());
    return {
        posts
    };
}) satisfies PageLoad;