// Dashboard view logic (fetching and rendering)
// Manages loading of posts, answers and conversations (replies to answers)
// Real validation should happen in backend.


const API_BASE = (import.meta.env.VITE_API_BASE ?? 'https://stack4us.up.railway.app').replace(/\/$/, '');
const DEFAULT_AVATAR = '/img/qlementine-icons_user-16.png';
let RATINGS_ENABLED = true; // se ajustará tras detección
let USE_API_PREFIX = false;
let RATINGS_BACKEND_AVAILABLE = true; // nuevo flag

function buildEndpoints(){
  const p = USE_API_PREFIX ? '/api' : '';
  return {
    // Core app
    listPosts: `${p}/posts/all`,
    createPost: `${p}/posts/insert`,
    deletePost: id => `${p}/posts/${id}`,
    listAnswers: `${p}/answers`,
    createAnswer: `${p}/answers`,
    deleteAnswer: id => `${p}/answers/${id}`,
    listConversations: `${p}/conversations`,
    createConversation: `${p}/conversations`,
    deleteConversation: id => `${p}/conversations/${id}`,
    listUsers: `${p}/users/all`,
    ratingsSummary: `${p}/ratings/answers-summary`,
    myRatings: `${p}/ratings/my-ratings`,
    createRating: `${p}/ratings`,            // <--- NUEVO endpoint principal POST
    legacyRateAnswer: id => `${p}/answers/${id}/rate`, // <--- fallback legacy

    // Stack Overflow (vía backend)
    soHot:    `${p}/stackoverflow/hot`,
    soNewest: `${p}/stackoverflow/newest`,
    soSearch: `${p}/stackoverflow/search`,
    soAnswers: id => `${p}/stackoverflow/${id}/answers`,
  };
}
let ENDPOINTS = buildEndpoints();

async function detectBackendStyle(){
  let apiMode=false;
  // For production domains force /api
  if(/railway\.app$/i.test(new URL(API_BASE).host)) {
    apiMode=true;
  } else {
    try{ const r=await fetch(`${API_BASE}/api/answers`, {method:'GET'}); if(r.ok || r.status===401 || r.status===403){ apiMode=true; } }catch{}
  }
  USE_API_PREFIX = apiMode;
  ENDPOINTS = buildEndpoints();
  if(!apiMode){
    ENDPOINTS.listPosts = '/all-posts';
    ENDPOINTS.createPost = '/insert-post';
    ENDPOINTS.deletePost = id => `/post/${id}`;
    ENDPOINTS.createAnswer = '/answer';
    ENDPOINTS.deleteAnswer = id => `/answer/${id}`;
    ENDPOINTS.createConversation = '/conversation';
    ENDPOINTS.deleteConversation = id => `/owns-conversation/${id}`;
    ENDPOINTS.listUsers = '/Users';

    // legacy ratings si aplica
    ENDPOINTS.ratingsSummary = '/answers/ratings-summary';
    ENDPOINTS.myRatings      = '/my-answer-ratings';
    ENDPOINTS.rateAnswer     = id => `/answers/${id}/rate`;

    // StackOverflow: mantenemos los /stackoverflow/* igual, porque van por app actual
  }
  // detectar endpoints de rating reales
  RATINGS_BACKEND_AVAILABLE = await detectRatingsEndpoints();
  RATINGS_ENABLED = true; // siempre mostramos UI
}
async function detectRatingsEndpoints(){
  try{ const r=await fetch(`${API_BASE}${ENDPOINTS.ratingsSummary}`); if(r.ok) return true; }catch{}
  // si caemos aquí, ya ajustamos arriba a legacy; si tampoco existe, deshabilitar
  return false;
}

// ============ AUTH HELPERS ============
// helpers chicos para evitar crashes
const safe = (v, d='') => (v ?? d);
const escapeHtml = (s) =>
  safe(String(s))
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');

function looksLikeJWT(t){ return typeof t==='string' && t.split('.').length===3; }
function getToken(){ const raw=(localStorage.getItem('token')||'').trim(); return looksLikeJWT(raw)?raw:null; }
function buildAuthHeaders(body, extra={}){ const token=getToken(); const base=(body instanceof FormData)?{...(extra||{})}:{'Content-Type':'application/json',...(extra||{})}; return token?{...base,Authorization:`Bearer ${token}`} : base; }
async function apiFetch(path,opt={}){ const url=path.startsWith('http')?path:`${API_BASE}${path}`; const headers=buildAuthHeaders(opt.body,opt.headers); const resp=await fetch(url,{...opt,headers}); if(resp.status===401||resp.status===403){ alert('Session expired. Please log in again.'); localStorage.removeItem('token'); localStorage.setItem('Auth','false'); try{ const {navigate}=await import('../main'); navigate('/login'); }catch{} throw new Error('Unauthorized'); } return resp; }

// ============ CONVERSATIONS & USERS CACHE ============
let conversationsCache=[]; // lista de conversation
let usersMap=new Map(); // user_id -> user
function groupConversations(list){ const m=new Map(); list.forEach(c=>{ const arr=m.get(c.answer_id)||[]; arr.push(c); m.set(c.answer_id,arr); }); return m; }
function userName(id){ const u=usersMap.get(Number(id)); return u?.user_name || `User #${id}`; }
function userAvatar(id){ const u=usersMap.get(Number(id)); return u?.profile_image || DEFAULT_AVATAR; }

