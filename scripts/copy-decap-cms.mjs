import { cp, mkdir } from "node:fs/promises";

const source = new URL("../node_modules/decap-cms/dist/", import.meta.url);
const target = new URL("../dist/admin/decap-cms/", import.meta.url);

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log("Copied Decap CMS assets to dist/admin/decap-cms");
