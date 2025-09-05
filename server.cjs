const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 3000,
  JWT_SECRET = 'changeme',
  DEMO_USER = 'apiuser',
  DEMO_PASS = 'apipass',
  LT_URL = 'https://libretranslate.de' // เปลี่ยนเป็น upstream ของคุณได้
} = process.env;

// --- auth ---
app.post('/auth/token', (req, res) => {
  const { user, pass } = req.body || {};
  if (user === DEMO_USER && pass === DEMO_PASS) {
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'invalid credentials' });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.replace(/^Bearer\s+/i, '');
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

// --- translate proxy ---
app.post('/translate', auth, async (req, res) => {
  try {
    const { text, source, target } = req.body || {};
    if (!text || !source || !target) {
      return res.status(400).json({ error: 'missing text/source/target' });
    }

    const r = await fetch(`${LT_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text'
      })
    });
    const d = await r.json();
    // รองรับชื่อ field หลายแบบ
    const out = d.translatedText || d.translated || d.result || d.text || '';
    res.json({ translatedText: out, raw: d });
  } catch (e) {
    res.status(500).json({ error: e.message || 'translate failed' });
  }
});

app.get('/', (_req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
});
