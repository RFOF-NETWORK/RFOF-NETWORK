module.exports = {
  // Global Jest configuration for the entire RFOF-NETWORK monorepo
  // This config will be extended by specific configs in sub-projects.
  testEnvironment: 'node',
  transform: {
    // Transform JavaScript/TypeScript files for testing
    '^.+\\.(ts|js|jsx)$': 'babel-jest', // Or 'ts-jest' if using TypeScript without Babel
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: [
    '<rootDir>/READY-FOR-OUR-FUTURE',
    '<rootDir>/PRAI-OS',
    '<rootDir>/Yggdrasil_Codebase',
    '<rootDir>/tests' // For global integration tests
  ],
  // Coverage reporting
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/src/**/*.js',
    '**/src/**/*.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  // Optional: Setup files to run before tests in each environment
  // setupFilesAfterEnv: [],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    "^@rfof-network/(.*)$": "<rootDir>/$1/src"
  },

  // Project-specific Jest configurations (for monorepo setup)
  projects: [
    '<rootDir>/READY-FOR-OUR-FUTURE/jest.config.js',
    '<rootDir>/PRAI-OS/jest.config.js',
    '<rootDir>/Yggdrasil_Codebase/jest.config.js'
  ]
};
