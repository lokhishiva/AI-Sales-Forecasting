const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SALES_DATA = {
  all: [142, 158, 171, 163, 185, 210, 198, 224, 238, 215, 252, 271, 260, 285, 305, 298, 320, 341],
  software: [62, 70, 77, 73, 85, 98, 91, 104, 110, 98, 118, 127, 120, 134, 145, 141, 152, 163],
  hardware: [48, 52, 57, 54, 60, 68, 64, 72, 78, 70, 82, 88, 84, 92, 100, 97, 104, 110],
  services: [32, 36, 37, 36, 40, 44, 43, 48, 50, 47, 52, 56, 56, 59, 60, 60, 64, 68]
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getCategorySummary(category) {
  const data = SALES_DATA[category] || SALES_DATA.all;
  const latest = data[data.length - 1];
  const previous = data[data.length - 2] || latest;
  const total = data.reduce((sum, value) => sum + value, 0);
  const average = total / data.length;
  const growth = ((latest - previous) / previous) * 100;

  return {
    latest,
    previous,
    average: average.toFixed(1),
    total: total.toFixed(0),
    growth: growth.toFixed(1)
  };
}

function buildAssistantReply(prompt = '', category = 'all') {
  const normalizedPrompt = (prompt || '').toLowerCase();
  const label = category === 'all' ? 'all product categories' : category;
  const summary = getCategorySummary(category);

  let focus = 'overall sales momentum';
  if (normalizedPrompt.includes('hardware')) {
    focus = 'hardware conversion and inventory pacing';
  } else if (normalizedPrompt.includes('software')) {
    focus = 'software adoption and renewals';
  } else if (normalizedPrompt.includes('service')) {
    focus = 'service capacity and support demand';
  } else if (normalizedPrompt.includes('season')) {
    focus = 'seasonality optimization';
  } else if (normalizedPrompt.includes('forecast')) {
    focus = 'forecast accuracy and planning';
  }

  const recommendation =
    category === 'hardware'
      ? 'Increase field sales outreach and bundle maintenance plans to lift slower hardware growth.'
      : category === 'software'
        ? 'Push upsell and expansion campaigns to capitalize on the strongest recurring demand.'
        : category === 'services'
          ? 'Align support staffing and service bundles with the steadily rising demand trend.'
          : 'Balance investment across all categories while favoring the strongest growth channels.';

  const insightText = `Based on the ${label} outlook, the latest period is tracking at $${summary.latest}K, with a ${summary.growth}% change versus the prior month. The moving average is $${summary.average}K and your current model suggests the strongest opportunity is in ${focus}. ${recommendation}`;

  return {
    category,
    summary,
    reply: `AI Assistant: ${insightText}`,
    recommendation,
    focus
  };
}

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[extension] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    try {
      const body = await readRequestBody(req);
      const prompt = String(body.prompt || '');
      const category = String(body.category || 'all');
      const response = buildAssistantReply(prompt, category);
      sendJson(res, 200, response);
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Bad request' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', message: 'SalesCast AI backend is running.' });
    return;
  }

  const safePath = path.normalize(url.pathname).replace(/^\/+/, '');
  const filePath = safePath ? path.join(ROOT, safePath) : path.join(ROOT, 'index.html');

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStaticFile(res, filePath);
    return;
  }

  if (safePath === '' || safePath === '/' || safePath === 'index.html') {
    serveStaticFile(res, path.join(ROOT, 'index.html'));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`SalesCast AI backend running at http://localhost:${PORT}`);
});
