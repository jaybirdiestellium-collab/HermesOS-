module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/services'],
  collectCoverageFrom: ['services/constellusService.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};
