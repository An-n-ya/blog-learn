import {importMarkdowns, convertToPostPreview} from "$lib/handle-markdown"
import {json} from "@sveltejs/kit"

// 先读取并解析所有的markdown
let postFiles = importMarkdowns("src/posts/");

export function GET() {
    // 把完整的解析信息转换成需要的信息
    let posts = postFiles.map((file) => convertToPostPreview(file))
    return json(posts);
}