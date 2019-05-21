module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
    },
    extends: 'standard',
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        log: 'readonly',
        app: 'readonly',
        resolve: 'readonly',
        $: 'readonly',
    },
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {
        semi: ['error', 'always'],
        indent: ['error', 4],
        curly: ['error', 'all'],
        'no-extra-parens': ['off', 'all'],
        'comma-dangle': ['error', 'always-multiline'],
        'object-curly-newline': ['error', 'always'],
    },
};