// ============ RENDER DE CARDS ============
const STAR_MAX = 5;
let ratingsSummaryMap = new Map(); // answer_id -> {avg,count}
let myRatingsMap = new Map();      // answer_id -> myRating

function renderStars(answerId, avg, myRating, disabled){
  const roundAvg = isFinite(avg)? (Math.round(avg*10)/10).toFixed(1) : '0.0';
  const stars = Array.from({length:STAR_MAX}, (_,i)=>{
    const v=i+1;
    const filled = myRating? v<=myRating : v<=Math.round(avg||0);
    return `<span class="star ${filled?'filled':'empty'}" data-answer="${answerId}" data-value="${v}" title="${v}">${filled?'★':'☆'}</span>`;
  }).join('');
  return `<div class="rating" data-answer="${answerId}" style="display:flex;align-items:center;gap:4px;${disabled?'pointer-events:none;opacity:.6':''}">${stars}<span class="rate-avg" style="font-size:11px;color:#666;margin-left:6px">(${roundAvg})</span></div>`;
}
async function loadRatingsFromAPI(){
  if(!RATINGS_ENABLED) return;
  if(!RATINGS_BACKEND_AVAILABLE) return;
  let summary=[];
  try{ summary=await getJSON(`${API_BASE}${ENDPOINTS.ratingsSummary}`);}catch{ summary=[]; }
  ratingsSummaryMap.clear();
  summary.forEach(r=> ratingsSummaryMap.set(Number(r.answer_id), {avg:Number(r.avg_rating)||0, count:Number(r.ratings_count)||0}));
  myRatingsMap.clear();
  if(getToken()){
    try{
      const mine=await apiFetch(ENDPOINTS.myRatings).then(r=>r.ok?r.json():[]);
      mine.forEach(r=> myRatingsMap.set(Number(r.answer_id), Number(r.rating)));
    }catch{}
  }
}
function injectRatingsUI(rootEl, answersCache){
  const me=Number(localStorage.getItem('user_id')||0);
  rootEl.querySelectorAll('.rating-slot[data-answer]').forEach(slot=>{
    const answerId=Number(slot.dataset.answer);
    const info=ratingsSummaryMap.get(answerId)||{avg:0,count:0};
    const myR=myRatingsMap.get(answerId)||null;
    const aObj=answersCache.find(a=>Number(a.answer_id)===answerId);
    const isMine=aObj && Number(aObj.user_id)===me;
    slot.innerHTML=`${renderStars(answerId, info.avg, myR, isMine)}<small style='display:block;text-align:right;color:#888;margin-top:2px'>${info.count||0} vote(s)</small>`;
  });
}

