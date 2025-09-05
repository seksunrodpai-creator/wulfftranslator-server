// server.cjs
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DEMO_USER = process.env.DEMO_USER || 'apiuser';
const DEMO_PASS = process.env.DEMO_PASS || 'apipass';
const LT_URL = process.env.LT_URL || 'https://libretranslate.com/translate';

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.post('/auth/token', (req, res) => {
  const { user, pass } = req.body || {};
  if (user !== DEMO_USER || pass !== DEMO_PASS) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = jwt.sign({ u: user }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// middleware ตรวจ token
function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'missing token' });
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

app.post('/translate', requireAuth, async (req, res) => {
  try {
    const { text, source, target } = req.body || {};
    if (!text || !source || !target) {
      return res.status(400).json({ error: 'missing fields' });
    }

    // LibreTranslate ต้องใช้ q/source/target
    const payload = {
      q: text,
      source,
      target,
      format: 'text'
    };

    const r = await fetch(LT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('LT error', r.status, body);
      return res.status(502).json({ error: 'translator upstream error', status: r.status, body });
    }

    const data = await r.json();
    // บาง instance คืน { translatedText } บางที่คืน { translated }
    const out = data.translatedText || data.translated || '';
    return res.json({ translatedText: out });
  } catch (err) {
    console.error('SERVER ERROR:', err);
    return res.status(500).json({ error: 'internal', message: String(err && err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
});
