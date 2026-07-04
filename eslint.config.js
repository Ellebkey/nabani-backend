const js = require('@eslint/js');
const stylistic = require('@stylistic/eslint-plugin');
const importX = require('eslint-plugin-import-x');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'release/**',
      'coverage/**',
      'db-migrations/**',
      'docker/**',
      'src/**/*.js',
      '*.js',
      '*.json',
    ],
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        braceStyle: '1tbs',
        commaDangle: 'always-multiline',
        arrowParens: true,
        jsx: false,
      }),
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // --- repo conventions (see docs/MODULE_DEVELOPMENT_GUIDE.md) ---
      '@stylistic/max-len': ['error', 120],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      'import-x/order': ['error', { groups: [['builtin', 'external', 'internal']] }],
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'no-await-in-loop': 'error',

      // --- best practices ---
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'warn',
      curly: ['error', 'multi-line'],
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['req', 'res', 'acc'] }],
      '@typescript-eslint/no-shadow': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-extraneous-dependencies': ['error', {
        devDependencies: ['**/__tests__/**', '**/__mocks__/**', '**/*.test.ts', 'src/test/**'],
      }],

      // --- calibrations ---
      // tsc already validates module resolution (incl. tsconfig paths)
      'import-x/no-unresolved': 'off',
      // default-import + member access (jwt.sign, bcrypt.hash) is idiomatic for CJS packages
      'import-x/no-named-as-default-member': 'off',
      // require() stays allowed: dynamic route loader (index.route.ts) and jest.mock factories
      '@typescript-eslint/no-require-imports': 'off',
      // async Express handlers are passed/returned where void-returning functions are
      // expected; Express 5 handles rejected handler promises natively
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false, returns: false } }],
      // catch variables are unknown; String(error) in logging is intentional
      '@typescript-eslint/no-base-to-string': ['error', { checkUnknown: false }],
    },
  },
  {
    // Sequelize association pattern: models reference each other's instance
    // types, and the repo bans `import type`, so these cycles are inherent
    files: ['src/models/*.ts'],
    rules: {
      'import-x/no-cycle': 'off',
    },
  },
  {
    files: [
      'src/**/__tests__/**/*.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/__mocks__/**/*.ts',
      'src/test/**/*.ts',
    ],
    rules: {
      'import-x/first': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // expect(mockService.method) on jest mocks is idiomatic
      '@typescript-eslint/unbound-method': 'off',
      // mock callbacks are async to satisfy Promise-returning signatures without awaiting
      '@typescript-eslint/require-await': 'off',
    },
  },
);
