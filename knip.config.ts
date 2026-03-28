import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      entry: [
        "turbo.json!",
        "knip.config.ts",
        "commitlint.config.ts",
        "lefthook.yml!",
      ],
      project: ["*.{ts,js,mjs}"],
    },
    "apps/api": {
      entry: ["src/main.ts", "test/**/*.spec.ts"],
      project: ["src/**/*.ts", "test/**/*.ts"],
    },
    "apps/backoffice": {
      entry: ["app/**/*.{ts,tsx}", "next.config.ts"],
      project: ["**/*.{ts,tsx}"],
    },
    "apps/landing": {
      entry: ["app/**/*.{ts,tsx}", "next.config.ts"],
      project: ["**/*.{ts,tsx}"],
    },
    "packages/ui": {
      entry: ["src/**/*.tsx"],
      project: ["src/**/*.{ts,tsx}"],
    },
    "packages/database": {
      entry: ["src/index.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/eslint-config": {
      entry: ["*.{js,mjs}"],
      project: ["*.{js,mjs}"],
    },
    "packages/typescript-config": {
      entry: ["*.json"],
      project: [],
      ignore: ["**"],
    },
  },
  ignore: [
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/.turbo/**",
    "**/coverage/**",
  ],
};

export default config;
