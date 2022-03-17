import { parseMarkdown, schema } from "../../client/prose-editor/MarkdownParser";


const quotes = "```";

it("should transform tree", () => {
  const input = `
# Heading

Paragraph

---

${ quotes }json
{ "key": "value" }
${ quotes }

    a = 10
    b = 20
  `;

  const model = parseMarkdown(input);
  console.log(JSON.stringify(model.toJSON(), null, 2));
});