// >>>>>>>>>>>>>>>>>>  FIX: postCard SIN authorAvatar/authorName globales  <<<<<<<<<<<<<<<<<
function postCard(post, answersByPost, convByAnswer){
  // rol y permisos
  let role = localStorage.getItem('role');
  if(role==='1') role='coder'; else if(role==='2') role='team_leader'; else if(role==='3') role='admin';

  const me = Number(localStorage.getItem('user_id'));
  const isOwner = Number(post.user_id)===me;
  const canEdit = (role==='admin') || (role==='coder'&&isOwner) || (role==='team_leader'&&isOwner);
  const canDelete = (role==='admin') || (role==='team_leader') || (role==='coder'&&isOwner);

  // autor del post (con fallbacks seguros)
  const author = userName(post.user_id);
  const avatar = userAvatar(post.user_id);

  // imagen
  const hasImg = !!(post.image && String(post.image).trim());
  const imageBox = hasImg
    ? `<div class="post-image-box" data-full="${post.image}"><img src="${post.image}" alt="post image" onerror="this.parentNode.classList.add('is-error');this.remove();"></div>`
    : `<div class="post-image-box is-empty">IMG</div>`;

  // answers + conversaciones
  const answers = answersByPost.get(post.post_id)||[];
  const answersCount = answers.length;
  const answersHTML = answersCount ? `<div class="answers-wrap" style="margin-top:8px">${answers.map(a=>{
    const convs = convByAnswer.get(a.answer_id)||[];
    const convHTML = convs.length ? `<div class='conversation-thread'>${convs.map(c=>{
      const raw=c.description||'';
      const directed=raw.match(/^@(\S+)/);
      const bodyHTML=escapeHtml(raw).replace(/^@(\S+)/,(m,u)=>`<span class='mention'>@${u}</span>`);
      const canDelConv = me===Number(c.user_id);
      return `<div class='conversation-item${directed?' is-directed':''}' data-conv='${c.conversation_id}'>
        <div class='ig-comment-line'>
          <img class='ig-avatar' src='${userAvatar(c.user_id)}' alt='avatar'
               style='width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:4px;'
               onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" />
          <span class='ig-user'>${escapeHtml(userName(c.user_id))}</span>
          <span class='ig-text'>${bodyHTML}</span>
        </div>
        <div class='ig-actions-row'>
          <button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${c.user_id}' data-source='conversation'>Reply</button>
          ${canDelConv?`<button class='ig-action comment-delete' data-type='conversation' data-conv='${c.conversation_id}'>Delete</button>`:''}
        </div>
      </div>`;
    }).join('')}</div>`: '';
    const canDelAnswer = (role==='admin') || me===Number(a.user_id);
    return `<div class='answer-item ig-comment' data-answer='${a.answer_id}'>
      <div class='ig-comment-line'>
        <img class='ig-avatar' src='${userAvatar(a.user_id)}' alt='avatar'
             style='width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:6px;'
             onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" />
        <span class='ig-user'>${escapeHtml(userName(a.user_id))}</span>
        <span class='ig-text'>${escapeHtml(a.description||'')}</span>
      </div>
      <div class='ig-actions-row'>
        <button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${a.user_id}' data-source='answer'>Reply</button>
        ${canDelAnswer?`<button class='ig-action comment-delete' data-type='answer' data-answer='${a.answer_id}'>Delete</button>`:''}
        <div class='rating-slot' data-answer='${a.answer_id}'></div>
      </div>
      <div class='ig-replies'>${convHTML}</div>
    </div>`;
  }).join('')}</div>` : '';

  return `<article class="card post-card" data-post="${post.post_id}">
    <h4>${escapeHtml(post.title || '')}</h4>
    <div class="post-meta">
      <span class="post-author">
        <img class="post-author-avatar" src="${avatar}" alt="avatar"
             onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" />
        ${escapeHtml(author)}
      </span>
      · <span>Type: ${escapeHtml(post.type||'-')}</span>
      · <span>Status: ${escapeHtml(post.status||'unsolved')}</span>
    </div>
    <p class="post-desc">${escapeHtml(post.description||'')}</p>
    ${imageBox}
    <div class="post-actions">
      ${canEdit?`<button class='btn-edit' data-id='${post.post_id}'>Edit</button>`:''}
      ${canDelete?`<button class='btn-delete' data-id='${post.post_id}'>Delete</button>`:''}
    </div>
    <button type='button' class='answers-toggle' data-post='${post.post_id}' data-count='${answersCount}'>Show answers (${answersCount})</button>
    <div class='answers-section' data-post='${post.post_id}' hidden>
      ${answersHTML}
      <form class='answer-form' data-post='${post.post_id}'>
        <input name='description' placeholder='Add answer...'>
        <button type='submit'>Send</button>
      </form>
    </div>
  </article>`;
}
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

async function getJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); }

