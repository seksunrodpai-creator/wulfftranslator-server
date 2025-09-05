const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // สำคัญ: ใช้ v2

const app = express();
app.use(cors());
app.use(express.json());

const LT_ENDPOINTS = [
  'https://translate.astian.org',
  'https://translate.argosopentech.com',
  'https://libretranslate.de',
];

app.get('/', (_req, res) => {
  res.json({ ok: true, endpoints: LT_ENDPOINTS, time: new Date().toISOString() });
});

async function translateViaAnyEndpoint(payload) {
  let lastError = null;
  for (const base of LT_ENDPOINTS) {
    try {
      const url = `${base.replace(/\/$/, '')}/translate`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return data;
      lastError = { status: r.status, data, url };
    } catch (e) {
      lastError = { error: String(e), url: base };
    }
  }
  throw lastError || new Error('All endpoints failed');
}

app.post('/translate', async (req, res) => {
  try {
    const { text, source, target } = req.body || {};
    if (!text || !source || !target) {
      return res.status(400).json({ error: 'Missing text/source/target' });
    }
    const payload = { q: text, text, source, target, format: 'text' };
    const data = await translateViaAnyEndpoint(payload);
    const translated = data?.translatedText || data?.translated || data?.result || data;
    return res.json({ translatedText: translated });
  } catch (err) {
    return res.status(502).json({ error: 'LT failed', details: err });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
