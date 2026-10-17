// Colours come from src/styles/tokens.css only (plans/01 §4.7).
export default {
  ignoreFiles: ['src/styles/tokens.css', 'dist/**', 'node_modules/**'],
  overrides: [{ files: ['**/*.vue'], customSyntax: 'postcss-html' }],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'lab'],
  },
}
