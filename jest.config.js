module.exports = {
	// moduleDirectories: ['src', 'node_modules'],
	collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
	testMatch: ['<rootDir>/tests/**/*.spec.ts'],
	preset: 'ts-jest',
	testEnvironment: 'node',
	verbose: true,
	// rootDir: '.',
};
