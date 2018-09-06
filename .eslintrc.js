module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    sourceType: 'module',
    allowImportExportEverywhere: false
  },
  globals: {
    AMap: true
  },
  env: {
    browser: true,
    node: true
  },
  plugins: ['vue'],
  rules: {
    'no-param-reassign': [
      'error',
      {
        props: false
      }
    ],
    quotes: [
      2,
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true
      }
    ],
    'import/no-unresolved': ['off'],
    'no-underscore-dangle': 0,
    'global-require': 0,
    'import/extensions': ['off', 'never'],
    'comma-dangle': ['error', 'only-multiline'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'class-methods-use-this': 0,
    'no-unreachable': 2,
    'no-undef': 2,
    'no-unused-vars': 2,
    'no-func-assign': 2,
    'no-redeclare': 2
  }
};
