// Commented-out code: a comment that is code-shaped (keyword start, or ends in ; { } or a call) and
// parses as statements other than a bare word, member chain or label.
import { parseSync } from "oxc-parser";

const proseLike = new Set([
  "ExpressionStatement:Identifier",
  "ExpressionStatement:MemberExpression",
  "LabeledStatement",
  "EmptyStatement",
]);

function looksLikeCode(text) {
  const body = text.trim();
  if (body.length < 4 || /^(oxlint|eslint|biome|@ts-|istanbul|c8|#)/.test(body)) return false;
  const codeShaped =
    /^(import|export|const|let|var|return|if|for|while|await|function|class|throw|try)\b/.test(body) ||
    /[;{}]$|\)$/.test(body);
  if (!codeShaped) return false;
  // Wrapping in an async function lets `return …` and `await …` lines parse.
  const { program, errors } = parseSync("comment.ts", `async function _() {\n${body}\n}`);
  const statements = program.body[0]?.body?.body ?? [];
  if (errors.length > 0 || statements.length === 0) return false;
  return statements.some((s) => {
    const kind = s.type === "ExpressionStatement" ? `${s.type}:${s.expression.type}` : s.type;
    return !proseLike.has(kind);
  });
}

const noCommentedCode = {
  meta: { type: "suggestion", docs: { description: "Delete commented-out code; git keeps history." } },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (looksLikeCode(comment.value)) {
            context.report({ loc: comment.loc, message: "Commented-out code: delete it (git keeps history)." });
          }
        }
      },
    };
  },
};

const MAX_COMMENT_LINES = 2;

const maxCommentLines = {
  meta: { type: "suggestion", docs: { description: `Comments are at most ${MAX_COMMENT_LINES} lines.` } },
  create(context) {
    return {
      Program() {
        const groups = [];
        for (const comment of context.sourceCode.getAllComments()) {
          const last = groups.at(-1);
          const adjacent = last?.type === "Line" && comment.type === "Line" && comment.loc.start.line === last.end + 1;
          if (adjacent) last.end = comment.loc.end.line;
          else groups.push({ type: comment.type, start: comment.loc.start, end: comment.loc.end.line });
        }
        for (const g of groups) {
          if (g.end - g.start.line + 1 > MAX_COMMENT_LINES) {
            context.report({
              loc: { start: g.start, end: { line: g.end, column: 0 } },
              message: `Comment over ${MAX_COMMENT_LINES} lines: cut it to the one thing a reader can't see in the code.`,
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "local" },
  rules: { "no-commented-code": noCommentedCode, "max-comment-lines": maxCommentLines },
};
