import type { UserConfig } from "tsdown";

const config: UserConfig = {
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  platform: "node",
  fixedExtension: false,
  clean: false,
  minify: true,
  deps: { neverBundle: [/^node:/], onlyBundle: ["yaml"] },
};

export default config;
