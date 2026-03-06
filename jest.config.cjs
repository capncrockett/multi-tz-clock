module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.jest.test.js'],
  collectCoverageFrom: [
    'assets/js/clock-utils.js'
  ],
  coverageDirectory: 'coverage/jest',
  clearMocks: true
};
