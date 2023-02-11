import test from "tape";
import fs from "fs";
import path from "path";
import {unified} from "unified";
import html from "remark-html";
import parse from "remark-parse";
import headingid from "../src/utils/remarkjs/heading_id.js";


test('heading_id_test', (t) => {
    let md = fs.readFileSync(path.join('test/test.md'));
    let res = unified()
                .use(parse)
                .use(html)
                .use(headingid)
                .processSync(md)
                .toString(); 
    let expect = `<h1 id="user-content-father">father</h1>
<h2 id="user-content-sub_father1">sub_father1</h2>
<h3 id="user-content-sub1_child1">sub1_child1</h3>
<h4 id="user-content-sub_sub1_child1">sub_sub1_child1</h4>
<h3 id="user-content-sub1_child2">sub1_child2</h3>
<h3 id="user-content-sub1_child3">sub1_child3</h3>
<h2 id="user-content-sub_father2">sub_father2</h2>
<h3 id="user-content-sub2_child1">sub2_child1</h3>
<h3 id="user-content-sub2_child2">sub2_child2</h3>
<h3 id="user-content-sub2_child3">sub2_child3</h3>
`;
    t.equal(res, expect, 'heading id wrong');

    t.end();
})