import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverDir = join(process.cwd(), "dist", "server");
const generatedEntry = join(serverDir, "index.js");
const handlerEntry = join(serverDir, "vinext-handler.js");

await rename(generatedEntry, handlerEntry);

await writeFile(
  generatedEntry,
  `import handler from "./vinext-handler.js";
export * from "./vinext-handler.js";

export default {
  fetch(request) {
    return handler(request);
  },
};
`,
  "utf8",
);

const worker = await import(generatedEntry);
if (typeof worker.default?.fetch !== "function") {
  throw new Error("Sites adapter did not produce a default fetch handler.");
}

console.log("  Prepared Sites Worker entrypoint in dist/server/index.js");
