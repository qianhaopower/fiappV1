import js from "@eslint/js";
import globals from "globals";
import next from "eslint-config-next";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // Ignore generated/vendor folders
  {
    ignores: [
      "amplify/**",
      ".amplify/**",
      ".next/**",
      "node_modules/**",
      "public/**",
      "_docs/**"
    ]
  },

  // Base JS recommended
  js.configs.recommended,

  // Next.js recommended rules
  ...next,

  // Apply to your source files explicitly
  {
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "components/**/*.{js,jsx,ts,tsx}",
      "utils/**/*.{js,jsx,ts,tsx}"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
  "react/react-in-jsx-scope": "off",
  "no-undef": "off"

    }
  }
];
