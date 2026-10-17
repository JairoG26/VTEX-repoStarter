module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: { '\\.graphql$': '<rootDir>/__mocks__/graphql.ts' },
  globals: { 'ts-jest': { isolatedModules: true } },
  clearMocks: true,
}