// ================= STACK OVERFLOW WIDGET (FRONT) =================
function soQS(params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = v;
  }
  return new URLSearchParams(out).toString();
}
async function soFetch(endpoint, params = {}) {
  const url = `${API_BASE}${endpoint}?${soQS(params)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('SO fetch failed');
  return r.json();
}
function renderSOItem(q){
  const title = q.title || 'Untitled';
  const link  = q.link  || '#';
  const score = q.score ?? 0;
  const owner = q.owner?.display_name || 'user';
  const tags  = (q.tags||[]).map(t=>`<span class="so-tag">${t}</span>`).join(' ');
  return `<div class="so-item">
    <a class="so-title" href="${link}" target="_blank" rel="noopener">${title}</a>
    <div class="so-meta">
      <span class="so-score">▲ ${score}</span>
      <span class="so-owner">by ${owner}</span>
      <span class="so-tags">${tags}</span>
    </div>
  </div>`;
}
function mountStackOverflowWidget(){
  // Elementos esperados en dashboard.html (si no existen, no hace nada)
  const box     = document.getElementById('so-box');
  const form    = document.getElementById('so-form');
  const inputQ  = document.getElementById('so-q');
  const inputT  = document.getElementById('so-tags');
  const limitEl = document.getElementById('so-limit');
  const btnHot  = document.getElementById('so-hot');
  const btnNew  = document.getElementById('so-newest');
  const results = document.getElementById('so-results');
  const counter = document.getElementById('so-counter');
  if(!box || !results) return; // no está el widget en el HTML

  async function paint(items){
    results.innerHTML = items.map(renderSOItem).join('') || `<div class="so-empty">No results.</div>`;
    if(counter) counter.textContent = `${items.length} result(s)`;
  }
  async function runHot(){
    results.innerHTML = `<div class="so-loading">Loading…</div>`;
    try{
      const data = await soFetch(ENDPOINTS.soHot, { pagesize: limitEl?.value || 10, tagged: inputT?.value || '' });
      await paint(data.items || []);
    }catch(err){ results.innerHTML = `<div class="so-error">Error loading hot questions.</div>`; console.error(err); }
  }
  async function runNewest(){
    results.innerHTML = `<div class="so-loading">Loading…</div>`;
    try{
      const data = await soFetch(ENDPOINTS.soNewest, { pagesize: limitEl?.value || 10, tagged: inputT?.value || '' });
      await paint(data.items || []);
    }catch(err){ results.innerHTML = `<div class="so-error">Error loading newest.</div>`; console.error(err); }
  }
  async function runSearch(q){
    results.innerHTML = `<div class="so-loading">Searching…</div>`;
    try{
      const data = await soFetch(ENDPOINTS.soSearch, { q, tagged: inputT?.value || '', pagesize: limitEl?.value || 10 });
      await paint(data.items || []);
    }catch(err){ results.innerHTML = `<div class="so-error">Error searching.</div>`; console.error(err); }
  }

  // Listeners
  if(form){
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const q = inputQ?.value?.trim();
      if(q) runSearch(q);
      else runHot();
    });
  }
  if(btnHot)  btnHot.addEventListener('click', e=>{ e.preventDefault(); runHot(); });
  if(btnNew)  btnNew.addEventListener('click', e=>{ e.preventDefault(); runNewest(); });

  // carga inicial
  runHot();
}

// ================== FIN STACK OVERFLOW ===========================

export async function renderDashboardAfterTemplateLoaded(){

  document.body.classList.add('has-dashboard');

  await detectBackendStyle();

  // ==== Sidebar user card population ====
  function fillSidebarUser(){
    const nameEl=document.getElementById('navUserName');
    const roleEl=document.getElementById('navUserRole');
    const avatarEl=document.getElementById('sidebarAvatar');
    const uid = Number(localStorage.getItem('user_id'));
    let role = localStorage.getItem('role')||'';
    if(role==='1') role='coder'; else if(role==='2') role='team_leader'; else if(role==='3') role='admin';
    const cachedRaw = localStorage.getItem('user_profile');
    let cached; try{ cached=JSON.parse(cachedRaw||'null'); }catch{}
    const fallbackName = localStorage.getItem('user_name') || (cached?.user_name) || 'User';
    if(nameEl) nameEl.textContent = fallbackName;
    if(roleEl) roleEl.textContent = role ? role : 'role';
    const img = (cached?.profile_image) || localStorage.getItem('profile_image');
    if(avatarEl){
      if(img){
        avatarEl.innerHTML = '';
        avatarEl.style.background='transparent';
        avatarEl.style.padding='0';
        avatarEl.classList.add('has-img');
        avatarEl.innerHTML = `<img src='${img}' alt='avatar' style='width:100%;height:100%;object-fit:cover;border-radius:50%' onerror="this.remove();">`;
      } else {
        avatarEl.textContent='👤';
      }
    }
    // fetch fresh if not cached full profile
    if(!cached || !cached.profile_image){
      // best effort: if usersMap already loaded after loadUsers, will update again
      (async ()=>{
        try{
          const r=await apiFetch(ENDPOINTS.listUsers); if(!r.ok) return; const list=await r.json();
          const me=list.find(u=>Number(u.user_id)===uid);
          if(me){
            localStorage.setItem('user_profile', JSON.stringify(me));
            if(me.user_name && nameEl) nameEl.textContent=me.user_name;
            if(me.profile_image && avatarEl){
              avatarEl.innerHTML=`<img src='${me.profile_image}' alt='avatar' style='width:100%;height:100%;object-fit:cover;border-radius:50%' onerror="this.remove();">`;
            }
          }
        }catch{}
      })();
    }
  }
  fillSidebarUser();
  document.addEventListener('user:updated', fillSidebarUser);

  const qEl=document.getElementById('questions-count');
  const aEl=document.getElementById('answers-count');
  const pEl=document.getElementById('points-count');
  const postsEl=document.getElementById('posts');
  const form=document.getElementById('post-form');
  const hint=document.getElementById('post-hint');

  let answersCache=[];
  const expandedPosts = new Set();
  function groupAnswers(list){ const m=new Map(); list.forEach(a=>{ const arr=m.get(a.post_id)||[]; arr.push(a); m.set(a.post_id,arr); }); return m; }

  async function loadUsers(){ try{ const r=await apiFetch(ENDPOINTS.listUsers); if(r.ok){ const data=await r.json(); usersMap=new Map(data.map(u=>[Number(u.user_id),u])); try{ localStorage.setItem('all_users_cache', JSON.stringify(data)); const meId=Number(localStorage.getItem('user_id')); const me=data.find(u=>Number(u.user_id)===meId); if(me){ if(me.profile_image) localStorage.setItem('profile_image', me.profile_image); if(me.user_name) localStorage.setItem('user_name', me.user_name); localStorage.setItem('user_profile', JSON.stringify(me)); } }catch{} } }catch(err){ console.warn('Failed to load users', err); } }
  async function loadAnswers(){ answersCache = await getJSON(`${API_BASE}${ENDPOINTS.listAnswers}`); if(aEl) aEl.textContent=answersCache.length; if(pEl) pEl.textContent=String(answersCache.length*10); }
  async function loadConversations(){ try{ conversationsCache = await getJSON(`${API_BASE}${ENDPOINTS.listConversations}`);}catch{ conversationsCache=[]; } }
  async function loadPosts(){
    const posts = await getJSON(`${API_BASE}${ENDPOINTS.listPosts}`);
    let overrides={}; try{ overrides=JSON.parse(localStorage.getItem('post_overrides')||'{}'); }catch{}
    const merged = posts.map(p=> overrides[p.post_id]?{...p,...overrides[p.post_id]}:p);
    if(qEl) qEl.textContent=posts.length;
    const answersByPost = groupAnswers(answersCache);
    const convByAnswer = groupConversations(conversationsCache);
    if(postsEl){
      postsEl.innerHTML = merged.length
        ? merged.slice().reverse().map(p=>postCard(p,answersByPost,convByAnswer)).join('')
        : '<div class="card" style="padding:10px">No posts.</div>';
      if(RATINGS_ENABLED) injectRatingsUI(postsEl, answersCache);
      attachImageLightboxHandlers();
      // re-open previously expanded posts
      expandedPosts.forEach(pid=>{
        const section = postsEl.querySelector(`.answers-section[data-post='${pid}']`);
        const toggle = postsEl.querySelector(`.answers-toggle[data-post='${pid}']`);
        if(section){ section.removeAttribute('hidden'); if(toggle){ const c=toggle.dataset.count||'0'; toggle.textContent=`Hide answers (${c})`; } }
      });
    }
  }

  if(form){
  // Enhance fancy select components
  initFancySelects(form);
    form.addEventListener('submit', async e=>{
      e.preventDefault();
      if(hint) hint.textContent='Publishing…';
      try{
        const fd=new FormData(form);
        const uid=localStorage.getItem('user_id');
        if(uid) fd.set('user_id', uid);
        const type=String(fd.get('type')||'').trim().toLowerCase();
        const status=String(fd.get('status')||'').trim().toLowerCase();
        if(type) fd.set('type', type);
        if(status) fd.set('status', status);
        const r=await apiFetch(ENDPOINTS.createPost, {method:'POST', body:fd}); // NOW with auth
        if(!r.ok){
          let msg='Error creating post.';
            try{ const d=await r.json(); if(d?.detail||d?.error) msg=`Error creating post: ${d.detail||d.error}`; }catch{}
          throw new Error(msg);
        }
        form.reset();
        if(hint) hint.textContent='Post created!';
        await loadPosts();
      }catch(err){
        console.error(err);
        if(hint) hint.textContent=err.message||'Error creating post.';
      }
    });
  }

  if(postsEl){
    // actions (edit / delete)
    postsEl.addEventListener('click', async e=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const id=btn.dataset.id;
      if(btn.classList.contains('btn-delete')){
        if(!confirm('Delete post?')) return;
        try{
          const r=await apiFetch(ENDPOINTS.deletePost(id), {method:'DELETE'});
          if(r.ok){
            try{ const o=JSON.parse(localStorage.getItem('post_overrides')||'{}'); delete o[id]; localStorage.setItem('post_overrides', JSON.stringify(o)); }catch{}
            await loadPosts();
          } else {
            try{ const err=await r.json(); alert(err.error||'Error deleting'); }catch{}
          }
        }catch(err){ console.error(err); }
      }
      if(btn.classList.contains('btn-edit')){
        const article=btn.closest('article');
        const postId=id;
        const title=article.querySelector('h4')?.textContent||'';
        const desc=article.querySelector('p.post-desc')?.textContent||'';
        const meta=article.querySelector('.post-meta')?.textContent||'';
        let typeMatch=meta.match(/Tipo:\s*([^·]+)/i);
        let statusMatch=meta.match(/Estado:\s*([^·]+)/i);
        const type=typeMatch?typeMatch[1].trim().replace(/\.$/,''):'';
        const status=statusMatch?statusMatch[1].trim().replace(/\.$/,''):'';
        const image=article.querySelector('.post-image-box img')?.getAttribute('src')||'';
        const postData={post_id:postId,title,description:desc,type,status,image};
        sessionStorage.setItem('edit_post', JSON.stringify(postData));
        import('../main').then(m=>m.navigate('/edit-post'));
      }
    });

    // nueva answer
    postsEl.addEventListener('submit', async e=>{
      const aForm=e.target.closest('.answer-form');
      if(!aForm) return;
      e.preventDefault();
      const postId=aForm.getAttribute('data-post');
      const input=aForm.querySelector('input[name="description"]');
      const txt=(input?.value||'').trim();
      if(!txt) return;
      const uid=localStorage.getItem('user_id');
      if(!uid){ alert('Invalid session'); return; }
      const fd=new FormData();
      fd.append('description', txt);
      fd.append('user_id', uid);
      fd.append('post_id', postId);
      try{
        const r=await apiFetch(ENDPOINTS.createAnswer, {method:'POST', body:fd});
        if(r.ok){
          input.value='';
          await loadAnswers();
          await loadConversations();
          await loadPosts();
        } else {
          console.error(await r.json().catch(()=>({})));
        }
      }catch(err){ console.error(err); }
    });

    // reply a answer / conversation (form inline)
    postsEl.addEventListener('click', e=>{
      const trigger=e.target.closest('.reply-trigger');
      if(!trigger) return;
      e.preventDefault();
      const answerId=trigger.getAttribute('data-answer');
      const userId=trigger.getAttribute('data-user');
      const answerBox=trigger.closest('.answer-item');
      if(!answerBox) return;
      answerBox.querySelectorAll('form.conversation-form').forEach(f=>f.remove());
      const form=document.createElement('form');
      form.className='conversation-form';
      form.setAttribute('data-answer', answerId);
      if(userId) form.setAttribute('data-target', userId);
      form.innerHTML=`<div class='reply-context'>Replying to <b>${escapeHtml(userName(userId))}</b></div><input name='description' placeholder='Write your reply...'/><button type='submit'>↳</button>`;
      const anchor=trigger.closest('.ig-actions-row')||answerBox;
      anchor.insertAdjacentElement('afterend', form);
      form.querySelector('input').focus();
    });

    // send reply
    postsEl.addEventListener('submit', async e=>{
      const cForm=e.target.closest('.conversation-form');
      if(!cForm) return;
      e.preventDefault();
      const answerId=cForm.getAttribute('data-answer');
      const input=cForm.querySelector('input[name="description"]');
      const targetUserId=cForm.getAttribute('data-target');
      let txt=(input?.value||'').trim();
      if(!txt) return;
      const uid=localStorage.getItem('user_id');
      if(!uid){ alert('Invalid session'); return; }
      if(targetUserId && !txt.startsWith('@')){
        const uname=userName(targetUserId).replace(/\s+/g,'');
        txt=`@${uname} ${txt}`;
      }
      const fd=new FormData();
      fd.append('description', txt);
      fd.append('user_id', uid);
      fd.append('answer_id', answerId);
      try{
        const r=await apiFetch(ENDPOINTS.createConversation, {method:'POST', body:fd});
        if(r.ok){
          input.value='';
          await loadConversations();
          await loadPosts();
        } else {
          let errInfo={}; try{ errInfo=await r.json(); }catch{}
          alert(errInfo.error||'Error sending');
        }
      }catch(err){ console.error(err); }
    });

    // delete answer or conversation
    postsEl.addEventListener('click', async e=>{
      const del=e.target.closest('.comment-delete');
      if(!del) return;
      e.preventDefault();
      if(!confirm('Delete?')) return;
      const type=del.dataset.type;
      const id=del.dataset.answer||del.dataset.conv;
      try{
        if(type==='answer'){
          const r=await apiFetch(ENDPOINTS.deleteAnswer(id), {method:'DELETE'});
          if(!r.ok) console.error('Fail delete answer', await r.json().catch(()=>({}))); else {}
        } else {
          const r=await apiFetch(ENDPOINTS.deleteConversation(id), {method:'DELETE'});
          if(!r.ok) console.error('Fail delete conv', await r.json().catch(()=>({}))); else {}
        }
        await loadAnswers();
        await loadConversations();
        await loadPosts();
      }catch(err){ console.error(err); }
    });

    // ratings
    postsEl.addEventListener('click', async e=>{
      const star=e.target.closest('.star'); if(star){
        if(!RATINGS_ENABLED) return;
        if(!RATINGS_BACKEND_AVAILABLE){ return alert('Ratings not yet available on this server'); }
        const answerId=Number(star.dataset.answer); const value=Number(star.dataset.value);
        if(!getToken()) return alert('Log in again');
        const aObj=answersCache.find(a=>Number(a.answer_id)===answerId); if(!aObj) return;
        if(Number(aObj.user_id)===Number(localStorage.getItem('user_id'))) return alert('You cannot rate your own answer');
        if(myRatingsMap.has(answerId)) return alert('You already rated');
        if(!(value>=1&&value<=STAR_MAX)) return;
        try{
          // Intento 1: endpoint nuevo /ratings (body incluye answer_id)
          let r = await apiFetch(ENDPOINTS.createRating, {method:'POST', body:JSON.stringify({answer_id:answerId, rating:value})});
          if(!r.ok){
            if(r.status===404 || r.status===405){
              // Fallback legacy /answers/:id/rate (body sólo rating)
              r = await apiFetch(ENDPOINTS.legacyRateAnswer(answerId), {method:'POST', body:JSON.stringify({rating:value})});
            }
          }
          if(!r.ok){ const err=await r.json().catch(()=>({})); return alert(err.error||'Rating error'); }
          await loadRatingsFromAPI();
          await loadPosts();
        }catch(err){ console.error('Rating network error', err); alert('Network error sending rating'); }
      }
    });

    // toggle answers collapse
    postsEl.addEventListener('click', e=>{
      const t=e.target.closest('.answers-toggle');
      if(!t) return;
      e.preventDefault();
      const pid=t.getAttribute('data-post');
      const section=postsEl.querySelector(`.answers-section[data-post='${pid}']`);
      if(!section) return;
      const count=t.dataset.count||'0';
      const hidden=section.hasAttribute('hidden');
      if(hidden){
        section.removeAttribute('hidden');
        t.textContent=`Hide answers (${count})`;
        expandedPosts.add(pid);
      } else {
        section.setAttribute('hidden','');
        t.textContent=`Show answers (${count})`;
        expandedPosts.delete(pid);
      }
    });
  }

  await loadUsers();
  await loadAnswers();
  if(RATINGS_ENABLED) await loadRatingsFromAPI();
  await loadConversations();
  await loadPosts();
  const focusId = sessionStorage.getItem('focus_post_id');
  if(focusId){
    sessionStorage.removeItem('focus_post_id');
    const el = document.querySelector(`article.post-card[data-post='${focusId}']`) || document.querySelector(`form.answer-form[data-post='${focusId}']`)?.closest('article');
    if(el){
      const section=el.querySelector('.answers-section');
      const toggle=el.querySelector('.answers-toggle');
      if(section && section.hasAttribute('hidden')){ section.removeAttribute('hidden'); if(toggle){ const c=toggle.dataset.count||'0'; toggle.textContent=`Hide answers (${c})`; } expandedPosts.add(focusId); }
    }
  }
  // Finder en el panel y FAB flotante
  mountStackOverflowWidget();
  setupSOFab();
  setupLightboxRoot();
}

// ============ LIGHTBOX IMG ============
function setupLightboxRoot(){
  if(document.getElementById('img-lightbox-root')) return;
  const div=document.createElement('div');
  div.id='img-lightbox-root';
  div.innerHTML=`<div class="img-lightbox-backdrop" data-close="lb"><figure class="img-lightbox-figure"><img alt="Post image" class="img-lightbox-img" /><figcaption class="img-lightbox-caption"></figcaption><button type="button" class="img-lightbox-close" data-close="lb" aria-label="Close">×</button></figure></div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e=>{ if(e.target.dataset.close==='lb') closeLightbox(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });
}
function openLightbox(src, caption=''){
  const root=document.getElementById('img-lightbox-root');
  if(!root) return;
  const imgEl=root.querySelector('.img-lightbox-img');
  if(imgEl) imgEl.src=src;
  const cap=root.querySelector('.img-lightbox-caption');
  if(cap){
    if(caption){ cap.textContent=caption; cap.style.display='block'; }
    else { cap.textContent=''; cap.style.display='none'; }
  }
  root.classList.add('is-open');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  const root=document.getElementById('img-lightbox-root');
  if(!root) return;
  root.classList.remove('is-open');
  document.body.style.overflow='';
}
function attachImageLightboxHandlers(){
  document.querySelectorAll('.post-image-box').forEach(box=>{
    if(box.dataset.lbBound) return;
    box.dataset.lbBound='1';
    if(box.classList.contains('is-empty')||box.classList.contains('is-error')) return;
    box.style.cursor='zoom-in';
    box.addEventListener('click', ()=>{
      const src=box.getAttribute('data-full')||box.querySelector('img')?.getAttribute('src');
      openLightbox(src||'', '');
    });
  });
}

