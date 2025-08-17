import { pathsToModuleNameMapper } from 'ts-jest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { compilerOptions } = require('./tsconfig.json');

const jestConfig = {
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
