module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 13,
    sourceType: "module"
  },
  extends: "eslint:recommended",
  rules: {
    "semi": ["error", "always"],
    "quotes": ["error", "double"]
  }
};
