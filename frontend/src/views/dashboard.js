// Dashboard view logic (fetching and rendering) //ablandoa
// Este archivo administra la carga de posts y sus respuestas, además
// de aplicar reglas de permisos en el FRONT (no reemplaza validación backend). //ablandoa
const API = 'http://localhost:3000/api'; // actualizado a /api

// ======== AUTH HELPERS (nuevo, no rompe nada) ======== //ablandoa
function looksLikeJWT(t) { return typeof t === 'string' && t.split('.').length === 3; } //ablandoa
function getToken() { // devuelve null si no parece JWT //ablandoa
  const raw = (localStorage.getItem('token') || '').trim();
  return looksLikeJWT(raw) ? raw : null;
} //ablandoa
function buildAuthHeaders(body, extra = {}) { // si body es FormData, no forzar Content-Type //ablandoa
  const token = getToken();
  const base = (body instanceof FormData)
    ? { ...(extra || {}) }
    : { 'Content-Type': 'application/json', ...(extra || {}) };
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
} //ablandoa
async function apiFetch(path, options = {}) { //ablandoa
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const headers = buildAuthHeaders(options.body, options.headers);
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401 || resp.status === 403) {
    // token inválido/ausente: limpiar y mandar a login de forma amable //ablandoa
    alert('Tu sesión expiró o el token es inválido. Inicia sesión de nuevo.');
    localStorage.removeItem('token');
    localStorage.setItem('Auth', 'false');
    try {
      const { navigate } = await import('../main');
      navigate('/login');
    } catch {}
    throw new Error('Unauthorized');
  }
  return resp;
} //ablandoa
// ====================================================== //ablandoa

// ===================== RATING UTILITIES (NEW) ===================== //ablandoa
const STAR_MAX = 5; //ablandoa

let ratingsSummaryMap = new Map();  // answer_id -> {avg, count} //ablandoa
let myRatingsMap      = new Map();  // answer_id -> myRating     //ablandoa

function renderStars(answerId, avg, myRating, disabled) { //ablandoa
  const roundAvg = isFinite(avg) ? (Math.round(avg * 10) / 10).toFixed(1) : '0.0'; //ablandoa
  const cls = disabled ? 'pointer-events:none;opacity:.6' : 'cursor:pointer'; //ablandoa
  let stars = ''; //ablandoa

  for (let v = 1; v <= STAR_MAX; v++) { //ablandoa
    const filled = myRating ? v <= myRating : v <= Math.round(avg || 0); //ablandoa
    const starClass = filled ? 'filled' : 'empty'; // Usamos la clase 'filled' o 'empty' dependiendo de la calificación
    const starSymbol = filled ? '★' : '☆'; // Si la estrella está llena, usamos el símbolo de estrella llena, si está vacía usamos el vacío

    stars += `<span class="star ${starClass}" data-answer="${answerId}" data-value="${v}" title="${v}" style="font-size:24px;line-height:1;${cls};user-select:none">${starSymbol}</span>`; //ablandoa
  }

  return `<div class="rating" data-answer="${answerId}" style="display:flex;align-items:center;gap:4px">${stars}<span class="rate-avg" style="font-size:11px;color:#666;margin-left:6px">(${roundAvg})</span></div>`; //ablandoa
}


function injectRatingsUI(rootEl, answersCache) { //ablandoa
  const me = Number(localStorage.getItem('user_id') || 0); //ablandoa
  rootEl.querySelectorAll('.rating-slot[data-answer]').forEach(slot => { //ablandoa
    const answerId = Number(slot.dataset.answer); //ablandoa
    const aInfo = ratingsSummaryMap.get(answerId) || { avg: 0, count: 0 }; //ablandoa
    const myR = myRatingsMap.get(answerId) ?? null; //ablandoa
    const aObj = answersCache.find(x => Number(x.answer_id) === answerId); //ablandoa
    const isMine = aObj ? Number(aObj.user_id) === me : false; //ablandoa
    const disabled = isMine; //ablandoa
    slot.innerHTML = `
      ${renderStars(answerId, aInfo.avg, myR, disabled)}
      <small style="display:block;text-align:right;color:#888;margin-top:2px">${aInfo.count || 0} voto(s)</small>
    `; //ablandoa
  }); //ablandoa
} //ablandoa

