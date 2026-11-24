// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import chaiFriendly from 'eslint-plugin-chai-friendly';

export default tseslint.config(
  {
    files: ["src/frontend/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["src/frontend/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  {
    files: ["src/common/*.ts", "src/backend/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    rules: {
      '@typescript-eslint/prefer-for-of': 'off'
    }
  },
  {
    files: ["test/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    plugins: {
      'chai-friendly': chaiFriendly
    },
    rules: {
      // turn off the strict TS version
      '@typescript-eslint/no-unused-expressions': 'off',
      // and enable the chai-friendly version
      'chai-friendly/no-unused-expressions': 'error'
    }
  },
);
