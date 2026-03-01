import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliEntry = resolve(__dirname, "../cli-analyzer/src/cli.ts");

await build({
  entryPoints: [cliEntry],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: resolve(__dirname, "cli/dist/cli.js"),
  external: [],
});

console.log("✓ CLI bundled → cli/dist/cli.js");
