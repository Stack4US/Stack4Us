// Dashboard view logic (fetching and rendering)
// Este archivo administra la carga de posts, respuestas y conversaciones (replies a answers)
// FRONT aplica reglas de permisos visuales (backend sigue validando)

const API_ROOT = 'http://localhost:3000/api'; // base backend unificada

// ======== AUTH HELPERS ========
function looksLikeJWT(t){ return typeof t === 'string' && t.split('.').length === 3; }
function getToken(){ const raw=(localStorage.getItem('token')||'').trim(); return looksLikeJWT(raw)?raw:null; }
function buildAuthHeaders(body, extra={}){
  const token = getToken();
  const base = (body instanceof FormData)? { ...(extra||{}) } : { 'Content-Type':'application/json', ...(extra||{}) };
  return token? { ...base, Authorization:`Bearer ${token}` }: base;
}
async function apiFetch(path, options={}){
  const url = path.startsWith('http')? path : `${API_ROOT}${path}`;
  const headers = buildAuthHeaders(options.body, options.headers);
  const resp = await fetch(url,{ ...options, headers });
  if(resp.status===401 || resp.status===403){
    alert('Sesión expirada o token inválido. Inicia sesión de nuevo.');
    localStorage.removeItem('token');
    localStorage.setItem('Auth','false');
    try { const { navigate } = await import('../main'); navigate('/login'); } catch {}
    throw new Error('Unauthorized');
  }
  return resp;
}

// ======== (PLACEHOLDER) RATING UTILITIES ========
// Backend aún no expone endpoints de rating; mantenemos estructura mínima para evitar errores.
const STAR_MAX = 5; // por si se agrega luego
const ratingsSummaryMap = new Map(); // answer_id -> {avg,count}
const myRatingsMap = new Map();      // answer_id -> myRating
function renderStars(){ return ''; } // no UI hasta que exista backend
function injectRatingsUI(){ /* noop */ }
async function loadRatingsFromAPI(){ /* noop */ }
// ================================================

// Conversaciones (replies a answers)
let conversationsCache = []; // lista cruda
function groupConversations(list){ const map=new Map(); list.forEach(c=>{ const arr=map.get(c.answer_id)||[]; arr.push(c); map.set(c.answer_id,arr); }); return map; }

// Helpers nombres/avatars (simplificado: backend no expone listado abierto de usuarios)
function userName(id){ return `User #${id}`; }
function userAvatar(){ return ''; }

