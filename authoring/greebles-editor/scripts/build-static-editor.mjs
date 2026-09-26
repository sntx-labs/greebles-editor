import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'customer-editor');

function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, '<\\/script');
}

function buildStaticRuntimeSource(source) {
  return source.replace(
    "mainSourcePromise = fetch(new URL('./main.js', import.meta.url)).then((response) => response.text());",
    "mainSourcePromise = Promise.resolve(window.__GREEBLES_MAIN_SOURCE__ || '');"
  );
}

async function load(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

const [mainSource, styleSource, shPanelStyleSource, shPanelSource] = await Promise.all([
  load('src/main.js'),
  load('src/style.css'),
  load('sh-panel.css'),
  load('sh-panel.js'),
]);

const staticRuntimeSource = buildStaticRuntimeSource(mainSource);

const inlineStyles = [styleSource, shPanelStyleSource].join('\n\n');
const shellStyles = `
  :root {
    --bg: #090907;
    --surface: rgba(15, 15, 12, 0.88);
    --surface-strong: rgba(21, 21, 17, 0.96);
    --line: rgba(255, 174, 0, 0.22);
    --line-soft: rgba(0, 204, 255, 0.16);
    --text: #f6efc5;
    --text-dim: #b8ad7a;
    --accent: #ffae00;
    --accent-dim: #00ccff;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, rgba(255, 174, 0, 0.08), transparent 30%),
      radial-gradient(circle at bottom right, rgba(0, 204, 255, 0.08), transparent 28%),
      linear-gradient(180deg, #0b0b08 0%, #070705 100%);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  body {
    padding: 32px;
  }

  .shell {
    max-width: 1040px;
    margin: 0 auto;
  }

  .hero {
    position: relative;
    overflow: hidden;
    padding: 28px 30px;
    border: 1px solid var(--line);
    background:
      linear-gradient(135deg, rgba(255, 174, 0, 0.06), transparent 45%),
      linear-gradient(225deg, rgba(0, 204, 255, 0.05), transparent 35%),
      var(--surface-strong);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  }

  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 14px;
  }

  h1 {
    margin: 0 0 12px;
    font-size: clamp(30px, 5vw, 54px);
    line-height: 0.96;
    letter-spacing: -0.04em;
  }

  .subtitle {
    max-width: 680px;
    margin: 0;
    color: var(--text-dim);
    font-size: 16px;
    line-height: 1.6;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 18px;
    margin-top: 22px;
  }

  .card {
    padding: 18px;
    border: 1px solid var(--line-soft);
    background: var(--surface);
  }

  .card h2, .card h3 {
    margin: 0 0 10px;
    font-size: 15px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .card p, .card li {
    color: var(--text-dim);
    line-height: 1.65;
    font-size: 14px;
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    padding: 0 18px;
    border: 1px solid var(--line);
    color: var(--text);
    text-decoration: none;
    background: rgba(255, 174, 0, 0.08);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 700;
  }

  .button.secondary {
    border-color: var(--line-soft);
    background: rgba(0, 204, 255, 0.06);
  }

  .section {
    margin-top: 20px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(10, 10, 8, 0.78);
  }

  .section h2 {
    margin: 0 0 14px;
    font-size: 20px;
    letter-spacing: -0.02em;
  }

  .steps {
    display: grid;
    gap: 12px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .steps li {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 12px;
    align-items: start;
  }

  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--line);
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
  }

  .code-block {
    margin-top: 12px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.28);
    color: #ddd5aa;
    font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .footer-note {
    margin-top: 18px;
    color: #857b53;
    font-size: 12px;
    line-height: 1.6;
  }
`;

function wrapPage(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${shellStyles}</style>
</head>
<body>
  <main class="shell">
${body}
  </main>
</body>
</html>`;
}

const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>greebles_001 Editor</title>
  <style>
${inlineStyles}
  </style>
</head>
<body>
  <div id="app">
    <div id="stage">
      <canvas id="canvas"></canvas>
    </div>
    <div id="controls"></div>
  </div>
  <script>
    window.__GREEBLES_MAIN_SOURCE__ = ${escapeInlineScript(JSON.stringify(staticRuntimeSource))};
    window.__GREEBLES_STATIC_CUSTOMER__ = true;
  </script>
  <script>
${escapeInlineScript(shPanelSource)}
  </script>
  <script>
${escapeInlineScript(staticRuntimeSource)}
  </script>
</body>
</html>
`;

const startHereHtml = wrapPage('greebles_001 Start Here', `
    <section class="hero">
      <div class="eyebrow">greebles_001 / Customer Editor</div>
      <h1>Open. Tweak. Paste.</h1>
      <p class="subtitle">
        This package is designed for non-technical designers and creative developers. No terminal, npm, or localhost is required.
        Open the editor, art-direct the greebles, then copy a self-contained embed into your site.
      </p>
      <div class="cta-row">
        <a class="button" href="./OPEN-ME.html">Open Editor</a>
        <a class="button secondary" href="./README.html">Read Quickstart</a>
      </div>
      <div class="grid">
        <article class="card">
          <h3>Best For</h3>
          <p>Hero sections, moody page backdrops, sci-fi interface surfaces, and landing page texture systems.</p>
        </article>
        <article class="card">
          <h3>Main Export</h3>
          <p><strong>Copy Iframe Embed</strong> gives you a self-contained <code>srcdoc</code> snippet that does not depend on any hosted assets.</p>
        </article>
        <article class="card">
          <h3>Backup Path</h3>
          <p>If your site builder rejects large inline embeds, use <strong>Download Standalone HTML</strong> and host or reference that file instead.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2>Fastest Workflow</h2>
      <ol class="steps">
        <li><span class="step-num">1</span><div>Open <code>OPEN-ME.html</code> and adjust colors, density, glow, and motion.</div></li>
        <li><span class="step-num">2</span><div>Set the embed height that matches the section you are designing.</div></li>
        <li><span class="step-num">3</span><div>Use <strong>Copy Iframe Embed</strong> to paste directly into Webflow, Framer, or a custom site.</div></li>
        <li><span class="step-num">4</span><div>If the builder is strict about code size, use <strong>Download Standalone HTML</strong> as the fallback deliverable.</div></li>
      </ol>
    </section>

    <p class="footer-note">Included in this package: editor, quickstart, examples, license, and export workflow notes.</p>
`);

const readmeHtml = wrapPage('greebles_001 Quickstart', `
    <section class="hero">
      <div class="eyebrow">Quickstart</div>
      <h1>How To Use greebles_001</h1>
      <p class="subtitle">
        <code>greebles_001</code> is a sci-fi greeble background generator for websites. The editor is local and self-contained. The exported embed is also self-contained.
      </p>
    </section>

    <section class="section">
      <h2>Included Files</h2>
      <div class="grid">
        <article class="card">
          <h3>START-HERE.html</h3>
          <p>Simple landing page with the fastest path into the product.</p>
        </article>
        <article class="card">
          <h3>OPEN-ME.html</h3>
          <p>The actual editor. Open this file to customize the greebles.</p>
        </article>
        <article class="card">
          <h3>examples/</h3>
          <p>Starter snippets and notes for integrating the exported embed into common site builders.</p>
        </article>
        <article class="card">
          <h3>LICENSE.txt</h3>
          <p>Commercial-use summary and redistribution restrictions for the deliverable.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2>Export Options</h2>
      <div class="grid">
        <article class="card">
          <h3>Copy Iframe Embed</h3>
          <p>Primary export. Produces a self-contained iframe with an inline <code>srcdoc</code> document. Best for Webflow embeds, Framer embeds, and quick placement.</p>
        </article>
        <article class="card">
          <h3>Download Standalone HTML</h3>
          <p>Fallback export. Produces a single HTML file containing the greeble scene with your current settings baked in.</p>
        </article>
        <article class="card">
          <h3>Copy Config JSON</h3>
          <p>Utility export. Useful for versioning a look, sharing internal presets, or storing approved art direction settings.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2>Builder Notes</h2>
      <div class="grid">
        <article class="card">
          <h3>Webflow</h3>
          <p>Paste the iframe export into an Embed block. Set the surrounding section height so the iframe has room to render.</p>
        </article>
        <article class="card">
          <h3>Framer</h3>
          <p>Use an Embed component or HTML block, then paste the iframe export. Adjust the frame height to match your design.</p>
        </article>
        <article class="card">
          <h3>Custom Sites</h3>
          <p>Paste the iframe snippet into your markup, or host the standalone HTML file if you prefer referencing a separate page.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2>Recommended First Move</h2>
      <p class="subtitle">Start with a preset, then only change these four things:</p>
      <ol class="steps">
        <li><span class="step-num">1</span><div>Background and panel fill colors</div></li>
        <li><span class="step-num">2</span><div>Density and panel spacing</div></li>
        <li><span class="step-num">3</span><div>Glow strength</div></li>
        <li><span class="step-num">4</span><div>Embed height</div></li>
      </ol>
    </section>
`);

const readmeText = `greebles_001 static editor

Open START-HERE.html to begin.
Open OPEN-ME.html to use the editor.
Read README.html for quickstart documentation.
`;

const licenseText = `greebles_001 License Summary

You may:
- Use this product in personal and commercial projects
- Use it in client work
- Export and embed generated outputs on websites and marketing pages
- Modify the files for your own projects

You may not:
- Resell or redistribute this package as-is
- Share the source package publicly or privately as a competing product
- Claim authorship of the original package
- Repackage the editor or source as your own template/tool for sale

This license summary is intended as a practical product-use guide for purchasers.
`;

const webflowExample = `Webflow Embed Example

1. Add an Embed block to the section where you want the background.
2. Paste the code copied from "Copy Iframe Embed".
3. Make sure the parent section has an explicit height or min-height.

Suggested wrapper:

<section style="position:relative;min-height:720px;overflow:hidden;">
  PASTE_IFRAME_EMBED_HERE
</section>
`;

const framerExample = `Framer Embed Example

1. Insert an Embed component.
2. Paste the code copied from "Copy Iframe Embed".
3. Set the frame height to match the exported embed height.

Suggested wrapper:

<div style="width:100%;min-height:720px;overflow:hidden;">
  PASTE_IFRAME_EMBED_HERE
</div>
`;

const exportsNote = `Export folder

Use this folder to store:
- downloaded standalone HTML exports
- saved config JSON files
- approved client variations
`;

await mkdir(outputDir, { recursive: true });
await mkdir(path.join(outputDir, 'examples'), { recursive: true });
await mkdir(path.join(outputDir, 'exports'), { recursive: true });
await writeFile(path.join(outputDir, 'index.html'), staticHtml, 'utf8');
await writeFile(path.join(outputDir, 'OPEN-ME.html'), staticHtml, 'utf8');
await writeFile(path.join(outputDir, 'START-HERE.html'), startHereHtml, 'utf8');
await writeFile(path.join(outputDir, 'README.html'), readmeHtml, 'utf8');
await writeFile(path.join(outputDir, 'README.txt'), readmeText, 'utf8');
await writeFile(path.join(outputDir, 'LICENSE.txt'), licenseText, 'utf8');
await writeFile(path.join(outputDir, 'examples', 'webflow-embed-example.txt'), webflowExample, 'utf8');
await writeFile(path.join(outputDir, 'examples', 'framer-embed-example.txt'), framerExample, 'utf8');
await writeFile(path.join(outputDir, 'exports', 'YOUR-EXPORTS-GO-HERE.txt'), exportsNote, 'utf8');

console.log(`Static editor written to ${outputDir}`);
