import fs from "fs";
import glob from "glob";
import fm from "front-matter";
import {unified} from "unified";
import html from "remark-html";
import parse from "remark-parse";
import highlight from "remark-highlight.js";
import moment from "moment";
import {toc} from "mdast-util-toc";
import headingid from "/src/utils/remarkjs/heading_id.js";
import rehype from "remark-rehype";
import stringify from "rehype-stringify";
import { attr } from "svelte/internal";
import type { ListContent } from "mdast";

/**
 * 导入目录下的所有md文件，解析front matter和正文，放入返回结构
 * @param {string} markdownPath
 * @param [{path, attribute, body}]
 */
export function importMarkdowns(markdownPath: string) {
    let fileNames = glob.sync(`${markdownPath}*.md`);
    return fileNames.map(path => convertMarkdown(path));
}


/**
 * 解析markdown文件
 * @param {string} path 
 * @returns {path, attribute, body}
 */
export function convertMarkdown(path: string) {
    // 先读取文件
    let file = fs.readFileSync(path, "utf8");
    // 调用front-matter解析md头部信息
    let {attributes, body} = fm(file) as any;
    if (!attributes.description) {
        attributes.description = "暂无简介";
    }
    let stats = fs.statSync(path);
    moment.defaultFormat = "YYYY-MM-DD HH:mm:ss";
    attributes.mtime = moment(stats.mtimeMs).format(); 
    attributes.atime = moment(stats.atimeMs).format();
    attributes.ctime = moment(stats.ctimeMs).format();
    attributes.birthtime = moment(stats.birthtimeMs).format();
    
    // 这里需要把 sanitize 设置为false， 才能保存属性的class属性
    let result = unified()
                    .use(parse)
                    .use(html, {sanitize: false})
                    .use(highlight)
                    .use(headingid)
                    .processSync(body);
    
    let value = toc(unified().use(parse).parse(body));
    let table_of_content: any[] = [];
    function traverse(ast: any, input: any[]) {
        if (ast.type == "list") {
            for (let child of ast.children) {
                if (child.type == "listItem") {
                    let item = child.children[0];
                    if (item.type == "paragraph") {
                        input.push({
                            name: item.children[0].children[0].value,
                            child: []
                        });
                    }
                    if (child.children[1]) {
                        let sub_list = child.children[1];
                        traverse(sub_list, input[input.length - 1].child);
                    }
                }
            }
        }
    }
    traverse(value.map, table_of_content);
    
    return {path, attributes, body: String(result), toc: table_of_content}
}

export function convertToPostPreview(object: any) {
    const url = object.path.replace(".md", "").replace("src/", "");
    return {...object.attributes, url};
}