// Backend/src/services/stackoverflow.service.js
// Service to query the public Stack Exchange API (Stack Overflow)

const API_BASE = 'https://api.stackexchange.com/2.3';

// --- utilidades ---
function clean(o = {}) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = v;
  }
  return out;
}
function qs(params) {
  return new URLSearchParams(clean(params)).toString();
}

// Params default
const DEFAULT_PARAMS = {
  site: 'stackoverflow',
  pagesize: 10,
};


const cache = new Map(); // key -> { data, exp }
const DEFAULT_TTL_MS = 60_000; // 60s

async function request(path, params = {}, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = `${path}?${qs({ ...DEFAULT_PARAMS, ...params })}`;

  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;


  const url = `${API_BASE}${key}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`StackOverflow ${resp.status} ${resp.statusText} - ${text}`);
  }

  const data = await resp.json();

 
  if (data?.backoff) {
    await new Promise(r => setTimeout(r, data.backoff * 1000));
  }

  
  cache.set(key, { data, exp: Date.now() + ttlMs });
  return data;
}


export async function getHot({ tagged, pagesize } = {}) {
  return request('/questions', { order: 'desc', sort: 'hot', tagged, pagesize });
}

export async function getNewest({ tagged, pagesize } = {}) {
  return request('/questions', { order: 'desc', sort: 'creation', tagged, pagesize });
}

export async function searchAdvanced({ q, tagged, pagesize } = {}) {
  return request('/search/advanced', { q, tagged, pagesize, order: 'desc', sort: 'relevance' });
}

export async function getAnswers(questionId, { pagesize } = {}) {
  return request(`/questions/${questionId}/answers`, { order: 'desc', sort: 'votes', pagesize });
}

export default {
  getHot,
  getNewest,
  searchAdvanced,
  getAnswers,
};
