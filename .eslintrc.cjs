module.exports = {
  env: {
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    extraFileExtensions: ['.cjs']
  },
  rules: {
    'no-new': 0,
    semi: ['warn', 'never'],
    'require-await': 'error',
    quotes: ['warn', 'double'],
    'prefer-const': ['error', {
      ignoreReadBeforeAssign: true,
    }],
    '@typescript-eslint/member-delimiter-style': ['warn',
      {
        multiline: {
          delimiter: 'none',
          requireLast: false,
        },
      },
    ],
    '@typescript-eslint/explicit-member-accessibility': ['error', {
      ignoredMethodNames: ['constructor'],
    }],
    'eol-last': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
    }],
    'comma-dangle': 'off',
    '@typescript-eslint/comma-dangle': ['warn', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'always-multiline',
      enums: 'always-multiline',
      generics: 'always-multiline',
      tuples: 'always-multiline',
    }],
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-floating-promises': ['error', {
      ignoreVoid: false,
      ignoreIIFE: false,
    }],
    '@typescript-eslint/no-empty-interface': [
      'error',
      {
        'allowSingleExtends': true
      }
    ],
    '@typescript-eslint/ban-ts-comment': ['warn', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': 'allow-with-description',
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    }],
    'node/handle-callback-err': 0,
    '@typescript-eslint/type-annotation-spacing': ['error', {
      'before': false,
      'after': true,
      'overrides': {
        arrow: {
          'before': true,
          'after': true,
        }
      }
    }],
    '@typescript-eslint/await-thenable': 'error',
    'func-call-spacing': 0,
    '@typescript-eslint/func-call-spacing': 0,
    'indent': 0,
    '@typescript-eslint/indent': ['error', 2],
    'no-useless-escape': 0,
    'space-infix-ops': 0,
    '@typescript-eslint/space-infix-ops': ['error'],
    semi: 0,
    '@typescript-eslint/semi': ['warn', 'never'],
    'lines-between-class-members': 0,
    '@typescript-eslint/lines-between-class-members': ['error',  'always', {
      'exceptAfterSingleLine': true
    }],
    'no-use-before-define': 0,
    '@typescript-eslint/no-use-before-define': ['error', {
      'functions': false, 
      'classes': true, 
      'variables': true
    }],
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'curly': ['error', 'multi-or-nest'],
    'import/no-webpack-loader-syntax': 0,
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'brace-style': ['error', 'stroustrup'],
    'dot-notation': 0,
    '@typescript-eslint/dot-notation': ['error'],
    'no-multi-str': 0,
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    '*.js',
    'dist',
    '*.d.ts',
  ],
}
