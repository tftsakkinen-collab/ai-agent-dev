const express = require('express');
const path = require('path');

const app = express();
const port = process.env.WEB_PREVIEW_PORT || 4173;
const apiBaseUrl = process.env.WEB_PREVIEW_API_BASE_URL || 'http://127.0.0.1:3000';
const distDir = path.join(__dirname, '..', 'dist');

app.use(express.json());

app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${apiBaseUrl}${req.originalUrl}`;
    const headers = { Accept: 'application/json' };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type');

    if (contentType) {
      res.set('content-type', contentType);
    }

    res.status(response.status).send(text);
  } catch (error) {
    res.status(502).json({ error: 'Preview API proxy failed', details: error.message });
  }
});

app.use(express.static(distDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Stable web preview running on http://localhost:${port}`);
});