import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3080',

    setupNodeEvents(on, config) {},
  },
});