// ===== StackOverflow Finder – FAB + Modal =====
const SO_MODAL_ID = 'so-modal';

function buildSOFinderMarkup() {
  return `
    <div class="so-finder">
      <form class="so-form" id="so-form-modal">
        <div class="so-fields">
          <input id="so-q-modal" class="so-input" type="search" placeholder="Search on Stack Overflow… (e.g. 'array map')" />
          <input id="so-tags-modal" class="so-input" type="text" placeholder="Tags (e.g. javascript, react)" />
          <label class="so-limit">
            <span>Limit</span>
            <select id="so-limit-modal">
              <option value="5" selected>5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </label>
          <button class="so-submit" type="submit">Search</button>
        </div>
      </form>

      <div class="so-toolbar">
        <button class="btn so-hot" type="button">🔥 Hot</button>
        <button class="btn so-newest" type="button">🆕 Newest</button>
      </div>

      <div class="so-results-wrap">
        <div id="so-results-modal" class="so-results"></div>
      </div>
    </div>
  `;
}

function ensureSOFinderModal() {
  if (document.getElementById(SO_MODAL_ID)) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'so-modal-backdrop';
  backdrop.id = SO_MODAL_ID;
  backdrop.innerHTML = `
    <div class="so-modal-card" role="dialog" aria-modal="true" aria-labelledby="so-modal-title">
      <button class="so-modal-close" data-close-modal="so" aria-label="Close">×</button>
      <h3 id="so-modal-title" class="so-modal-title">Stack Overflow Finder</h3>
      ${buildSOFinderMarkup()}
    </div>
  `;
  document.body.appendChild(backdrop);

  // Cerrar al hacer click fuera o en el botón ×
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.dataset.closeModal === 'so') closeSOFinderModal();
  });

  initSOFinder(backdrop.querySelector('.so-finder'));
}

