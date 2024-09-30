/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
    // A set of global variables that need to be available in all test environments
    globals: {
        app: {
            config: {
                env: 'localhost',
                frontendOrigin: 'http://localhost:3000',
                xpOrigin: 'http://localhost:8080',
                revalidatorProxyOrigin: 'http://localhost:3002',
                serviceSecret: 'dummyToken',
            },
        },
        __FILE__: '',
    },

    // A list of paths to directories that Jest should use to search for files in
    roots: ['./'],

    // A preset that is used as a base for Jest's configuration
    preset: 'ts-jest/presets/default-esm',
};
