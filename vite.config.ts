import { vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';

// Load environment variables from multiple files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

export default defineConfig((config) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    // Suppress warnings about Node.js modules being externalized (this is expected behavior)
    logLevel: 'warn',
    customLogger: {
      ...console,
      warn: (msg: string, options?: any) => {
        // Suppress specific warnings about Node.js modules being externalized
        if (typeof msg === 'string' && msg.includes('has been externalized for browser compatibility')) {
          return;
        }
        console.warn(msg, options);
      },
    } as any,
    // Exclude server-only dependencies from client optimization
    optimizeDeps: {
      exclude: ['undici', '@remix-run/node'],
      esbuildOptions: {
        plugins: [
          {
            name: 'fix-util-types-esbuild',
            setup(build) {
              build.onResolve({ filter: /^node:util\/types$/ }, () => {
                return { path: 'node:util', external: false };
              });
              build.onResolve({ filter: /util\/types$/ }, () => {
                return { path: 'node:util', external: false };
              });
            },
          },
        ],
      },
    },
    build: {
      target: 'esnext',
      // Only generate sourcemaps in development, use 'hidden' for production if needed for debugging
      sourcemap: config.mode === 'development' ? true : false,
      rollupOptions: {
        output: {
          // Exclude source content from source maps to avoid resolution errors
          sourcemapExcludeSources: config.mode === 'production',
        },
      },
    },
    plugins: [
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream', 'path'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
        protocolImports: true,
        exclude: ['child_process', 'fs'],
      }),
      {
        name: 'buffer-polyfill',
        transform(code, id) {
          if (id.includes('env.mjs')) {
            return {
              code: `import { Buffer } from 'buffer';\n${code}`,
              map: null,
            };
          }

          return null;
        },
      },
      {
        name: 'fix-util-types',
        enforce: 'pre', // Run before other plugins
        resolveId(id, importer) {
          // Handle node:util/types and util/types imports
          if (id === 'node:util/types' || id === 'util/types' || id.endsWith('/util/types')) {
            return { id: 'node:util', external: false };
          }
          return null;
        },
        load(id) {
          // Handle direct file access to util/types
          if (id.includes('util/types') && !id.includes('node_modules/util')) {
            return "export * from 'node:util';";
          }
          return null;
        },
        transform(code, id) {
          // Replace require('node:util/types') with require('node:util')
          if (code.includes("require('node:util/types')") || code.includes('require("node:util/types")')) {
            return {
              code: code.replace(/require\(['"]node:util\/types['"]\)/g, "require('node:util')"),
              map: null,
            };
          }
          // Also handle import statements
          if (code.includes("from 'node:util/types'") || code.includes('from "node:util/types"')) {
            return {
              code: code.replace(/from ['"]node:util\/types['"]/g, "from 'node:util'"),
              map: null,
            };
          }
          return null;
        },
      },
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
    envPrefix: [
      'VITE_',
      'OPENAI_LIKE_API_BASE_URL',
      'OPENAI_LIKE_API_MODELS',
      'OLLAMA_API_BASE_URL',
      'LMSTUDIO_API_BASE_URL',
      'TOGETHER_API_BASE_URL',
    ],
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    test: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/preview/**', // Exclude preview tests that require Playwright
      ],
    },
  };
});

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}