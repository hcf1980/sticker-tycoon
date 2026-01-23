function parseAllowedOrigins() {
  const raw = process.env.WEB_ALLOWED_ORIGINS;

  if (!raw) {
    return new Set(['http://localhost:8888', 'http://localhost:3000']);
  }

  return new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

function getCorsOrigin(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  if (!origin) {
    return null;
  }

  const allowed = parseAllowedOrigins();
  if (!allowed.has(origin)) {
    return null;
  }

  return origin;
}

function buildCorsHeaders(event, options = {}) {
  const {
    allowMethods = 'GET, POST, PUT, OPTIONS',
    allowHeaders = 'Content-Type, Authorization'
  } = options;

  const origin = getCorsOrigin(event);

  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': allowMethods
  };
}

function handleCorsPreflight(event, options = {}) {
  if (event.httpMethod !== 'OPTIONS') {
    return null;
  }

  const headers = buildCorsHeaders(event, options);

  // 未在白名單：直接擋掉（避免被當成開放 API 使用）
  if (!headers['Access-Control-Allow-Origin']) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ error: 'CORS blocked' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: ''
  };
}

module.exports = {
  buildCorsHeaders,
  handleCorsPreflight
};
