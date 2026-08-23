import { execSync } from 'child_process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { r, port, isDev } from './utils'

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = [
    // "options",
    'popup'
  ]

  for (const view of views) {
    await fs.ensureDir(r(`extension/`))
    let data = await fs.readFile(r(`src/pages/${view}/index.html`), 'utf-8')
    data = data
      .replace(
        '"./main.jsx"',
        `"http://localhost:${port}/pages/${view}/main.jsx"`
        // `"./${view}.js"`
      )
      .replace(
        `<title>Tabs - Excited Gem</title>`,
        `<script type="module">
            import RefreshRuntime from "http://localhost:3303/@react-refresh";
            RefreshRuntime.injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
            window.__vite_plugin_react_preamble_installed__ = true;
          </script>`
      )
      .replace(
        '<div id="app"></div>',
        '<div id="app">Vite server did not start</div>'
      )
    await fs.writeFile(r(`extension/${view}.html`), data, 'utf-8')
  }
}
function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}

writeManifest()

if (isDev) {
  stubIndexHtml()
  chokidar.watch([r('src/**/*.html')]).on('change', () => {
    stubIndexHtml()
  })
  chokidar
    .watch([
      r('src/manifest.js'),
      r('src/manifest-loader.js'),
      r('package.json')
    ])
    .on('change', () => {
      writeManifest()
    })
}
