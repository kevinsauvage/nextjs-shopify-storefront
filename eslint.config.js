const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');

const { fixupConfigRules, fixupPluginRules } = require('@eslint/compat');

const tsParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const jsxA11Y = require('eslint-plugin-jsx-a11y');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unicorn = require('eslint-plugin-unicorn');
const sonarjs = require('eslint-plugin-sonarjs');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    extends: fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:jsx-a11y/recommended',
        'prettier',
      ),
    ),

    plugins: {
      react: fixupPluginRules(react),
      'react-hooks': fixupPluginRules(reactHooks),
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      'jsx-a11y': fixupPluginRules(jsxA11Y),
      'simple-import-sort': simpleImportSort,
      unicorn,
      sonarjs,
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      '@typescript-eslint/no-shadow': [
        'error',
        {
          ignoreTypeValueShadow: true,
        },
      ],

      'no-unused-vars': 'off',
      'no-shadow': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      'react/jsx-key': [
        'error',
        {
          checkFragmentShorthand: true,
        },
      ],

      'react/no-array-index-key': 'warn',
      'react/no-unescaped-entities': 'error',

      'react/self-closing-comp': [
        'error',
        {
          component: true,
          html: true,
        },
      ],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^react', '^next'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],

      'simple-import-sort/exports': 'error',

      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['noHref', 'invalidHref', 'preferButton'],
        },
      ],

      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],

      'sonarjs/no-duplicate-string': [
        'warn',
        {
          threshold: 3,
        },
      ],

      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',

      'prefer-destructuring': [
        'warn',
        {
          object: true,
          array: false,
        },
      ],

      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-object-spread': 'error',
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'require-await': 'off',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',

      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],

      'array-callback-return': [
        'error',
        {
          allowImplicit: true,
        },
      ],

      'default-case': 'warn',
      'default-case-last': 'error',

      eqeqeq: [
        'error',
        'always',
        {
          null: 'ignore',
        },
      ],

      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      'no-param-reassign': [
        'warn',
        {
          props: true,
        },
      ],

      'no-sequences': 'error',
      'no-undef-init': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-void': 'error',
      radix: 'error',
      yoda: 'error',
      'unicorn/consistent-destructuring': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-array-for-each': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '**/.next/',
    '**/node_modules/',
    '**/dist/',
    '**/.turbo/',
    '**/*.config.js',
    '**/*.config.ts',
    '**/bin/',
    'src/shopify/storefront/index.ts',
    'src/shopify/admin/index.ts',
    '.pnp',
    '**/.pnp.js',
    'coverage',
    'out/',
    'build',
    '**/.DS_Store',
    '**/*.pem',
    '**/npm-debug.log*',
    '**/yarn-debug.log*',
    '**/yarn-error.log*',
    '**/.pnpm-debug.log*',
    '**/.env*.local',
    '**/.vercel',
    '**/*.tsbuildinfo',
    '**/next-env.d.ts',
    'public/sitemap*',
    '**/.dccache',
    '**/.eslintrc.js',
  ]),
]);
