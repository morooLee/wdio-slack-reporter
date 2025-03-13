import path from 'path';
import { fileURLToPath } from 'url';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import importRules from 'eslint-plugin-import';
import nRules from 'eslint-plugin-n';
import notice from 'eslint-plugin-notice';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = {
  '@typescript-eslint': typescriptEslint,
  '@stylistic': stylistic,
  import: importRules,
  n: nRules,
  notice: notice,
};

// 무시할 파일 패턴
const ignores = [
  'node_modules/',
  'dist/',
  'coverage/',
  '**/*.js',
  '**/*.d.ts',
  '**/*.js.map',
  '.eslintrc.js',
  'test-results/',
];

// 기본 규칙
const baseRules = {
  // TypeScript 관련 규칙
  '@typescript-eslint/no-unused-vars': [
    2,
    { args: 'none', caughtErrors: 'none' },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': 2,
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports' },
  ],

  // 구문 선호도
  '@stylistic/semi': [2, 'always'],
  '@stylistic/quotes': [
    2,
    'single',
    {
      avoidEscape: true,
      allowTemplateLiterals: true,
    },
  ],
  '@stylistic/object-curly-spacing': [2, 'always'],
  '@stylistic/comma-style': [2, 'last'],
  '@stylistic/brace-style': [2, '1tbs', { allowSingleLine: true }],
  // '@stylistic/arrow-parens': [2, 'as-needed'],
  // '@stylistic/comma-dangle': [2, 'always-multiline'],
  '@stylistic/keyword-spacing': [2, { before: true, after: true }],

  // 안티 패턴
  'no-var': 2,
  'prefer-const': 2,
  'no-with': 2,
  'no-multi-str': 2,
  'no-caller': 2,
  'no-implied-eval': 2,
  'no-new-object': 2,
  'no-octal-escape': 2,
  'no-self-compare': 2,
  'no-shadow-restricted-names': 2,
  'no-cond-assign': 2,
  'no-debugger': 2,
  'no-dupe-keys': 2,
  'no-duplicate-case': 2,
  'no-empty-character-class': 2,
  'no-unreachable': 2,
  'no-unsafe-negation': 2,
  radix: 2,
  'valid-typeof': 2,
  'no-implicit-globals': [2],
  'no-unused-expressions': [
    2,
    {
      allowShortCircuit: true,
      allowTernary: true,
      allowTaggedTemplates: true,
    },
  ],
  'no-proto': 2,
  eqeqeq: [2],

  // 공백 관련 규칙
  // '@stylistic/indent': [
  //   2,
  //   2,
  //   {
  //     SwitchCase: 1,
  //     CallExpression: { arguments: 2 },
  //     MemberExpression: 2,
  //     ObjectExpression: 1, // 객체 리터럴 들여쓰기 완화
  //     ArrayExpression: 1, // 배열 리터럴 들여쓰기 완화
  //     ignoredNodes: [
  //       // 특정 노드 패턴 무시
  //       'TSTypeParameterInstantiation',
  //       'TSUnionType',
  //       'TSIntersectionType',
  //     ],
  //   },
  // ],
  '@stylistic/space-infix-ops': 2,
  '@stylistic/space-in-parens': [2, 'never'],
  '@stylistic/array-bracket-spacing': [2, 'never'],
  '@stylistic/comma-spacing': [2, { before: false, after: true }],
  '@stylistic/space-before-function-paren': [
    2,
    {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    },
  ],
  '@stylistic/keyword-spacing': [
    2,
    {
      overrides: {
        if: { after: true },
        else: { after: true },
        for: { after: true },
        while: { after: true },
        do: { after: true },
        switch: { after: true },
        return: { after: true },
      },
    },
  ],
  '@stylistic/arrow-spacing': [2, { before: true, after: true }],
  '@stylistic/func-call-spacing': 2,
  '@stylistic/type-annotation-spacing': 2,

  // 파일 공백
  '@stylistic/no-multiple-empty-lines': [2, { max: 2, maxEOF: 0 }],
  '@stylistic/no-mixed-spaces-and-tabs': 2,
  '@stylistic/no-trailing-spaces': 2,
  '@stylistic/linebreak-style': [process.platform === 'win32' ? 0 : 2, 'unix'],
  '@stylistic/key-spacing': [2, { beforeColon: false }],
  '@stylistic/eol-last': 2,

  // import 관련 규칙
  'import/order': [
    2,
    {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling'],
        'index',
        'type',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
  'import/no-duplicates': 2,
  'import/no-extraneous-dependencies': 2,
  'import/consistent-type-specifier-style': [2, 'prefer-top-level'],

  // node 관련 규칙
  'n/no-deprecated-api': 2,
  'n/no-missing-import': 'off',
  'n/no-unpublished-import': 'off',

  // 저작권 고지
  'notice/notice': [
    2,
    {
      mustMatch: 'Copyright',
      templateFile: path.join(__dirname, 'copyright.js'),
      onNonMatchingHeader: 'prepend',
    },
  ],
};

// 테스트 파일에만 적용할 규칙
const testRules = {
  ...baseRules,
  '@typescript-eslint/no-explicit-any': 'off',
  'no-console': 'off',
};

// 타입스크립트 설정 (공통)
const tsLanguageOptions = {
  parser: tsParser,
  ecmaVersion: 2022,
  sourceType: 'module',
};

// 타입스크립트 설정 (타입 체크 포함)
const tsLanguageOptionsWithProject = {
  ...tsLanguageOptions,
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.eslint.json'),
  },
};

export default [
  // 파일 무시 설정
  {
    ignores,
  },

  // 모든 타입스크립트 파일에 적용할 기본 규칙
  {
    files: ['**/*.ts'],
    plugins,
    languageOptions: tsLanguageOptions,
    rules: baseRules,
  },

  // 타입체크가 필요한 소스 파일
  {
    files: ['src/**/*.ts'],
    languageOptions: tsLanguageOptionsWithProject,
    rules: {
      ...baseRules,
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // 테스트 파일
  {
    files: ['**/tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: tsLanguageOptionsWithProject,
    rules: testRules,
  },

  // 설정 파일
  {
    files: ['*.config.ts', '.*.config.ts', 'config/**/*.ts'],
    languageOptions: tsLanguageOptionsWithProject,
    rules: {
      ...baseRules,
      'no-console': 'off',
    },
  },
];
