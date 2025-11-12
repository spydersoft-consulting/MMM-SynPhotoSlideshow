import css from '@eslint/css';
import {defineConfig} from 'eslint/config';
import globals from 'globals';
import {flatConfigs as importX} from 'eslint-plugin-import-x';
import js from '@eslint/js';
import markdown from '@eslint/markdown';
import prettierConfig from 'eslint-config-prettier';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    'ignores': ['coverage/**', '__mocks__/**', 'output/**', '*.js', '!*.config.js', '!*.config.mjs', 'node_modules/**']
  },
  {
    'files': ['**/*.css'],
    'languageOptions': {'tolerant': true},
    'plugins': {css},
    'language': 'css/css',
    'extends': ['css/recommended'],
    'rules': {
      'css/use-baseline': ['error', {'available': 'newly'}],
      'css/no-important': 'off',
      'css/no-empty-blocks': 'off'
    }
  },
  ...tseslint.configs.recommended,
  {
    'files': ['**/*.ts', '**/*.js'],
    'languageOptions': {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2017,
        ecmaFeatures: {
          globalReturn: true
        }
      },
      'globals': {
        ...globals.browser,
        ...globals.node,
        'ConfigValidator': 'readonly',
        'EXIF': 'readonly',
        'ImageHandler': 'readonly',
        'Log': 'readonly',
        'Module': 'readonly',
        'TransitionHandler': 'readonly',
        'UIBuilder': 'readonly',
        'moment': 'readonly',
        'NodeJS': 'readonly',
        config: true,
        MM: true
      }
    },
    'plugins': {js,
      stylistic},
    'extends': [importX.recommended, 'js/all', 'stylistic/all'],
    'rules': {
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/lines-around-comment': 'off',
      '@stylistic/multiline-comment-style': 'off',
      '@stylistic/padded-blocks': 'off',
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/quotes': ['error', 'single'],
      '@typescript-eslint/no-explicit-any': 'warn',
      'camelcase': 'off',
      'capitalized-comments': 'off',
      'class-methods-use-this': 'off',
      'complexity': ['error', 35],
      'consistent-this': 'off',
      'curly': 'off',
      'id-length': 'off',
      'import-x/no-unresolved': 'off',
      'init-declarations': 'off',
      'line-comment-position': 'off',
      'max-depth': ['error', 5],
      'max-lines': 'off',
      'max-lines-per-function': ['error', 150],
      'max-params': 'off',
      'max-statements': ['error', 100],
      'multiline-comment-style': 'off',
      'no-await-in-loop': 'off',
      'no-case-declarations': 'off',
      'no-continue': 'off',
      'no-global-assign': 'warn',
      'no-implicit-globals': 'warn',
      'no-inline-comments': 'off',
      'no-lonely-if': 'off',
      'no-magic-numbers': 'off',
      'no-negated-condition': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-ternary': 'off',
      'no-undefined': 'off',
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'off',
      'no-void': ['error', {'allowAsStatement': true}],
      'no-warning-comments': 'off',
      'one-var': ['error', 'never'],
      'require-await': 'off',
      'sort-imports': 'off',
      'sort-keys': 'off'
    }
  },
  {
    'files': ['**/*.test.js', '**/*.test.ts'],
    'languageOptions': {
      parser: tseslint.parser,
      'globals': {
        ...globals.node,
        ...globals.jest,
        'NodeJS': 'readonly'
      }
    },
    'plugins': {js,
      stylistic},
    'extends': [importX.recommended, 'js/all', 'stylistic/all'],
    'rules': {
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/lines-around-comment': 'off',
      '@stylistic/multiline-comment-style': 'off',
      '@stylistic/padded-blocks': 'off',
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/quotes': ['error', 'single'],
      'camelcase': 'off',
      'capitalized-comments': 'off',
      'class-methods-use-this': 'off',
      'complexity': ['error', 35],
      'consistent-this': 'off',
      'curly': 'off',
      'id-length': 'off',
      'init-declarations': 'off',
      'line-comment-position': 'off',
      'max-depth': ['error', 5],
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
      'max-statements': 'off',
      'multiline-comment-style': 'off',
      'no-await-in-loop': 'off',
      'no-case-declarations': 'off',
      'no-continue': 'off',
      'no-global-assign': 'warn',
      'no-implicit-globals': 'warn',
      'no-inline-comments': 'off',
      'no-lonely-if': 'off',
      'no-magic-numbers': 'off',
      'no-negated-condition': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-ternary': 'off',
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'off',
      'no-warning-comments': 'off',
      'one-var': ['error', 'never'],
      'require-await': 'off',
      'sort-keys': 'off',
      'import-x/no-unresolved': 'off',
      'no-undefined': 'off',
      'sort-imports': 'off'
    }
  },
  {
    'files': ['**/*.mjs'],
    'languageOptions': {
      'ecmaVersion': 'latest',
      'globals': {
        ...globals.node
      },
      'sourceType': 'module'
    },
    'plugins': {js,
      stylistic},
    'extends': [importX.recommended, 'js/all', 'stylistic/all'],
    'rules': {
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/object-property-newline': ['error', {'allowAllPropertiesOnSameLine': true}],
      'func-style': 'off',
      'max-lines-per-function': ['error', 100],
      'no-magic-numbers': 'off',
      'one-var': 'off',
      'sort-keys': 'off'
    }
  },
  {
    'files': ['**/*.md'],
    'plugins': {markdown},
    'extends': ['markdown/recommended'],
    'language': 'markdown/gfm',
    'rules': {
      'markdown/fenced-code-language': 'off'
    }
  },
  prettierConfig
]);
