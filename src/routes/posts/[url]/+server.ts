import { convertMarkdown } from "$lib/handle-markdown";
import {json} from "@sveltejs/kit"


export async function GET({params}: {params: any}) {
    // 从动态地址中解析出md地址
    const {url} = params;
    // 解析对应的md文件
    const post = await convertMarkdown(`src/posts/${url}.md`)
    // 把解析信息返回
    return json(post);
}