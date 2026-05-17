import { defineConfig } from 'orval'

export default defineConfig({
  hotel: {
    input: 'http://localhost:8080/v3/api-docs',
    output: {
      mode: 'tags-split',
      target: './src/services',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/axios.ts',
          name: 'customInstance',
        },
      },
    },
  },
})