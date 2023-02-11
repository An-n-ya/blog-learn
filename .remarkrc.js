import headingid from "./src/utils/remarkjs/heading_id.js";
import html from "remark-html";

const remarkConfig = {
  settings: {
    bullet: '*', // Use `*` for list item bullets (default)
    // See <https://github.com/remarkjs/remark/tree/main/packages/remark-stringify> for more options.
  },
  plugins: [
    headingid, // Check that markdown is consistent.
    html,
  ]
}

export default remarkConfig