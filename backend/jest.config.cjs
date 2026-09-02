/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/graphql'],
  testMatch: ['**/*.test.ts', '**/__tests__/**/*.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '(.+)\\.js$': '$1',
  },
  globals: {
    'ts-jest': {
      useESM: true,
      diagnostics: false,
      isolatedModules: true,
      tsconfig: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        types: ['jest', 'node'],
      },
    },
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['graphql/**/*.ts', 'models/**/*.ts', '!**/dist/**'],
  testTimeout: 10000,
};
