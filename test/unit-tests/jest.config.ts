import { pathsToModuleNameMapper, JestConfigWithTsJest } from 'ts-jest';
import { compilerOptions } from './tsconfig.json' with { type: 'json' };

const pathsToModuleNameMapperExcludingMockedLibs = () => {
    const modulesFromTsConfig = pathsToModuleNameMapper(compilerOptions.paths) as Record<
        string,
        unknown
    >;

    Object.keys(modulesFromTsConfig).forEach((moduleKey) => {
        if (moduleKey.startsWith('^/lib')) {
            delete modulesFromTsConfig[moduleKey];
        }
    });

    return modulesFromTsConfig;
};

const jestConfig: JestConfigWithTsJest = {
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
