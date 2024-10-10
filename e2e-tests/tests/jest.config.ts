import { pathsToModuleNameMapper, JestConfigWithTsJest } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const jestConfig: JestConfigWithTsJest = {
    globals: {
        app: {
            config: {
                env: 'test',
                serviceSecret: 'dummyToken',
            },
        },
    },

    preset: 'ts-jest/presets/default-esm',

    modulePaths: [compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),

    testMatch: ['<rootDir>/**/*.test.ts'],

    globalSetup: './.utils/global-setup.ts',
    globalTeardown: './.utils/global-teardown.ts',
};

export default jestConfig;
