/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	testEnvironment: "jsdom",
	moduleNameMapper: {
		"\\.(css|scss|sass|less)$": "identity-obj-proxy"
	},
	collectCoverageFrom: [
		"src/**/*.tsx", 
		"src/**/*.ts", 
		"!src/**/*.test.ts", 
		"!src/**/*.test.tsx", 
		"!src/**/*.stories.tsx", 
		"!src/**/index.tsx", 
		"!src/models/*.ts", 
		"!src/lib.ts", 
		"!src/MMM-SynPhotoSlideshow.ts", 
		"!src/node_helper.ts"
	],
	reporters: ["default", "jest-junit"],
	coverageReporters: ["text", "cobertura", "json", "lcov", "clover"],
	coverageThreshold: {
		global: {
			branches: 1,
			functions: 1,
			lines: 1,
			statements: 1
		}
	},
	transform: {
		"^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
	},
	verbose: true,
	testPathIgnorePatterns: ["/node_modules/", "/lib/", "/storybook-static/"]
};
