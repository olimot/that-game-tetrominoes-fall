import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";

export default [
  { ignores: ["server.js", "scripts", "node_modules", "public", "src_old"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  js.configs.recommended,
  ...ts.configs.recommended
];
