import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    env: {
      DATA_DIR: path.resolve('./tests/fixtures'),
    },
  },
});
