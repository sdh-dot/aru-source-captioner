import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  singleQuote: false,
  ignorePatterns: [
    "_old/**",
    "docs/source/**",
    "entrypoints/features/**",
    "public/features/**",
  ],
});