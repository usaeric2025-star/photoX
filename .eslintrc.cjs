module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react-hooks'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-restricted-imports': [
      'error',
      {
        'paths': [
          {
            'name': 'react-virtuoso',
            'message': '❌ 禁止直接引用 react-virtuoso。请使用 @/components/virtualizer/VirtualGrid'
          }
        ]
      }
    ],
    'no-restricted-syntax': [
      'error',
      {
        'selector': "VariableDeclarator[init.callee.name='useStore'][init.arguments.length=0]",
        'message': '禁止解构 useStore，请使用精确订阅：useStore(s => s.xxx)'
      }
    ]
  },
};
