import { build, emptyDir } from "https://deno.land/x/dnt@0.39.0/mod.ts";

const outDir = "./dist";

await emptyDir(outDir);

await build({
  entryPoints: ["./src/index.ts"],
  outDir,
  shims: { deno: true },
  package: {
    name: "async-inject",
    version: Deno.args[0],
    description:
      "Inject values and access them from nested scopes in async context.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/uriva/async-inject.git",
    },
    bugs: { url: "https://github.com/uriva/async-inject/issues" },
  },
  importMap: "deno.json",
  postBuild() {
    Deno.copyFileSync("./LICENSE", outDir + "/LICENSE");
    Deno.copyFileSync("./README.md", outDir + "/README.md");
  },
});
