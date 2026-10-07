import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

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
    ...nextVitals,
    ...nextTypescript,
    {
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
    },
    {
        // Pre-existing debt surfaced by the Next 16 / React 19 rule sets. Tracked, not blocking.
        rules: {
            // `_`-prefixed names and rest-sibling omissions are intentional (e.g. `const { password: _p, ...rest }`).
            '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
        },
    },
];

export default eslintConfig;
