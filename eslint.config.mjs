import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: [
            ".next/*",
            "node_modules/*",
            "dist/*",
            "build/*",
            "coverage/*"
        ]
    },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        plugins: {
            import: importPlugin
        },
        rules: {
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    'newlines-between': 'always',
                    pathGroups: [
                        {
                            pattern: "{react,react-dom/**}",
                            group: "external",
                            position: "before"
                        },
                        {
                            pattern: "next",
                            group: "external",
                            position: "before"
                        },
                        {
                            pattern: "next/**",
                            group: "external",
                            position: "before"
                        },
                        {
                            pattern: "@/widgets/**",
                            group: "internal",
                            position: "after"
                        },
                        {
                            pattern: "@/features/**",
                            group: "internal",
                            position: "after"
                        },
                        {
                            pattern: "@/entities/**",
                            group: "internal",
                            position: "after"
                        },
                        {
                            pattern: "@/components/**",
                            group: "internal",
                            position: "after"
                        },
                        {
                            pattern: "@/shared/**",
                            group: "internal",
                            position: "after"
                        },
                        {
                            pattern: "**/*.css",
                            group: "index",
                            position: "after"
                        }
                    ],
                    pathGroupsExcludedImportTypes: ["type"],
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true
                    }
                }
            ]
        }
    }
];

export default eslintConfig;