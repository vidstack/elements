import { esbuild as maverick } from '@maverick-js/compiler';
import { defineConfig, type Options } from 'tsup';

const SERVER_CONFIG = dist({ dev: false, server: true, hydrate: false }),
  DEV_CONFIG = dist({ dev: true, server: false, hydrate: true }),
  PROD_CONFIG = dist({ dev: false, server: false, hydrate: true }),
  CDN_DEV_CONFIG = cdn({ dev: true }),
  CDN_PROD_CONFIG = cdn({ dev: false });

interface BundleOptions {
  dev: boolean;
  server: boolean;
  hydrate: boolean;
}

function dist({ dev, server, hydrate }: BundleOptions): Options {
  return {
    entry: {
      index: 'src/index.ts',
      elements: 'src/elements.ts',
    },
    format: server ? ['esm', 'cjs'] : 'esm',
    external: ['maverick.js', 'hls.js'],
    clean: false,
    treeshake: true,
    bundle: true,
    tsconfig: 'tsconfig.build.json',
    target: server ? 'node16' : 'esnext',
    platform: server ? 'node' : 'browser',
    outDir: server ? 'dist/server' : dev ? 'dist/dev' : 'dist/prod',
    define: {
      __DEV__: dev ? 'true' : 'false',
      __SERVER__: server ? 'true' : 'false',
      __TEST__: 'false',
    },
    esbuildPlugins: [
      // @ts-expect-error - symlink error (ignore)
      maverick({
        include: 'src/**/*.tsx',
        generate: server ? 'ssr' : 'dom',
        hydratable: hydrate,
        diffArrays: false,
      }),
    ],
    esbuildOptions(opts) {
      if (!dev && !server) opts.mangleProps = /^_/;
      opts.conditions = dev ? ['development', 'production', 'default'] : ['production', 'default'];
      opts.chunkNames = 'chunks/[name]-[hash]';
    },
  };
}

function cdn({ dev = false } = {}): Options {
  return {
    ...dist({ dev, server: false, hydrate: false }),
    entry: { [dev ? 'dev' : 'prod']: 'src/cdn.ts' },
    target: 'es2020',
    minify: !dev,
    noExternal: ['maverick.js'],
    outDir: `dist/cdn`,
  };
}

export default defineConfig([
  SERVER_CONFIG,
  DEV_CONFIG,
  PROD_CONFIG,
  CDN_DEV_CONFIG,
  CDN_PROD_CONFIG,
]);
