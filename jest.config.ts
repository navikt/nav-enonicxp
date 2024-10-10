/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: './coverage',

    // A set of global variables that need to be available in all test environments
    globals: {
        app: {
            config: {
                env: 'localhost',
                serviceSecret: 'dummyToken',
            },
        },
        __FILE__: '',
    },

    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
    moduleNameMapper: {
        '^/lib/(.*)': '<rootDir>/src/main/resources/__test/__mocks/modules/lib/$1',
        '^/assets/html-entities/2.3.3': '<rootDir>/node_modules/html-entities',
        '^/assets/striptags/3.1.1': '<rootDir>/node_modules/striptags',
    },

    // A preset that is used as a base for Jest's configuration
    preset: 'ts-jest',

    roots: ['./src/main/resources'],

    // The paths to modules that run some code to configure or set up the testing environment before each test
    setupFiles: ['./src/main/resources/__test/jest-setup.ts'],
};