function openSOFinderModal() {
  ensureSOFinderModal();
  document.body.classList.add('so-modal-open');
  document.getElementById(SO_MODAL_ID)?.classList.add('is-open');
  document.getElementById(SO_MODAL_ID)?.querySelector('#so-q-modal')?.focus();
}

function closeSOFinderModal() {
  document.body.classList.remove('so-modal-open');
  document.getElementById(SO_MODAL_ID)?.classList.remove('is-open');
}

function setupSOFab() {
  const fab = document.getElementById('soFab');
  if(!fab) return; // rely only on template button
  if (fab.dataset.bound === '1') return;
  fab.addEventListener('click', openSOFinderModal);
  fab.dataset.bound = '1';
}

// ============ Fancy Select (custom dropdown) ============
function initFancySelects(root){
  const selects = Array.from(root.querySelectorAll('.fancy-select'));
  if(!selects.length) return;
  function closeAll(except){
    selects.forEach(s=>{ if(s!==except){ s.classList.remove('open'); const btn=s.querySelector('.fs-trigger'); if(btn) btn.setAttribute('aria-expanded','false'); }});
  }
  selects.forEach(wrap=>{
    const btn = wrap.querySelector('.fs-trigger');
    const list = wrap.querySelector('.fs-options');
    const hidden = wrap.querySelector('input[type=hidden]');
    if(!btn || !list || !hidden) return;
    btn.addEventListener('click', e=>{
      const isOpen = wrap.classList.contains('open');
      if(isOpen){ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
      else { closeAll(wrap); wrap.classList.add('open'); btn.setAttribute('aria-expanded','true'); positionList(wrap); }
    });
    list.addEventListener('click', e=>{
      const li=e.target.closest('li[data-value]'); if(!li) return;
      const val=li.dataset.value; const label=li.textContent.trim();
      hidden.value=val; btn.textContent=label; list.querySelectorAll('li').forEach(n=>{ n.classList.toggle('selected', n===li); n.removeAttribute('aria-selected'); });
      li.setAttribute('aria-selected','true'); wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); btn.focus();
    });
    // keyboard navigation
    btn.addEventListener('keydown', e=>{
      if(['ArrowDown','Enter',' '].includes(e.key)){ e.preventDefault(); if(!wrap.classList.contains('open')){ btn.click(); } else { focusFirst(); } }
      if(e.key==='ArrowUp'){ e.preventDefault(); btn.click(); }
    });
    function focusFirst(){ const first=list.querySelector('li'); if(first){ first.focus?.(); } }
    list.addEventListener('keydown', e=>{
      const items=Array.from(list.querySelectorAll('li'));
      const current=document.activeElement.closest('li');
      let idx=items.indexOf(current);
      if(e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(items.length-1, idx+1); items[idx].focus?.(); }
      if(e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(0, idx-1); items[idx].focus?.(); }
      if(e.key==='Home'){ e.preventDefault(); items[0].focus?.(); }
      if(e.key==='End'){ e.preventDefault(); items[items.length-1].focus?.(); }
      if(e.key==='Escape'){ e.preventDefault(); wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); btn.focus(); }
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); current?.click(); }
    });
    // roles & tabindex for items
    list.querySelectorAll('li').forEach(li=>{ li.setAttribute('tabindex','-1'); });
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('.fancy-select')) closeAll(); });
  window.addEventListener('resize', ()=> selects.forEach(positionList));
  function positionList(wrap){
    const list=wrap.querySelector('.fs-options'); const btn=wrap.querySelector('.fs-trigger'); if(!list||!btn) return;
    list.style.top='100%'; list.style.bottom='auto'; list.style.maxHeight='270px';
    const rect=list.getBoundingClientRect(); const vh=window.innerHeight; if(rect.bottom>vh-12){
      list.style.top='auto'; list.style.bottom=`calc(100% + 4px)`; const r2=list.getBoundingClientRect(); if(r2.top<8){ list.style.maxHeight=`${rect.height - (8-r2.top)}px`; }
    }
  }
}

