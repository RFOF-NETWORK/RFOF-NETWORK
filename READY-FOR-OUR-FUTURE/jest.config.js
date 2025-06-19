module.exports = {
  // Extends the global Jest configuration
  extends: '../../jest.config.js',
  displayName: 'READY-FOR-OUR-FUTURE',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
    '<rootDir>/contracts' // If Solidity tests are Jest-compatible
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/contracts/**/*.test.js' // For JavaScript-based contract tests
  ],
  transform: {
    // For Solidity tests with hardhat-jest or similar setup
    '^.+\\.sol$': '@openzeppelin/test-environment/dist/jest-transformer.js', // Example for Solidity
    '^.+\\.(ts|js)$': 'ts-jest', // For TypeScript/JavaScript files
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node', 'sol'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'contracts/**/*.sol',
    '!src/types/**', // Exclude type definition files from coverage
  ],
  // Setup files for specific test environments (e.g., blockchain test environment)
  setupFilesAfterEnv: [
    // "<rootDir>/tests/setup.ts" // Example: setup for blockchain test environment
  ],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
