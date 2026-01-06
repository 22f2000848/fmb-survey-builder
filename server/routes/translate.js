const express = require('express');
const http = require('http');
const https = require('https');

const router = express.Router();

const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL || 'https://libretranslate.de/translate';
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY || '';

router.post('/', (req, res) => {
  const { text, source = 'en', target } = req.body || {};

  if (!text || !target) {
    return res.status(400).json({ error: 'Missing text or target language' });
  }

  let url;
  try {
    url = new URL(TRANSLATE_API_URL);
  } catch (error) {
    return res.status(500).json({ error: 'Invalid translation API URL' });
  }

  const payload = {
    q: text,
    source,
    target,
    format: 'text'
  };

  if (TRANSLATE_API_KEY) {
    payload.api_key = TRANSLATE_API_KEY;
  }

  const body = JSON.stringify(payload);

  const transport = url.protocol === 'http:' ? http : https;
  const request = transport.request(
    {
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return res.status(502).json({ error: 'Translation failed', message: data });
        }

        try {
          const parsed = JSON.parse(data);
          const translatedText = parsed.translatedText || parsed.translation || '';
          return res.json({ translatedText });
        } catch (error) {
          return res.status(502).json({ error: 'Translation failed', message: 'Invalid response' });
        }
      });
    }
  );

  request.on('error', (error) => {
    res.status(502).json({ error: 'Translation failed', message: error.message });
  });

  request.write(body);
  request.end();
});

module.exports = router;
