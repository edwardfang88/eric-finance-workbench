const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://example.com/',
  runScripts: 'outside-only',
  resources: 'usable'
});
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.fetch = () => Promise.resolve({ ok: false });
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
try {
  window.eval(app);
  console.log('OK: app.js evaluated without runtime errors');
  process.exit(0);
} catch (e) {
  console.error('FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
