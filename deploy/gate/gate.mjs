// ARSM token gate: cloudflared -> gate (127.0.0.1:18081) -> nginx web (127.0.0.1:18080) -> API; cf-connecting-ip requests need GATE_TOKEN.
// GATE_MODE=azure gates every request, reads GATE_TOKEN from the environment and takes the last X-Forwarded-For entry as the client.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { GATE_PREFIX, LOGIN_PATH, loadGateAssets, renderGatePage } from './gate-page.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(HERE, 'logs');
const LOG_FILE = join(LOG_DIR, 'gate.log');
const MAX_LOG_BYTES = 256 * 1024;
const AZURE = process.env.GATE_MODE === 'azure';
const UPSTREAM_HOST = '127.0.0.1';
const HOST = AZURE ? (process.env.GATE_HOST ?? '127.0.0.1') : UPSTREAM_HOST;
const GATE_PORT = portFrom('GATE_PORT', 18081);
const UPSTREAM_PORT = portFrom('UPSTREAM_PORT', 18080);
const UPSTREAM = `${UPSTREAM_HOST}:${UPSTREAM_PORT}`;
// Outside Azure mode GATE_TOKEN lives in the gitignored project .env that GATE_ENV_FILE names.
const ENV_FILE = AZURE ? undefined : resolveEnvFile();
const COOKIE_NAME = '__Host-arsm_gate';
const COOKIE_LABEL = 'arsm-gate-v1';
const COOKIE_MAX_AGE_S = 30 * 24 * 3600;
const MIN_TOKEN_LENGTH = 32;
const MAX_FORM_BYTES = 4096;
const MAX_NEXT_LENGTH = 2048;
const PER_CLIENT = { max: 5, windowMs: 15 * 60_000 };
const OVERALL = { max: 50, windowMs: 60 * 60_000 };
const ROBOTS = 'noindex, nofollow';
const ASSET_CACHE_CONTROL = 'public, max-age=604800';
const GATE_HEADERS = Object.freeze({
  'cache-control': 'no-store',
  'x-robots-tag': ROBOTS,
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
});
// A single leading '/', then printable ASCII without \ " ' < >: same-site, a valid Location, inert in HTML.
const SAFE_NEXT = /^\/(?!\/)[\x21\x23-\x26\x28-\x3b\x3d\x3f-\x5b\x5d-\x7e]*$/;
// One IPv4/IPv6 address; duplicated (comma-joined) or odd values share one rate-limit bucket instead of minting new ones.
const SINGLE_IP = /^[0-9A-Fa-f:.]{2,45}$/;
const MISSING = 'missing';

// In Azure mode the token is read once from the environment and never changes.
let tokenState = AZURE ? describeToken(process.env.GATE_TOKEN ?? '', 'env') : describeToken('', undefined);
let logTokenChanges = false;
let logBytes = -1;
let upstreamDown = false;
let overallFailures = [];
const failuresByClient = new Map();

process.on('uncaughtException', (error) => fatal(error?.stack ?? String(error)));

/** Echoes a 'yyyy-MM-dd HH:mm:ss message' line; outside Azure mode it also goes to logs\gate.log. */
function log(message) {
  const line = `${timestamp(new Date())} ${message}`;
  console.log(line);
  if (AZURE) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    if (logBytes < 0) logBytes = statSync(LOG_FILE, { throwIfNoEntry: false })?.size ?? 0;
    if (logBytes > MAX_LOG_BYTES) {
      renameSync(LOG_FILE, `${LOG_FILE}.1`); // one previous generation
      logBytes = 0;
    }
    appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
    logBytes += Buffer.byteLength(line) + 1;
  } catch {
    // The console copy remains when the log file cannot be written.
  }
}

