import { pathsToModuleNameMapper } from 'ts-jest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { compilerOptions } = require('./tsconfig.json');

const pathsToModuleNameMapperExcludingMockedLibs = () => {
    const modulesFromTsConfig = pathsToModuleNameMapper(compilerOptions.paths);

    Object.keys(modulesFromTsConfig).forEach((moduleKey) => {
        if (moduleKey.startsWith('^/lib')) {
            delete modulesFromTsConfig[moduleKey];
        }
    });

    return modulesFromTsConfig;
};

const jestConfig = {
    clearMocks: true,

    collectCoverage: true,
    coverageDirectory: './coverage',

    globals: {
        app: {
            config: {
                env: 'localhost',
                serviceSecret: 'dummyToken',
            },
        },
        __FILE__: '',
    },

    preset: 'ts-jest/presets/default-esm',

    modulePaths: [compilerOptions.baseUrl],

    moduleNameMapper: {
        ...pathsToModuleNameMapperExcludingMockedLibs(),
        '^/lib/(.*)': '<rootDir>/.mocks/modules/lib/$1',
    },

    testMatch: ['<rootDir>/**/*.test.ts'],

    setupFiles: ['./jest-setup.ts'],
};

export default jestConfig;