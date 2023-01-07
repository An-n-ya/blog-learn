/** @type {import('./$types').PageLoad} */
export async function load({fetch, params}) {
    // 从params中解析出url, 用这个url访问api，获取解析好的数据
    const post = await fetch(`/posts/${params.url}`).then(r => r.json());
    return {post}
}