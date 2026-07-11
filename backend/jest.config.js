/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@groweasy/shared$": "<rootDir>/../shared/types/index.ts",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
