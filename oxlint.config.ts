import { defineConfig } from "oxlint";
export default defineConfig({
  categories: { correctness: "warn" },
  rules: {
    "eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        caughtErrors: "none",
      },
    ],
    curly: ["error", "all"],
    "no-control-regex": "off",
  },
  ignorePatterns: [
    "node_modules/**",
    ".output/**",
    ".wxt/**",
    "docs/**",
    "firefox/**",
    "whale/**",
    "tools/**",
    "tests/**",
    "public/**",
  ],
});