// Carga de resultados y binding dentro del modal
function initSOFinder(root) {
  const form = root.querySelector('#so-form-modal');
  const q = root.querySelector('#so-q-modal');
  const tags = root.querySelector('#so-tags-modal');
  const limit = root.querySelector('#so-limit-modal');
  const results = root.querySelector('#so-results-modal');
  const btnHot = root.querySelector('.so-hot');
  const btnNewest = root.querySelector('.so-newest');

  function renderItem(it) {
    const owner = it.owner || {};
    const tagHtml = (it.tags || []).map(t => `<span class="so-tag">${t}</span>`).join('');
    const score = it.score ?? 0;
    const ans = it.answer_count ?? 0;
    const zero = ans > 0 ? '' : 'is-zero';
    return `
      <article class="so-item">
        <div>
          <h3 class="so-title"><a href="${it.link}" target="_blank" rel="noopener">${it.title}</a></h3>
          <div class="so-meta">
            <span class="so-badge"><span class="so-score">▲ ${score}</span></span>
            <span class="so-badge"><span class="so-answers-count ${zero}">💬 ${ans}</span></span>
            <span class="so-owner">
              ${owner.profile_image ? `<img src="${owner.profile_image}" alt="">` : ''}
              <span>${owner.display_name || 'unknown'}</span>
            </span>
          </div>
          <div class="so-tags">${tagHtml}</div>
        </div>
      </article>
    `;
  }

  async function run(kind, params = {}) {
    results.innerHTML = `<div class="so-empty">Searching…</div>`;

    const map = {
      hot:    ENDPOINTS.soHot,
      newest: ENDPOINTS.soNewest,
      search: ENDPOINTS.soSearch,
    };
    const base = map[kind];
    if (!base) return;

    const u = new URL(`${API_BASE}${base}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        u.searchParams.set(k, v);
      }
    });

    const r = await fetch(u);
    const data = await r.json().catch(() => ({}));
    const items = data.items || [];
    results.innerHTML = items.length
      ? items.map(renderItem).join('')
      : `<div class="so-empty">No results</div>`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run('search', { q: q.value.trim(), tagged: tags.value.trim(), pagesize: limit.value });
  });
  btnHot.addEventListener('click', () => {
    run('hot', { tagged: tags.value.trim(), pagesize: limit.value });
  });
  btnNewest.addEventListener('click', () => {
    run('newest', { tagged: tags.value.trim(), pagesize: limit.value });
  });

  // Primera carga por defecto
  run('hot', { tagged: 'javascript', pagesize: 5 });
}
