
import {visit} from "unist-util-visit";

export default function() {
  return function(node) {
    visit(node, 'heading', node => {
      let lastChild = node.children[node.children.length - 1]
      if (lastChild && lastChild.type === 'text') {
        let id = lastChild.value;
        node.data = {
          id: id,
          hProperties: {
            id: id
          }
        };
      }
    })
  }
}