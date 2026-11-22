module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  overrides: [
    {
      files: ['src/visual-engine/**/*.{ts,tsx}'],
      rules: {
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      // Preserve the upstream React Bits implementations and their permissive
      // effect parameter types; host integration code keeps the normal rules.
      files: ['src/visual-engine/effects/providers/reactbits/**/*.{ts,tsx}'],
      rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': 'off' },
    },
    {
      // Context modules and render-helper modules intentionally export hooks and
      // helpers alongside components. Fast Refresh still reloads these files.
      files: [
        'scripts/fixtures/**/*.{ts,tsx}',
        'src/components/LinkCell.tsx',
        'src/components/panelComponents/TabPanel/UnifiedTabPanel.tsx',
        'src/context/General.context.tsx',
        'src/utils/linkSupport.tsx',
      ],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