function timestamp(date) {
  const two = (value) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  return `${day} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

/** Logs the reason and exits with code 1, so the scheduled task's restart policy takes over. */
function fatal(reason) {
  log(`fatal: ${reason}`);
  process.exit(1);
}

function resolveEnvFile() {
  if (!process.env.GATE_ENV_FILE) fatal('GATE_ENV_FILE must name the .env file that holds GATE_TOKEN');
  return resolve(HERE, process.env.GATE_ENV_FILE);
}

function portFrom(name, fallback) {
  const port = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fatal(`${name} is not a TCP port number`);
  return port;
}

/** The token state for this request: one stat, and a re-read only when the mtime or size of the .env changed. */
function currentToken() {
  if (AZURE) return tokenState;
  const signature = envSignature();
  // A stat or read error other than a missing file keeps the last state and is retried on the next request.
  if (signature === null || signature === tokenState.signature) return tokenState;
  const token = signature === MISSING ? '' : readGateToken();
  if (token === null) return tokenState;
  const previous = tokenState;
  tokenState = describeToken(token, signature);
  if (logTokenChanges) logTokenChange(previous, tokenState);
  return tokenState;
}

function envSignature() {
  try {
    const { mtimeMs, size } = statSync(ENV_FILE);
    return `${mtimeMs}:${size}`;
  } catch (error) {
    return error.code === 'ENOENT' || error.code === 'ENOTDIR' ? MISSING : null;
  }
}

/** The last GATE_TOKEN value (KEY=VALUE lines and # comments, read the way deploy.py does), or null when unreadable. */
function readGateToken() {
  let text;
  try {
    text = readFileSync(ENV_FILE, 'utf8');
  } catch {
    return null;
  }
  let token = '';
  for (const line of text.split(/\r?\n/)) {
    const equals = line.indexOf('=');
    if (equals < 0 || line.trimStart().startsWith('#') || line.slice(0, equals).trim() !== 'GATE_TOKEN') continue;
    token = line.slice(equals + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return token;
}

/** The cookie value is an HMAC of the token, so a new token revokes every older cookie. */
function describeToken(token, signature) {
  const usable = token.length >= MIN_TOKEN_LENGTH;
  const cookie = usable ? createHmac('sha256', token).update(COOKIE_LABEL).digest('base64url') : '';
  return { signature, usable, token: usable ? token : '', cookie };
}

function logTokenChange(previous, next) {
  if (previous.usable && !next.usable) {
    log(`no GATE_TOKEN of at least ${MIN_TOKEN_LENGTH} characters in ${ENV_FILE} any more; remote requests get 503`);
  } else if (!previous.usable && next.usable) {
    log('GATE_TOKEN is usable now; remote requests need it');
  } else if (next.usable && previous.cookie !== next.cookie) {
    log('GATE_TOKEN changed; every older cookie is revoked');
  }
}

/** Constant-time comparison of SHA-256 digests, so even the length does not leak. */
function sameSecret(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return String(a).length > 0 && timingSafeEqual(x, y);
}

function readCookie(header, name) {
  for (const part of (header ?? '').split(';')) {
    const equals = part.indexOf('=');
    if (equals > 0 && part.slice(0, equals).trim() === name) return part.slice(equals + 1).trim();
  }
  return undefined;
}

function isRemote(req) {
  return AZURE || req.headers['cf-connecting-ip'] !== undefined;
}

function hasValidCookie(req, state) {
  return state.usable && sameSecret(readCookie(req.headers.cookie, COOKIE_NAME) ?? '', state.cookie);
}

/** Drops expired failures and empty client entries, so the map stays small however many IPs try. */
function pruneFailures(now) {
  overallFailures = overallFailures.filter((time) => now - time < OVERALL.windowMs);
  for (const [ip, times] of failuresByClient) {
    const live = times.filter((time) => now - time < PER_CLIENT.windowMs);
    if (live.length > 0) failuresByClient.set(ip, live);
    else failuresByClient.delete(ip);
  }
}

/** Whole seconds until both sliding windows allow another attempt from ip; 0 when one is allowed now. */
function retryAfterSeconds(ip, now) {
  pruneFailures(now);
  const clientWait = windowWaitMs(failuresByClient.get(ip) ?? [], PER_CLIENT, now);
  const waitMs = Math.max(clientWait, windowWaitMs(overallFailures, OVERALL, now));
  return waitMs > 0 ? Math.max(1, Math.ceil(waitMs / 1000)) : 0;
}

/** Time until a window (failure times in arrival order) holds fewer than its maximum again. */
function windowWaitMs(times, limit, now) {
  return times.length < limit.max ? 0 : times[times.length - limit.max] + limit.windowMs - now;
}

function recordFailure(ip, now) {
  const times = failuresByClient.get(ip);
  if (times) times.push(now);
  else failuresByClient.set(ip, [now]);
  overallFailures.push(now);
}

/** Every gate answer: the gate headers plus an exact Content-Length, so HEAD gets the same headers as GET. */
function send(res, status, headers, body = '') {
  res.writeHead(status, { ...GATE_HEADERS, ...headers, 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function sendPage(res, status, state, next, extraHeaders = {}) {
  const { html, csp } = renderGatePage(state, next);
  send(res, status, { ...extraHeaders, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': csp }, html);
}

function sendAsset(res, asset) {
  send(res, 200, { 'cache-control': ASSET_CACHE_CONTROL, 'content-type': asset.type }, asset.body);
}

function sendRedirect(res, location, setCookie) {
  send(res, 303, setCookie ? { location, 'set-cookie': setCookie } : { location });
}

function sendText(res, status, text) {
  send(res, status, { 'content-type': 'text/plain; charset=utf-8' }, text);
}

/** Remote requests, in order: gate assets, closed gate, form login, access link, valid cookie, locked page. */
function handleRemote(req, res) {
  const { path, query } = splitTarget(req.url);
  const asset = assets.get(path);
  if (asset && (req.method === 'GET' || req.method === 'HEAD')) return sendAsset(res, asset);
  const state = currentToken();
  if (!state.usable) return sendPage(res, 503, 'closed', '/');
  if (req.method === 'POST' && path === LOGIN_PATH && isFormBody(req)) {
    return readForm(req, (form) => attemptLogin(req, res, state, form.get('access') ?? '', form.get('next') ?? ''));
  }
  const params = new URLSearchParams(query);
  const unlocked = hasValidCookie(req, state);
  // A remote URL carrying access is never forwarded, so the token never reaches the nginx log or the SPA.
  if (params.has('access')) {
    const rest = `${path}${withoutAccess(query)}`;
    return unlocked ? sendRedirect(res, sanitizeNext(rest)) : attemptLogin(req, res, state, params.get('access'), rest);
  }
  if (unlocked) return forward(req, res);
  return sendPage(res, 401, 'locked', sanitizeNext(req.url));
}

function splitTarget(url = '/') {
  const mark = url.indexOf('?');
  return mark < 0 ? { path: url, query: '' } : { path: url.slice(0, mark), query: url.slice(mark + 1) };
}

/** The query without its access pairs (the others keep their exact encoding), with its '?' when any pair is left. */
function withoutAccess(query) {
  const kept = query.split('&').filter((pair) => pair !== '' && !new URLSearchParams(pair).has('access'));
  return kept.length > 0 ? `?${kept.join('&')}` : '';
}

function sanitizeNext(candidate) {
  const safe = candidate.length <= MAX_NEXT_LENGTH && SAFE_NEXT.test(candidate) && !candidate.startsWith(GATE_PREFIX);
  return safe ? candidate : '/';
}

function isFormBody(req) {
  const type = (req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
  return type === 'application/x-www-form-urlencoded';
}

/** Collects a urlencoded body of at most 4 KB; a longer one destroys the request. */
function readForm(req, onForm) {
  if (Number(req.headers['content-length']) > MAX_FORM_BYTES) {
    req.destroy();
    return;
  }
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_FORM_BYTES) req.destroy();
    else chunks.push(chunk);
  });
  req.on('end', () => {
    if (size <= MAX_FORM_BYTES) onForm(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
  });
}

/** One token attempt: the rate limit first, then a constant-time comparison. */
function attemptLogin(req, res, state, candidate, rawNext) {
  const header = clientAddress(req);
  const ip = SINGLE_IP.test(header) ? header : 'invalid';
  const next = sanitizeNext(rawNext);
  const now = performance.now();
  const retryAfter = retryAfterSeconds(ip, now);
  if (retryAfter > 0) return sendPage(res, 429, 'rate-limited', next, { 'retry-after': String(retryAfter) });
  if (!sameSecret(candidate, state.token)) {
    recordFailure(ip, now);
    log(`wrong token from ${printable(ip)}`);
    return sendPage(res, 401, 'wrong-token', next);
  }
  const setCookie = `${COOKIE_NAME}=${state.cookie}; Max-Age=${COOKIE_MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return sendRedirect(res, next, setCookie);
}

/** The Azure ingress appends the real client as the last X-Forwarded-For entry; Cloudflare sets cf-connecting-ip. */
function clientAddress(req) {
  if (!AZURE) return String(req.headers['cf-connecting-ip']).trim();
  return String(req.headers['x-forwarded-for'] ?? '').split(',').pop().trim();
}

function printable(value) {
  return String(value).replace(/[^\x21-\x7e]/g, '?').slice(0, 64);
}

/** Proxies a request to nginx unchanged (Host and X-Forwarded-* included) and streams the answer back unbuffered. */
function forward(req, res) {
  let upstream;
  try {
    upstream = httpRequest({
      host: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      method: req.method,
      path: req.url,
      headers: req.headers,
      // No socket timeout may cut a long-lived response; idle pooled sockets keep the agent's own timeout.
      timeout: 0,
    });
  } catch {
    return sendText(res, 400, 'arsm gate: this request cannot be forwarded\n');
  }
  let clientGone = false;
  // An SSE subscription must never outlive its browser connection, because the API caps subscriptions.
  res.on('close', () => {
    if (res.writableFinished) return;
    clientGone = true;
    upstream.destroy();
  });
  req.on('error', () => upstream.destroy());
  upstream.on('response', (answer) => {
    noteUpstream(true);
    res.writeHead(answer.statusCode ?? 502, { ...answer.headers, 'x-robots-tag': ROBOTS });
    pipeline(answer, res, () => {});
  });
  upstream.on('error', (error) => {
    if (clientGone || res.writableFinished) return;
    if (res.headersSent) {
      res.destroy();
      return;
    }
    noteUpstream(false, error);
    sendText(res, 502, `arsm gate: nothing answers on ${UPSTREAM}\n`);
  });
  req.pipe(upstream);
}

/** Logs the upstream going unreachable and coming back, once per outage. */
function noteUpstream(reachable, error) {
  if (reachable !== upstreamDown) return;
  upstreamDown = !reachable;
  log(reachable ? `upstream ${UPSTREAM} reachable again` : `upstream ${UPSTREAM} unreachable (${error?.code ?? error?.message})`);
}

/** Upgrade (WebSocket) requests follow the same rule; ARSM uses none today, its live updates are SSE. */
function onUpgrade(req, socket, head) {
  socket.on('error', () => socket.destroy());
  if (isRemote(req)) {
    const state = currentToken();
    if (!state.usable) return refuseUpgrade(socket, '503 Service Unavailable');
    const carriesAccess = new URLSearchParams(splitTarget(req.url).query).has('access');
    if (carriesAccess || !hasValidCookie(req, state)) return refuseUpgrade(socket, '401 Unauthorized');
  }
  return pipeUpgrade(req, socket, head);
}

function refuseUpgrade(socket, status) {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`, () => socket.destroy());
}

/** Replays the raw upgrade request to nginx, then pipes both ways until either side closes. */
function pipeUpgrade(req, socket, head) {
  let connected = false;
  const upstream = connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
    connected = true;
    noteUpstream(true);
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', (error) => {
    if (!connected) noteUpstream(false, error);
    socket.destroy();
  });
  // The upstream's last bytes still reach the client; a closed client drops the upstream at once.
  upstream.on('close', () => socket.end(() => socket.destroy()));
  socket.on('close', () => upstream.destroy());
}

const assets = loadGateAssets();

const server = createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});
  if (isRemote(req)) handleRemote(req, res);
  else forward(req, res);
});
// No server socket timeout: an SSE stream stays open as long as nginx allows (proxy_read_timeout 1h).
server.timeout = 0;
server.on('upgrade', onUpgrade);
server.on('error', (error) => fatal(`cannot serve on ${HOST}:${GATE_PORT} (${error.code ?? error.message})`));
server.listen(GATE_PORT, HOST, () => {
  const { usable } = currentToken();
  logTokenChanges = true;
  const tokenNote = usable ? 'GATE_TOKEN usable' : `no GATE_TOKEN of ${MIN_TOKEN_LENGTH}+ characters, remote requests get 503`;
  const tokenSource = AZURE ? 'GATE_TOKEN env' : ENV_FILE;
  log(`listening on http://${HOST}:${GATE_PORT} -> http://${UPSTREAM}, ${assets.size} gate assets; ${tokenSource}: ${tokenNote}`);
});
