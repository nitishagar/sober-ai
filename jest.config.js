module.exports = {
  testTimeout: 60000,
  verbose: true,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      coverageDirectory: 'coverage',
      collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/ui/public/**'
      ]
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      globalSetup: '<rootDir>/tests/integration/globalSetup.js',
      globalTeardown: '<rootDir>/tests/integration/globalTeardown.js'
    }
  ]
};