// ======== POST CARD RENDER ========
function postCard(post, answersByPost, convByAnswer){
  let storedRole = localStorage.getItem('role');
  if(storedRole==='1') storedRole='coder'; else if(storedRole==='2') storedRole='team_leader'; else if(storedRole==='3') storedRole='admin';
  const userRole = storedRole;
  const me = Number(localStorage.getItem('user_id'));
  const isOwner = Number(post.user_id)===me;
  const canEdit = (userRole==='admin') || (userRole==='coder' && isOwner) || (userRole==='team_leader' && isOwner);
  const canDelete = (userRole==='admin') || (userRole==='team_leader') || (userRole==='coder' && isOwner);
  const hasImg = Boolean(post.image && String(post.image).trim());
  const imageBox = hasImg ? `<div class="post-image-box" data-full="${post.image}"><img src="${post.image}" alt="post image" onerror="this.parentNode.classList.add('is-error');this.remove();"></div>` : `<div class="post-image-box is-empty">IMG</div>`;
  const answers = answersByPost.get(post.post_id)||[];
  const answersHTML = answers.length ? `<div class="answers-wrap" style="margin-top:8px">${answers.map(a=>{
    const convs = convByAnswer.get(a.answer_id)||[];
    const convHTML = convs.length ? `<div class='conversation-thread'>${convs.map(c=>{
      const raw = c.description||'';
      const directedMatch = raw.match(/^@(\S+)/);
      const bodyHTML = raw.replace(/^@(\S+)/,(m,u)=>`<span class="mention">@${u}</span>`);
      const meId = me;
      const canDelConv = meId === Number(c.user_id); // backend valida
      return `<div class='conversation-item${directedMatch?' is-directed':''}' data-conv='${c.conversation_id}'>
        <div class='ig-comment-line'>
          <span class='ig-user'>${userName(c.user_id)}</span>
          <span class='ig-text'>${bodyHTML}</span>
        </div>
        <div class='ig-actions-row'>
          <button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${c.user_id}' data-source='conversation'>Responder</button>
          ${canDelConv?`<button class='ig-action comment-delete' data-type='conversation' data-conv='${c.conversation_id}'>Eliminar</button>`:''}
        </div>
      </div>`;}).join('')}</div>` : '';
    const meId = me;
    const canDelAnswer = (userRole==='admin') || meId === Number(a.user_id);
    return `<div class='answer-item ig-comment' data-answer='${a.answer_id}'>
      <div class='ig-comment-line'><span class='ig-user'>${userName(a.user_id)}</span><span class='ig-text'>${a.description||''}</span></div>
      <div class='ig-actions-row'>
        <button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${a.user_id}' data-source='answer'>Responder</button>
        ${canDelAnswer?`<button class='ig-action comment-delete' data-type='answer' data-answer='${a.answer_id}'>Eliminar</button>`:''}
      </div>
      <div class='ig-replies'>${convHTML}</div>
    </div>`;}).join('')}</div>` : '';
  return `<article class="card post-card">
    <h4>${post.title ?? ''}</h4>
    <div class="post-meta"><span>Tipo: ${post.type ?? '-'} </span> · <span>Estado: ${post.status ?? 'unsolved'}</span> · <span>Autor #${post.user_id ?? '-'}</span></div>
    <p class="post-desc">${post.description ?? ''}</p>
    ${imageBox}
    <div class="post-actions">${canEdit?`<button class='btn-edit' data-id='${post.post_id}'>Editar</button>`:''}${canDelete?`<button class='btn-delete' data-id='${post.post_id}'>Eliminar</button>`:''}</div>
    ${answersHTML}
    <form class='answer-form' data-post='${post.post_id}'><input name='description' placeholder='Add answer...'><button type='submit'>Enviar</button></form>
  </article>`;
}

function answerItem(a){ const when = a.date? new Date(a.date).toLocaleString():''; return `<div class="card" style="padding:10px"><b>User #${a.user_id??'-'}</b> <small>${when}</small><p>${a.description??''}</p></div>`; }

async function getJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); }

