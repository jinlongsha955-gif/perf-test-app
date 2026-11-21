// perf-test-app: zero-dependency Node test service for Render / Railway free tiers.
// Only uses Node built-ins (http, os). No npm install needed.
//
// Endpoints:
//   GET /            -> JSON: platform, hostname, uptime, memory, cpu count
//   GET /health      -> "ok" (plain text, cheapest possible check)
//   GET /compute?n=  -> CPU-bound prime sieve up to n (n capped 1k..2M), returns ms
//   GET /env         -> only platform-identifying env presence (no secret values)
const http = require('http');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const startedAt = Date.now();

function platform() {
  if (process.env.RENDER) return 'render';
  if (process.env.RAILWAY_ENVIRONMENT) return 'railway';
  return 'unknown';
}

function info() {
  const mem = process.memoryUsage();
  return {
    service: 'perf-test-app',
    platform: platform(),
    hostname: os.hostname(),
    node: process.version,
    cpus: os.cpus().length,
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    time_utc: new Date().toISOString(),
    memory: {
      rss_mb: +(mem.rss / 1048576).toFixed(1),
      heapUsed_mb: +(mem.heapUsed / 1048576).toFixed(1),
      heapTotal_mb: +(mem.heapTotal / 1048576).toFixed(1),
    },
    env: {
      RENDER: !!process.env.RENDER,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || null,
      PORT: process.env.PORT || null,
    },
  };
}

// Sieve of Eratosthenes up to n; returns count of primes. CPU-bound, memory-light.
function primeCount(n) {
  const sieve = new Uint8Array(n + 1);
  sieve.fill(1);
  sieve[0] = 0;
  sieve[1] = 0;
  for (let i = 2; i * i <= n; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= n; j += i) sieve[j] = 0;
    }
  }
  let c = 0;
  for (let i = 2; i <= n; i++) if (sieve[i]) c++;
  return c;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const path = u.pathname;
  res.setHeader('Content-Type', 'application/json');
  if (path === '/' || path === '/info') {
    res.end(JSON.stringify(info(), null, 2));
  } else if (path === '/health') {
    res.setHeader('Content-Type', 'text/plain');
    res.end('ok');
  } else if (path === '/compute') {
    let n = parseInt(u.searchParams.get('n') || '200000', 10);
    if (!Number.isFinite(n)) n = 200000;
    n = Math.max(1000, Math.min(n, 2000000)); // cap: never hang a tiny instance
    const t0 = Date.now();
    const count = primeCount(n);
    const ms = Date.now() - t0;
    res.end(JSON.stringify({ n, primes: count, ms, ...info() }));
  } else if (path === '/env') {
    res.end(JSON.stringify(info().env, null, 2));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found', path }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`perf-test-app listening on ${HOST}:${PORT} platform=${platform()}`);
});
