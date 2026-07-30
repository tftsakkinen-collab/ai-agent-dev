const { spawn } = require('child_process');

async function checkUrl(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function runSmoke() {
  const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
  const startLocal = process.env.SMOKE_START_LOCAL === 'true';
  let serverProcess = null;

  const alreadyRunning = await checkUrl(`${baseUrl}/api/products`);

  if (startLocal && !alreadyRunning) {
    console.log('[Smoke] Starting local server...');
    serverProcess = spawn('node', ['server/index.js'], { stdio: 'ignore' });

    // Wait for server to start
    for (let i = 0; i < 15; i++) {
      if (await checkUrl(`${baseUrl}/api/products`)) {
        console.log('[Smoke] Server is ready!');
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  try {
    console.log(`[Smoke] Testing ${baseUrl}/api/products...`);
    const res = await fetch(`${baseUrl}/api/products`);
    if (!res.ok) throw new Error(`Products endpoint failed with status ${res.status}`);
    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');
    console.log(`- Products OK (${products.length} items)`);

    console.log(`[Smoke] Testing ${baseUrl}/api/categories...`);
    const catRes = await fetch(`${baseUrl}/api/categories`);
    if (!catRes.ok) throw new Error(`Categories endpoint failed with status ${catRes.status}`);
    console.log(`- Categories OK`);

    console.log('[Smoke] All smoke checks passed successfully!');
  } finally {
    if (serverProcess) {
      console.log('[Smoke] Terminating spawned local server...');
      serverProcess.kill();
    }
  }
}

runSmoke().catch((err) => {
  console.error('[Smoke Error]', err.message);
  process.exit(1);
});
