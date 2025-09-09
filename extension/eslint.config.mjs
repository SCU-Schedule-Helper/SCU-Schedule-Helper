import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/out/**", "**/dist/**", "**/node_modules/**", "**/.next/**"]),
    {
        extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            parser: tsParser,
            globals: {
                ...globals.node,
            }
        },

        rules: {
            "@typescript-eslint/no-unused-vars": ["error", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_",
                "destructuredArrayIgnorePattern": "^_",
            }],
            "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: false, ignoreRestArgs: false }],
            "no-unused-vars": "off",
            "prefer-const": ["error", {
                "destructuring": "all",
                "ignoreReadBeforeAssign": false
            }],
        },
    }]);