// Backend/src/services/stackoverflow.service.js
// Service to query the public Stack Exchange API (Stack Overflow)

const API_BASE = 'https://api.stackexchange.com/2.3';

// --- helpers ---
// Clean empty/null/undefined params before sending
function clean(o = {}) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = v;
  }
  return out;
}

// Build query string from params object
function qs(params) {
  return new URLSearchParams(clean(params)).toString();
}

// Default params always included in each request
const DEFAULT_PARAMS = {
  site: 'stackoverflow', // API requires the site name
  pagesize: 10,          // default number of results
};

// --- simple in-memory cache ---
// cache = key -> { data, exp }
// DEFAULT_TTL_MS: time to keep response (60s)
const cache = new Map();
const DEFAULT_TTL_MS = 60_000; // 60 seconds

// Generic request to Stack Overflow API
async function request(path, params = {}, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = `${path}?${qs({ ...DEFAULT_PARAMS, ...params })}`;

  // If cache is still valid, return cached data
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;

  // Build full URL
  const url = `${API_BASE}${key}`;
  const resp = await fetch(url);

  // If response is not ok → throw detailed error
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`StackOverflow ${resp.status} ${resp.statusText} - ${text}`);
  }

  // Parse JSON body
  const data = await resp.json();

  // If API tells us to wait (backoff), respect it
  if (data?.backoff) {
    await new Promise(r => setTimeout(r, data.backoff * 1000));
  }

  // Save response into cache with expiration
  cache.set(key, { data, exp: Date.now() + ttlMs });

  return data;
}

// --- Public functions ---
// Get hot questions (popular right now)
export async function getHot({ tagged, pagesize } = {}) {
  return request('/questions', { order: 'desc', sort: 'hot', tagged, pagesize });
}

// Get newest questions
export async function getNewest({ tagged, pagesize } = {}) {
  return request('/questions', { order: 'desc', sort: 'creation', tagged, pagesize });
}

// Advanced search (query + tags + relevance)
export async function searchAdvanced({ q, tagged, pagesize } = {}) {
  return request('/search/advanced', { q, tagged, pagesize, order: 'desc', sort: 'relevance' });
}

// Get answers of a question, sorted by votes
export async function getAnswers(questionId, { pagesize } = {}) {
  return request(`/questions/${questionId}/answers`, { order: 'desc', sort: 'votes', pagesize });
}

// Export default object (so can import everything easily)
export default {
  getHot,
  getNewest,
  searchAdvanced,
  getAnswers,
};
