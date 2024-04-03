const enonicLibraryImports = [
    '^/lib/xp',
    '^/lib/http-client',
    '^/lib/cache',
    '^/lib/thymeleaf',
    '^/lib/guillotine',
    '^/lib/graphql',
    '^/lib/graphql-rx',
    '^/assets',
];

module.exports = {
    'extends': [
        'prettier',
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
    ],
    'plugins': ['prettier', '@typescript-eslint', 'import'],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 2020,
        'project': './tsconfig.json',
        'tsconfigRootDir': './',
    },
    'rules': {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                'argsIgnorePattern': '^_$',
            },
        ],
        '@typescript-eslint/no-var-requires': 'off',
        'camelcase': 'off',
        'comma-dangle': ['error', 'only-multiline'],
        'dot-notation': 'off',
        'func-names': 'off',
        'global-require': 'off',
        'import/no-absolute-path': [
            'error',
            {
                'ignore': enonicLibraryImports,
            },
        ],
        'import/no-named-as-default-member': 'off',
        'import/no-unresolved': [
            'error',
            {
                'ignore': enonicLibraryImports,
            },
        ],
        'no-case-declarations': 'off',
        'no-cond-assign': ['error', 'except-parens'],
        'no-console': 'error',
        'no-extend-native': 'off',
        'no-param-reassign': 'off',
        'no-plusplus': 'off',
        'no-restricted-globals': 'off',
        'no-restricted-imports': [
            'error',
            {
                'patterns': [
                    {
                        'group': ['?/lib/xp/*'],
                        'message': 'Imports from /lib/xp/* must not be prefixed with anything',
                    },
                    {
                        'group': ['\@enonic-types/*'],
                        'message': '@enonic-types modules should not be imported directly (use /lib/xp/*)',
                    },
                    {
                        'group': ['?types/xp-libs/*'],
                        'message': 'xp-libs patches should not be imported directly (use /lib/xp/*)',
                    },
                ],
            },
        ],
        'no-underscore-dangle': 'off',
        'no-unsafe-optional-chaining': 'off',
        'no-use-before-define': 'off',
        'object-shorthand': 'off',
        'prefer-destructuring': 'off',
        'prefer-template': 'off',
        'radix': ['error', 'as-needed'],
    },
    'globals': {
        'require': true,
        'log': true,
        'exports': true,
        'resolve': true,
        'app': true,
        'fetch': true,
        'document': true,
        'window': true,
        '__': true,
        '__FILE__': true,
        'Java': true,
        'module': true,
    },
    'overrides': [
        {
            'files': ['*.html', '*.ftl', '*.xml'],
            'rules': {
                'max-len': 'off',
            },
        },
        {
            'files': ['src/main/resources/types/**/*.d.ts'],
            'rules': {
                'import/no-unresolved': [
                    'off',
                    {
                        'ignore': ['/lib/xp'],
                    },
                ],
                'no-restricted-imports': 'off',
            },
        },
    ],
    'settings': {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
            'typescript': {},
        },
    },
};
