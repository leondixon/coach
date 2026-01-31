import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
    vue: true,
    jsonc: true,
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
  },
  {
    files: ['**/*.json', '**/*.jsonc'],
    rules: {
      'style/object-curly-newline': [
        'error',
        {
          ObjectExpression: { minProperties: 1, multiline: true },
          ObjectPattern: { multiline: true },
        },
      ],
      'style/object-property-newline': [
        'error',
        {
          allowAllPropertiesOnSameLine: false,
        },
      ],
    },
  },
)
