import { defineConfig } from "oxfmt";
export default defineConfig({
  printWidth: 80,
  singleQuote: false,
  ignorePatterns: [
    "node_modules/**",
    ".output/**",
    ".wxt/**",
    "docs/**",
    "firefox/**",
    "whale/**",
    "tools/**",
    "tests/**",
    "package-lock.json",
    "public/**",
  ],
});