export async function renderDashboardAfterTemplateLoaded(){
  const qEl = document.getElementById('questions-count');
  const aEl = document.getElementById('answers-count');
  const pEl = document.getElementById('points-count');
  const postsEl = document.getElementById('posts');
  const answersEl = document.getElementById('answers');
  const form = document.getElementById('post-form');
  const hint = document.getElementById('post-hint');

  let answersCache = [];
  function groupAnswers(list){ const map=new Map(); list.forEach(a=>{ const arr=map.get(a.post_id)||[]; arr.push(a); map.set(a.post_id,arr); }); return map; }

  async function loadPosts(){
    const posts = await getJSON(`${API_ROOT}/posts/all`);
    let overrides={}; try { overrides = JSON.parse(localStorage.getItem('post_overrides')||'{}'); } catch { overrides={}; }
    const merged = posts.map(p=> overrides[p.post_id]? { ...p, ...overrides[p.post_id]}: p);
    if(qEl) qEl.textContent = posts.length;
    const answersByPost = groupAnswers(answersCache);
    const convByAnswer = groupConversations(conversationsCache||[]);
    if(postsEl){
      postsEl.innerHTML = merged.length? merged.slice().reverse().map(p=>postCard(p, answersByPost, convByAnswer)).join('') : '<div class="card" style="padding:10px">No posts.</div>';
      injectRatingsUI(postsEl, answersCache); // ahora noop
      attachImageLightboxHandlers();
    }
  }
  async function loadAnswers(){ answersCache = await getJSON(`${API_ROOT}/answers`); if(aEl) aEl.textContent=answersCache.length; if(pEl) pEl.textContent=String(answersCache.length*10); }
  async function loadConversations(){ try { conversationsCache = await getJSON(`${API_ROOT}/conversations`);} catch { conversationsCache=[]; } }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); if(hint) hint.textContent='Publicando…';
      try {
        const fd = new FormData(form);
        const uid = localStorage.getItem('user_id'); if(uid) fd.set('user_id', uid);
        const type = String(fd.get('type')||'').toLowerCase().trim(); const status=String(fd.get('status')||'').toLowerCase().trim(); if(type) fd.set('type', type); if(status) fd.set('status', status);
        const r = await fetch(`${API_ROOT}/posts/insert`, { method:'POST', body: fd });
        if(!r.ok){ let msg='Error al crear el post.'; try { const data=await r.json(); if(data?.detail||data?.error) msg=`Error al crear el post: ${data.detail||data.error}`; } catch {} throw new Error(msg); }
        form.reset(); if(hint) hint.textContent='¡Post creado!'; await loadPosts();
      } catch(err){ console.error(err); if(hint) hint.textContent=err.message||'Error al crear el post.'; }
    });
  }

  if(postsEl){
    postsEl.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button');
      if(btn){
        const id = btn.dataset.id;
        if(btn.classList.contains('btn-delete')){
          if(!confirm('Eliminar post?')) return;
          try {
            const r = await apiFetch(`/posts/${id}`, { method:'DELETE' });
            if(r.ok){ try { const o=JSON.parse(localStorage.getItem('post_overrides')||'{}'); delete o[id]; localStorage.setItem('post_overrides', JSON.stringify(o)); } catch {} await loadPosts(); }
            else { try { const err=await r.json(); console.error(err); alert(err.error||'Error eliminando'); } catch {} }
          } catch(err){ console.error(err); }
        }
        if(btn.classList.contains('btn-edit')){
          const article = btn.closest('article');
          const postId = id;
          const title = article.querySelector('h4')?.textContent||'';
          const desc = article.querySelector('p')?.textContent||'';
          const meta = article.querySelector('.post-meta')?.textContent||'';
          let typeMatch = meta.match(/Tipo:\s*([^·]+)/i); let statusMatch = meta.match(/Estado:\s*([^·]+)/i);
          const type = typeMatch? typeMatch[1].trim().replace(/\.$/, ''):'';
          const status = statusMatch? statusMatch[1].trim().replace(/\.$/, ''):'';
          const image = article.querySelector('.post-image-box img')?.getAttribute('src')||'';
          const postData = { post_id: postId, title, description: desc, type, status, image };
          sessionStorage.setItem('edit_post', JSON.stringify(postData));
          import('../main').then(m=>m.navigate('/edit-post'));
        }
        return;
      }
    });
    // Submit nueva answer
    postsEl.addEventListener('submit', async (e)=>{
      const aForm = e.target.closest('.answer-form'); if(!aForm) return; e.preventDefault();
      const postId = aForm.getAttribute('data-post');
      const input = aForm.querySelector('input[name="description"]');
      const txt = (input?.value||'').trim(); if(!txt) return;
      const uid = localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; }
      const fd = new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('post_id', postId);
      try {
        const r = await apiFetch('/answers', { method:'POST', body: fd });
        if(r.ok){ input.value=''; await loadAnswers(); await loadConversations(); await loadPosts(); }
        else console.error(await r.json().catch(()=>({})));
      } catch(err){ console.error(err); }
    });
    // Conversación reply form (inline)
    postsEl.addEventListener('submit', async (e)=>{
      const cForm = e.target.closest('.conversation-form'); if(!cForm) return; e.preventDefault();
      const answerId = cForm.getAttribute('data-answer');
      const input = cForm.querySelector('input[name="description"]');
      const targetUserId = cForm.getAttribute('data-target');
      let txt = (input?.value||'').trim(); if(!txt) return;
      const uid = localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; }
      if(targetUserId && !txt.startsWith('@')){ const uname = userName(targetUserId).replace(/\s+/g,''); txt = `@${uname} ${txt}`; }
      const fd = new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('answer_id', answerId);
      try {
        const r = await apiFetch('/conversations', { method:'POST', body: fd });
        if(r.ok){ input.value=''; await loadConversations(); await loadPosts(); }
        else { let errInfo={}; try { errInfo=await r.json(); } catch {}; alert(errInfo.error||'Error enviando respuesta'); }
      } catch(err){ console.error(err); }
    });
    // Mostrar formulario de reply
    postsEl.addEventListener('click', (e)=>{
      const trigger = e.target.closest('.reply-trigger'); if(!trigger) return; e.preventDefault();
      const answerId = trigger.getAttribute('data-answer'); const userId = trigger.getAttribute('data-user');
      const answerBox = trigger.closest('.answer-item'); if(!answerBox) return;
      answerBox.querySelectorAll('form.conversation-form').forEach(f=>f.remove());
      const form = document.createElement('form'); form.className='conversation-form'; form.setAttribute('data-answer', answerId); if(userId) form.setAttribute('data-target', userId);
      form.innerHTML = `<div class='reply-context'>Respondiendo a <b>${userName(userId)}</b></div><input name='description' placeholder='Escribe tu respuesta...'/><button type='submit' title='Enviar respuesta'>↳</button>`;
      const anchor = trigger.closest('.ig-actions-row') || answerBox; anchor.insertAdjacentElement('afterend', form); form.querySelector('input').focus();
    });
    // Eliminar answer / conversation
    postsEl.addEventListener('click', async (e)=>{
      const delBtn = e.target.closest('.comment-delete'); if(!delBtn) return; e.preventDefault(); if(!confirm('Eliminar?')) return;
      const type = delBtn.dataset.type; const id = delBtn.dataset.answer || delBtn.dataset.conv;
      try {
        if(type==='answer'){
          const r = await apiFetch(`/answers/${id}`, { method:'DELETE' }); if(!r.ok) console.error('Fail delete answer', await r.json().catch(()=>({})) );
        } else if(type==='conversation') {
          const r = await apiFetch(`/conversations/${id}`, { method:'DELETE' }); if(!r.ok) console.error('Fail delete conv', await r.json().catch(()=>({})) );
        }
        await loadAnswers(); await loadConversations(); await loadPosts();
      } catch(err){ console.error(err); }
    });
  }

  await loadAnswers();
  await loadConversations();
  await loadRatingsFromAPI(); // noop
  await loadPosts();
  setupLightboxRoot();
}

