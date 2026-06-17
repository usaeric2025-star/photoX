module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react-hooks', 'react-compiler'],
  rules: {
    'react-compiler/react-compiler': 'error',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
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
  overrides: [
    {
      files: ['src/components/photo/PhotoCard.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            'selector': "CallExpression[callee.name='useUIStore'] > ArrowFunctionExpression[body.type='MemberExpression'][body.property.name='selectedIds']",
            'message': '❌ PhotoCard 禁止直接订阅 selectedIds 数组。请使用精确的 boolean 订阅（例如：useUIStore(s => s.selectedIds.includes(photo.id))）以避免不必要的重渲染卡顿。'
          },
          {
            'selector': "CallExpression[callee.name='useUIStore'] > ArrowFunctionExpression[body.type='ObjectExpression'] Property[key.name='selectedIds']",
            'message': '❌ PhotoCard 禁止返回含有 selectedIds 的对象。请使用精确的 boolean 订阅以避免不必要的重渲染卡顿。'
          }
        ]
      }
    }
  ]
};