async function loadRatingsFromAPI() { /* endpoints de rating no existen aún; noop */ } //ablandoa
// =================== END RATING UTILITIES (NEW) ===================== //ablandoa


function postCard(p, answersByPost) { // dibuja una tarjeta de post //ablandoa
  let storedRole = localStorage.getItem('role'); // puede venir como id numerico (1,2,3) o alias //ablandoa
  // Mapeo numerico -> alias //ablandoa
  if (storedRole === '1') storedRole = 'coder';
  else if (storedRole === '2') storedRole = 'team_leader';
  else if (storedRole === '3') storedRole = 'admin';
  const userRole = storedRole; // usar alias normalizado //ablandoa
  const me = Number(localStorage.getItem('user_id')); // id usuario logueado //ablandoa
  const isOwner = Number(p.user_id) === Number(me); // comparación robusta numérica //ablandoa

  // Tabla de permisos front (NO segura):
  const canEdit = (userRole === 'admin') || (userRole === 'coder' && isOwner) || (userRole === 'team_leader' && isOwner); //ablandoa
  const canDelete = (userRole === 'admin') || (userRole === 'team_leader') || (userRole === 'coder' && isOwner); //ablandoa

  const hasImg = Boolean(p.image && String(p.image).trim()); //ablandoa
  const imageBox = hasImg
    ? `<div class="post-image-box" data-full="${p.image}"><img src="${p.image}" alt="post image" onerror="this.parentNode.classList.add('is-error');this.remove();"></div>`
    : `<div class="post-image-box is-empty">IMG</div>`; // caja amplia o placeholder

  const answers = answersByPost.get(p.post_id) || []; // respuestas agrupadas //ablandoa
  const answersHTML = answers.length
    ? `<div class="answers-wrap" style="margin-top:8px">${
        answers.map(a => `
          <div class='answer-item' data-answer='${a.answer_id}' style='font-size:12px;margin:4px 0;padding:6px 8px;background:#f7f7f9;border:1px solid #eee;border-radius:6px'>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div><b>#${a.user_id}</b>: ${a.description || ''}</div>
              <div class="rating-slot" data-answer="${a.answer_id}"></div>
            </div>
          </div>`
        ).join('')
      }</div>`
    : '';

  return `<article class="card post-card">
    <h4>${p.title ?? ''}</h4>
    <div class="post-meta">
      <span>Tipo: ${p.type ?? '-'}</span> · <span>Estado: ${p.status ?? 'unsolved'}</span> · <span>Autor #${p.user_id ?? '-'}</span>
    </div>
    <p class="post-desc">${p.description ?? ''}</p>
    ${imageBox}
    <div class="post-actions">
      ${canEdit?`<button class='btn-edit' data-id='${p.post_id}'>Editar</button>`:''}
      ${canDelete?`<button class='btn-delete' data-id='${p.post_id}'>Eliminar</button>`:''}
    </div>
    ${answersHTML}
    <form class='answer-form' data-post='${p.post_id}'>
      <input name='description' placeholder='Add answer...'>
      <button type='submit'>Enviar</button>
    </form>
  </article>`;
}

function answerItem(a) {
  const when = a.date ? new Date(a.date).toLocaleString() : '';
  const text = a.description ?? '';
  return `<div class="card" style="padding:10px"><b>User #${a.user_id ?? '-'}</b> <small>${when}</small><p>${text}</p></div>`;
}