// ---- Lightbox para imágenes de posts ----
function setupLightboxRoot(){ if(document.getElementById('img-lightbox-root')) return; const div=document.createElement('div'); div.id='img-lightbox-root'; div.innerHTML=`<div class="img-lightbox-backdrop" data-close="lb"><figure class="img-lightbox-figure"><img alt="Imagen del post" class="img-lightbox-img" /><figcaption class="img-lightbox-caption"></figcaption><button type="button" class="img-lightbox-close" data-close="lb" aria-label="Cerrar">×</button></figure></div>`; document.body.appendChild(div); div.addEventListener('click', e=>{ if(e.target.dataset.close==='lb') closeLightbox(); }); document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });
}
function openLightbox(src, caption=''){ const root=document.getElementById('img-lightbox-root'); if(!root) return; root.querySelector('.img-lightbox-img').src=src; const capEl=root.querySelector('.img-lightbox-caption'); if(caption){ capEl.textContent=caption; capEl.style.display='block'; } else { capEl.textContent=''; capEl.style.display='none'; } root.classList.add('is-open'); document.body.classList.add('lightbox-open'); }
function closeLightbox(){ const root=document.getElementById('img-lightbox-root'); if(!root) return; root.classList.remove('is-open'); document.body.classList.remove('lightbox-open'); }
function attachImageLightboxHandlers(){ const boxes=document.querySelectorAll('.post-image-box[data-full]'); boxes.forEach(box=>{ if(box.dataset.lbBound) return; box.dataset.lbBound='1'; box.style.cursor=box.classList.contains('is-empty')?'default':'zoom-in'; if(!box.classList.contains('is-empty')){ box.addEventListener('click', ()=>{ const src=box.dataset.full; const caption=box.closest('.post-card')?.querySelector('h4')?.textContent||''; openLightbox(src, caption); }); } }); }
