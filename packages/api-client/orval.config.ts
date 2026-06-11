import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../../apps/api/docs/swagger.json',
    output: {
      mode: 'tags-split',
      target: 'src/endpoints',
      schemas: 'src/model',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: './src/mutator/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