async function getJSON(url) { // helper fetch json //ablandoa
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function renderDashboardAfterTemplateLoaded() { // punto de entrada dashboard //ablandoa
  const qEl = document.getElementById('questions-count');
  const aEl = document.getElementById('answers-count');
  const pEl = document.getElementById('points-count');

  const postsEl = document.getElementById('posts');
  const answersEl = document.getElementById('answers');

  const form = document.getElementById('post-form');
  const hint = document.getElementById('post-hint');

  let answersCache = [];
  function groupAnswers(list){
    const map=new Map();
    list.forEach(a=>{ const arr=map.get(a.post_id)||[]; arr.push(a); map.set(a.post_id,arr); });
    return map;
  }

  async function loadPosts() { // carga posts y renderiza //ablandoa
    const posts = await getJSON(`${API}/posts/all`);
    // Aplicar overrides locales (ediciones simuladas)
    let overrides = {};
    try { overrides = JSON.parse(localStorage.getItem('post_overrides')||'{}'); } catch { overrides = {}; }
    const merged = posts.map(p => overrides[p.post_id] ? { ...p, ...overrides[p.post_id] } : p);
    if (qEl) qEl.textContent = posts.length;
    const answersByPost = groupAnswers(answersCache);
    if (postsEl) {
      postsEl.innerHTML = merged.length
        ? merged.slice().reverse().map(p=>postCard(p, answersByPost)).join('')
        : '<div class="card" style="padding:10px">No posts.</div>';

      // Inyectar estrellas y promedios + enlazar lightbox
      injectRatingsUI(postsEl, answersCache);
      attachImageLightboxHandlers();
    }
  }

  async function loadAnswers() { // carga todas las respuestas //ablandoa
    answersCache = await getJSON(`${API}/answers`);
    if (aEl) aEl.textContent = answersCache.length;
    if (pEl) pEl.textContent = String(answersCache.length * 10);
  }

  if (form) { // submit crear post //ablandoa
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (hint) hint.textContent = 'Publicando…';

      try {
        const fd = new FormData(form);
        const uid = localStorage.getItem('user_id');
        if (uid) fd.set('user_id', uid);

        const type = String(fd.get('type') || '').toLowerCase().trim();
        const status = String(fd.get('status') || '').toLowerCase().trim();
        if (type) fd.set('type', type);
        if (status) fd.set('status', status);

        // insert-post NO requiere auth en backend, pero dejamos como estaba //ablandoa
        const r = await fetch(`${API}/posts/insert`, { method: 'POST', body: fd });
        if (!r.ok) {
          let msg = 'Error al crear el post.';
          try {
            const data = await r.json();
            if (data?.detail || data?.error) {
              msg = `Error al crear el post: ${data.detail || data.error}`;
            }
          } catch { /* ignore */ }
          throw new Error(msg);
        }

        form.reset();
        if (hint) hint.textContent = '¡Post creado!';
        await loadPosts();
      } catch (err) {
        console.error(err);
        if (hint) hint.textContent = err.message || 'Error al crear el post.';
      }
    });
  }

  if (postsEl) { // listeners acciones sobre tarjetas //ablandoa
    postsEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      const star = e.target.closest('.star'); // click en estrella

      // ---- botones editar/eliminar ----
      if (btn) {
        const id = btn.dataset.id;
        if (btn.classList.contains('btn-delete')) { // eliminar post
          if (!confirm('Eliminar post?')) return;
          try {
            const r = await apiFetch(`/posts/${id}`, { method: 'DELETE' }); // actualizado
            if (r.ok) {
              try {
                const o = JSON.parse(localStorage.getItem('post_overrides')||'{}');
                delete o[id];
                localStorage.setItem('post_overrides', JSON.stringify(o));
              } catch {}
              await loadPosts();
            } else {
              try { const err=await r.json(); console.error(err); alert(err.error||'Error eliminando'); } catch(_) {}
            }
          } catch (err) { console.error(err); }
        }
        if (btn.classList.contains('btn-edit')) { // ir a edición
          const article = btn.closest('article');
          const postId = id;
          const title = article.querySelector('h4')?.textContent || '';
          const desc = article.querySelector('p')?.textContent || '';
          const meta = article.querySelector('.post-meta')?.textContent || '';
          let typeMatch = meta.match(/Tipo:\s*([^·]+)/i);
          let statusMatch = meta.match(/Estado:\s*([^·]+)/i);
          const type = typeMatch ? typeMatch[1].trim().replace(/\.$/, '') : '';
          const status = statusMatch ? statusMatch[1].trim().replace(/\.$/, '') : '';
          const image = article.querySelector('.post-image-box img')?.getAttribute('src') || '';
          const postData = { post_id: postId, title, description: desc, type, status, image };
          sessionStorage.setItem('edit_post', JSON.stringify(postData));
          import('../main').then(m=> m.navigate('/edit-post'));
        }
        return;
      }

      // ---- calificar con estrella ----
      if (star) {
        const answerId = Number(star.dataset.answer);
        const value = Number(star.dataset.value);
        const tokenExists = !!getToken(); //ablandoa
        const me = Number(localStorage.getItem('user_id') || 0);
        if (!tokenExists) { alert('Sesión expirada. Reloguea.'); return; }

        const aObj = answersCache.find(x => Number(x.answer_id) === answerId);
        if (!aObj) return;
        if (Number(aObj.user_id) === me) { alert('No puedes calificar tu propia respuesta'); return; }
        if (myRatingsMap.has(answerId)) { alert('Ya calificaste esta respuesta'); return; }
        if (!(value >= 1 && value <= STAR_MAX)) return;

        try {
          const r = await apiFetch(`/answers/${answerId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating: value })
          }); // usa Bearer + maneja 401/403 //ablandoa
          if (!r.ok) {
            const err = await r.json().catch(()=> ({}));
            alert(err?.error || 'No se pudo registrar la calificación');
            return;
          }
          await loadPosts();
        } catch (err) {
          console.error(err);
          // apiFetch ya alerta en 401/403 //ablandoa
        }
      }
    });

    // answer form submit (event delegation)
    postsEl.addEventListener('submit', async (e)=>{
      const form = e.target.closest('.answer-form');
      if(!form) return;
      e.preventDefault();
      const postId = form.getAttribute('data-post');
      const input = form.querySelector('input[name="description"]');
      const txt = (input?.value||'').trim();
      if(!txt) return;
      const fd = new FormData();
      fd.append('description', txt);
      fd.append('user_id', localStorage.getItem('user_id'));
      fd.append('post_id', postId);
      try {
        // usa apiFetch con FormData (no fuerza Content-Type) y agrega Bearer si existe //ablandoa
        const r = await apiFetch(`/answers`, { method:'POST', body: fd });
        if(r.ok){
          input.value='';
          await loadAnswers();
          await loadPosts();
        } else {
          console.error(await r.json());
        }
      } catch(err){ console.error(err); }
    });
  }

  await loadAnswers();
  await loadPosts();
  setupLightboxRoot();
}

// ---- Lightbox para imágenes de posts ---- //ablandoa
function setupLightboxRoot(){
  if(document.getElementById('img-lightbox-root')) return;
  const div = document.createElement('div');
  div.id = 'img-lightbox-root';
  div.innerHTML = `
    <div class="img-lightbox-backdrop" data-close="lb">
      <figure class="img-lightbox-figure">
        <img alt="Imagen del post" class="img-lightbox-img" />
        <figcaption class="img-lightbox-caption"></figcaption>
        <button type="button" class="img-lightbox-close" data-close="lb" aria-label="Cerrar">×</button>
      </figure>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e=>{ if(e.target.dataset.close==='lb'){ closeLightbox(); }});
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });
}

function openLightbox(src, caption=''){
  const root = document.getElementById('img-lightbox-root');
  if(!root) return;
  root.querySelector('.img-lightbox-img').src = src;
  const capEl = root.querySelector('.img-lightbox-caption');
  if(caption){ capEl.textContent = caption; capEl.style.display='block'; } else { capEl.textContent=''; capEl.style.display='none'; }
  root.classList.add('is-open');
  document.body.classList.add('lightbox-open');
}
function closeLightbox(){
  const root = document.getElementById('img-lightbox-root');
  if(!root) return;
  root.classList.remove('is-open');
  document.body.classList.remove('lightbox-open');
}
function attachImageLightboxHandlers(){
  const boxes = document.querySelectorAll('.post-image-box[data-full]');
  boxes.forEach(box=>{
    if(box.dataset.lbBound) return; // evitar duplicar //ablandoa
    box.dataset.lbBound = '1';
    box.style.cursor = box.classList.contains('is-empty') ? 'default' : 'zoom-in';
    if(!box.classList.contains('is-empty')){
      box.addEventListener('click', ()=>{
        const src = box.dataset.full;
        const caption = box.closest('.post-card')?.querySelector('h4')?.textContent || '';
        openLightbox(src, caption);
      });
    }
  });
}
