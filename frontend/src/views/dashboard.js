// Dashboard view logic (fetching and rendering)
// Administra carga de posts, answers y conversaciones (replies a answers)
// Validaciones reales van en el backend.

const API_BASE = 'https://stack4us.up.railway.app';
const DEFAULT_AVATAR = '/src/assets/img/qlementine-icons_user-16.png';
let RATINGS_ENABLED = true; // se ajustará tras detección
let USE_API_PREFIX = false;
let RATINGS_BACKEND_AVAILABLE = true; // nuevo flag

function buildEndpoints(){
  const p = USE_API_PREFIX ? '/api' : '';
  return {
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
    // Nuevo endpoint unificado para insertar rating (POST /api/ratings {answer_id,rating})
    rateAnswer: id => `${p}/ratings`
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
  }
  // detectar endpoints de rating reales
  RATINGS_BACKEND_AVAILABLE = await detectRatingsEndpoints();
  RATINGS_ENABLED = true; // siempre mostramos UI
}
async function detectRatingsEndpoints(){
  // primero intenta /api/ratings (o sin prefijo si legacy detectado)
  try{ const r=await fetch(`${API_BASE}${ENDPOINTS.ratingsSummary}`); if(r.ok) return true; }catch{}
  // fallback legacy viejo (/answers/ratings-summary y /my-answer-ratings)
  try{
    const legacySummary = '/answers/ratings-summary';
    const test = await fetch(`${API_BASE}${legacySummary}`);
    if(test.ok){
      ENDPOINTS.ratingsSummary = legacySummary;
      ENDPOINTS.myRatings = '/my-answer-ratings';
      ENDPOINTS.rateAnswer = id => `/answers/${id}/rate`;
      return true;
    }
  }catch{}
  return false;
}

// ============ AUTH HELPERS ============
function looksLikeJWT(t){ return typeof t==='string' && t.split('.').length===3; }
function getToken(){ const raw=(localStorage.getItem('token')||'').trim(); return looksLikeJWT(raw)?raw:null; }
function buildAuthHeaders(body, extra={}){ const token=getToken(); const base=(body instanceof FormData)?{...(extra||{})}:{'Content-Type':'application/json',...(extra||{})}; return token?{...base,Authorization:`Bearer ${token}`} : base; }
async function apiFetch(path,opt={}){ const url=path.startsWith('http')?path:`${API_BASE}${path}`; const headers=buildAuthHeaders(opt.body,opt.headers); const resp=await fetch(url,{...opt,headers}); if(resp.status===401||resp.status===403){ alert('Sesión expirada. Inicia otra vez.'); localStorage.removeItem('token'); localStorage.setItem('Auth','false'); try{ const {navigate}=await import('../main'); navigate('/login'); }catch{} throw new Error('Unauthorized'); } return resp; }

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
  const stars = Array.from({length:STAR_MAX}, (_,i)=>{ const v=i+1; const filled = myRating? v<=myRating : v<=Math.round(avg||0); return `<span class="star ${filled?'filled':'empty'}" data-answer="${answerId}" data-value="${v}" title="${v}">${filled?'★':'☆'}</span>`; }).join('');
  return `<div class="rating" data-answer="${answerId}" style="display:flex;align-items:center;gap:4px;${disabled?'pointer-events:none;opacity:.6':''}">${stars}<span class="rate-avg" style="font-size:11px;color:#666;margin-left:6px">(${roundAvg})</span></div>`;
}
async function loadRatingsFromAPI(){
  if(!RATINGS_ENABLED) return;
  if(!RATINGS_BACKEND_AVAILABLE) return;
  let summary=[];
  try{ summary=await getJSON(`${API_BASE}${ENDPOINTS.ratingsSummary}`);}catch{ summary=[]; }
  ratingsSummaryMap.clear(); summary.forEach(r=> ratingsSummaryMap.set(Number(r.answer_id), {avg:Number(r.avg_rating)||0, count:Number(r.ratings_count)||0}));
  myRatingsMap.clear();
  if(getToken()){
    try{ const mine=await apiFetch(ENDPOINTS.myRatings).then(r=>r.ok?r.json():[]); mine.forEach(r=> myRatingsMap.set(Number(r.answer_id), Number(r.rating))); }catch{}
  }
}
function injectRatingsUI(rootEl, answersCache){
  const me=Number(localStorage.getItem('user_id')||0);
  rootEl.querySelectorAll('.rating-slot[data-answer]').forEach(slot=>{
    const answerId=Number(slot.dataset.answer); const info=ratingsSummaryMap.get(answerId)||{avg:0,count:0}; const myR=myRatingsMap.get(answerId)||null; const aObj=answersCache.find(a=>Number(a.answer_id)===answerId); const isMine=aObj && Number(aObj.user_id)===me; slot.innerHTML=`${renderStars(answerId, info.avg, myR, isMine)}<small style='display:block;text-align:right;color:#888;margin-top:2px'>${info.count||0} voto(s)</small>`; });
}

function postCard(post, answersByPost, convByAnswer){
  let role = localStorage.getItem('role');
  if(role==='1') role='coder'; else if(role==='2') role='team_leader'; else if(role==='3') role='admin';
  const me=Number(localStorage.getItem('user_id'));
  const isOwner = Number(post.user_id)===me;
  const canEdit = (role==='admin') || (role==='coder'&&isOwner) || (role==='team_leader'&&isOwner);
  const canDelete = (role==='admin') || (role==='team_leader') || (role==='coder'&&isOwner);
  const hasImg = !!(post.image && String(post.image).trim());
  const imageBox = hasImg? `<div class="post-image-box" data-full="${post.image}"><img src="${post.image}" alt="post image" onerror="this.parentNode.classList.add('is-error');this.remove();"></div>` : `<div class="post-image-box is-empty">IMG</div>`;
  const answers = answersByPost.get(post.post_id)||[];
  const answersHTML = answers.length ? `<div class="answers-wrap" style="margin-top:8px">${answers.map(a=>{
    const convs = convByAnswer.get(a.answer_id)||[]; const convHTML = convs.length ? `<div class='conversation-thread'>${convs.map(c=>{ const raw=c.description||''; const directed=raw.match(/^@(\S+)/); const bodyHTML=raw.replace(/^@(\S+)/,(m,u)=>`<span class='mention'>@${u}</span>`); const canDelConv = me===Number(c.user_id); return `<div class='conversation-item${directed?' is-directed':''}' data-conv='${c.conversation_id}'> <div class='ig-comment-line'><img class='ig-avatar' src='${userAvatar(c.user_id)}' alt='avatar' style='width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:4px;' onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" /> <span class='ig-user'>${userName(c.user_id)}</span> <span class='ig-text'>${bodyHTML}</span></div> <div class='ig-actions-row'><button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${c.user_id}' data-source='conversation'>Responder</button> ${canDelConv?`<button class='ig-action comment-delete' data-type='conversation' data-conv='${c.conversation_id}'>Eliminar</button>`:''}</div></div>`; }).join('')}</div>`: '';
    const canDelAnswer = (role==='admin') || me===Number(a.user_id);
    return `<div class='answer-item ig-comment' data-answer='${a.answer_id}'> <div class='ig-comment-line'><img class='ig-avatar' src='${userAvatar(a.user_id)}' alt='avatar' style='width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:6px;' onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" /> <span class='ig-user'>${userName(a.user_id)}</span> <span class='ig-text'>${a.description||''}</span></div> <div class='ig-actions-row'><button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${a.user_id}' data-source='answer'>Responder</button> ${canDelAnswer?`<button class='ig-action comment-delete' data-type='answer' data-answer='${a.answer_id}'>Eliminar</button>`:''} <div class='rating-slot' data-answer='${a.answer_id}'></div></div> <div class='ig-replies'>${convHTML}</div></div>`; }).join('')}</div>` : '';
  const authorName = userName(post.user_id);
  const authorAvatar = userAvatar(post.user_id);
  return `<article class="card post-card">
    <h4>${post.title || ''}</h4>
    <div class="post-meta">
      <span class="post-author"><img class="post-author-avatar" src="${authorAvatar}" alt="avatar" onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" /> ${authorName}</span> · <span>Tipo: ${post.type||'-'}</span> · <span>Estado: ${post.status||'unsolved'}</span>
    </div>
    <p class="post-desc">${post.description||''}</p>
    ${imageBox}
    <div class="post-actions">${canEdit?`<button class='btn-edit' data-id='${post.post_id}'>Editar</button>`:''}${canDelete?`<button class='btn-delete' data-id='${post.post_id}'>Eliminar</button>`:''}</div>
    ${answersHTML}
    <form class='answer-form' data-post='${post.post_id}'><input name='description' placeholder='Add answer...'><button type='submit'>Enviar</button></form>
  </article>`;
}

async function getJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); }

export async function renderDashboardAfterTemplateLoaded(){
  await detectBackendStyle();

  const qEl=document.getElementById('questions-count');
  const aEl=document.getElementById('answers-count');
  const pEl=document.getElementById('points-count');
  const postsEl=document.getElementById('posts');
  const form=document.getElementById('post-form');
  const hint=document.getElementById('post-hint');

  let answersCache=[];
  function groupAnswers(list){ const m=new Map(); list.forEach(a=>{ const arr=m.get(a.post_id)||[]; arr.push(a); m.set(a.post_id,arr); }); return m; }

  async function loadUsers(){ try{ const r=await apiFetch(ENDPOINTS.listUsers); if(r.ok){ const data=await r.json(); usersMap=new Map(data.map(u=>[Number(u.user_id),u])); try{ localStorage.setItem('all_users_cache', JSON.stringify(data)); const meId=Number(localStorage.getItem('user_id')); const me=data.find(u=>Number(u.user_id)===meId); if(me){ if(me.profile_image) localStorage.setItem('profile_image', me.profile_image); if(me.user_name) localStorage.setItem('user_name', me.user_name); } }catch{} } }catch(err){ console.warn('No se pudieron cargar usuarios', err); } }
  async function loadAnswers(){ answersCache = await getJSON(`${API_BASE}${ENDPOINTS.listAnswers}`); if(aEl) aEl.textContent=answersCache.length; if(pEl) pEl.textContent=String(answersCache.length*10); }
  async function loadConversations(){ try{ conversationsCache = await getJSON(`${API_BASE}${ENDPOINTS.listConversations}`);}catch{ conversationsCache=[]; } }
  async function loadPosts(){
    const posts = await getJSON(`${API_BASE}${ENDPOINTS.listPosts}`);
    let overrides={}; try{ overrides=JSON.parse(localStorage.getItem('post_overrides')||'{}'); }catch{}
    const merged = posts.map(p=> overrides[p.post_id]?{...p,...overrides[p.post_id]}:p);
    if(qEl) qEl.textContent=posts.length;
    const answersByPost = groupAnswers(answersCache);
    const convByAnswer = groupConversations(conversationsCache);
    if(postsEl){ postsEl.innerHTML = merged.length? merged.slice().reverse().map(p=>postCard(p,answersByPost,convByAnswer)).join('') : '<div class="card" style="padding:10px">No posts.</div>'; if(RATINGS_ENABLED) injectRatingsUI(postsEl, answersCache); attachImageLightboxHandlers(); }
  }

  if(form){ form.addEventListener('submit', async e=>{ e.preventDefault(); if(hint) hint.textContent='Publicando…'; try{ const fd=new FormData(form); const uid=localStorage.getItem('user_id'); if(uid) fd.set('user_id', uid); const type=String(fd.get('type')||'').trim().toLowerCase(); const status=String(fd.get('status')||'').trim().toLowerCase(); if(type) fd.set('type', type); if(status) fd.set('status', status); const r=await fetch(`${API_BASE}${ENDPOINTS.createPost}`, {method:'POST', body:fd}); if(!r.ok){ let msg='Error al crear el post.'; try{ const d=await r.json(); if(d?.detail||d?.error) msg=`Error al crear el post: ${d.detail||d.error}`; }catch{} throw new Error(msg); } form.reset(); if(hint) hint.textContent='¡Post creado!'; await loadPosts(); }catch(err){ console.error(err); if(hint) hint.textContent=err.message||'Error al crear el post.'; } }); }

  if(postsEl){
    // acciones (editar / eliminar)
    postsEl.addEventListener('click', async e=>{ const btn=e.target.closest('button'); if(!btn) return; const id=btn.dataset.id; if(btn.classList.contains('btn-delete')){ if(!confirm('Eliminar post?')) return; try{ const r=await apiFetch(ENDPOINTS.deletePost(id), {method:'DELETE'}); if(r.ok){ try{ const o=JSON.parse(localStorage.getItem('post_overrides')||'{}'); delete o[id]; localStorage.setItem('post_overrides', JSON.stringify(o)); }catch{} await loadPosts(); } else { try{ const err=await r.json(); alert(err.error||'Error eliminando'); }catch{} } }catch(err){ console.error(err); } }
      if(btn.classList.contains('btn-edit')){ const article=btn.closest('article'); const postId=id; const title=article.querySelector('h4')?.textContent||''; const desc=article.querySelector('p.post-desc')?.textContent||''; const meta=article.querySelector('.post-meta')?.textContent||''; let typeMatch=meta.match(/Tipo:\s*([^·]+)/i); let statusMatch=meta.match(/Estado:\s*([^·]+)/i); const type=typeMatch?typeMatch[1].trim().replace(/\.$/,''):''; const status=statusMatch?statusMatch[1].trim().replace(/\.$/,''):''; const image=article.querySelector('.post-image-box img')?.getAttribute('src')||''; const postData={post_id:postId,title,description:desc,type,status,image}; sessionStorage.setItem('edit_post', JSON.stringify(postData)); import('../main').then(m=>m.navigate('/edit-post')); }
    });

    // nueva answer
    postsEl.addEventListener('submit', async e=>{ const aForm=e.target.closest('.answer-form'); if(!aForm) return; e.preventDefault(); const postId=aForm.getAttribute('data-post'); const input=aForm.querySelector('input[name="description"]'); const txt=(input?.value||'').trim(); if(!txt) return; const uid=localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; } const fd=new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('post_id', postId); try{ const r=await apiFetch(ENDPOINTS.createAnswer, {method:'POST', body:fd}); if(r.ok){ input.value=''; await loadAnswers(); await loadConversations(); await loadPosts(); } else { console.error(await r.json().catch(()=>({}))); } }catch(err){ console.error(err); } });

    // reply a answer / conversation (form inline)
    postsEl.addEventListener('click', e=>{ const trigger=e.target.closest('.reply-trigger'); if(!trigger) return; e.preventDefault(); const answerId=trigger.getAttribute('data-answer'); const userId=trigger.getAttribute('data-user'); const answerBox=trigger.closest('.answer-item'); if(!answerBox) return; answerBox.querySelectorAll('form.conversation-form').forEach(f=>f.remove()); const form=document.createElement('form'); form.className='conversation-form'; form.setAttribute('data-answer', answerId); if(userId) form.setAttribute('data-target', userId); form.innerHTML=`<div class='reply-context'>Respondiendo a <b>${userName(userId)}</b></div><input name='description' placeholder='Escribe tu respuesta...'/><button type='submit'>↳</button>`; const anchor=trigger.closest('.ig-actions-row')||answerBox; anchor.insertAdjacentElement('afterend', form); form.querySelector('input').focus(); });

    // enviar reply
    postsEl.addEventListener('submit', async e=>{ const cForm=e.target.closest('.conversation-form'); if(!cForm) return; e.preventDefault(); const answerId=cForm.getAttribute('data-answer'); const input=cForm.querySelector('input[name="description"]'); const targetUserId=cForm.getAttribute('data-target'); let txt=(input?.value||'').trim(); if(!txt) return; const uid=localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; } if(targetUserId && !txt.startsWith('@')){ const uname=userName(targetUserId).replace(/\s+/g,''); txt=`@${uname} ${txt}`; } const fd=new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('answer_id', answerId); try{ const r=await apiFetch(ENDPOINTS.createConversation, {method:'POST', body:fd}); if(r.ok){ input.value=''; await loadConversations(); await loadPosts(); } else { let errInfo={}; try{ errInfo=await r.json(); }catch{} alert(errInfo.error||'Error enviando'); } }catch(err){ console.error(err); } });

    // eliminar answer o conversation
    postsEl.addEventListener('click', async e=>{ const del=e.target.closest('.comment-delete'); if(!del) return; e.preventDefault(); if(!confirm('Eliminar?')) return; const type=del.dataset.type; const id=del.dataset.answer||del.dataset.conv; try{ if(type==='answer'){ const r=await apiFetch(ENDPOINTS.deleteAnswer(id), {method:'DELETE'}); if(!r.ok) console.error('Fail delete answer', await r.json().catch(()=>({}))); } else { const r=await apiFetch(ENDPOINTS.deleteConversation(id), {method:'DELETE'}); if(!r.ok) console.error('Fail delete conv', await r.json().catch(()=>({}))); } await loadAnswers(); await loadConversations(); await loadPosts(); }catch(err){ console.error(err); } });

    postsEl.addEventListener('click', async e=>{
      const star=e.target.closest('.star'); if(star){
        if(!RATINGS_ENABLED) return;
        if(!RATINGS_BACKEND_AVAILABLE){ return alert('Ratings aún no disponibles en este servidor'); }
        const answerId=Number(star.dataset.answer); const value=Number(star.dataset.value);
        if(!getToken()) return alert('Inicia sesión de nuevo');
        const aObj=answersCache.find(a=>Number(a.answer_id)===answerId); if(!aObj) return;
        if(Number(aObj.user_id)===Number(localStorage.getItem('user_id'))) return alert('No puedes calificar tu propia respuesta');
        if(myRatingsMap.has(answerId)) return alert('Ya calificaste');
        if(!(value>=1&&value<=STAR_MAX)) return;
        try{
          const baseAttempt = ENDPOINTS.rateAnswer(answerId);
          const attempts = [baseAttempt];
          if(!baseAttempt.endsWith('/')) attempts.push(baseAttempt + '/');
          attempts.push(`${USE_API_PREFIX?'/api':''}/answers/${answerId}/rate`);
          let r, used;
          for(const ep of attempts){
            used = ep;
            r = await apiFetch(ep, {method:'POST', body:JSON.stringify({answer_id:answerId, rating:value})});
            if(r.status !== 404) break; // solo cambiar si no 404
            console.warn('Rating endpoint 404 ->', ep);
          }
          if(r.status===404){
            console.error('Ninguna ruta de rating encontrada (desactivo ratings).');
            RATINGS_BACKEND_AVAILABLE=false;
            return alert('Servicio de ratings no disponible.');
          }
          if(!r.ok){
            let err={}; try{ err=await r.json(); }catch{}
            console.error('Rating POST fail', r.status, err, 'endpoint usado:', used);
            return alert(err.error||`Error rating (${r.status})`);
          }
          // si funcionó con fallback answers/:id/rate redefinir
          if(used.includes('/answers/') && !used.includes('ratings')){
            ENDPOINTS.rateAnswer = id => `${USE_API_PREFIX?'/api':''}/answers/${id}/rate`;
          }
          await loadRatingsFromAPI();
          await loadPosts();
        }catch(err){ console.error('Rating network error', err); alert('Error de red al enviar rating'); }
      }
    });
  }

  await loadUsers();
  await loadAnswers();
  if(RATINGS_ENABLED) await loadRatingsFromAPI();
  await loadConversations();
  await loadPosts();
  setupLightboxRoot();
}

// ============ LIGHTBOX IMG ============
function setupLightboxRoot(){ if(document.getElementById('img-lightbox-root')) return; const div=document.createElement('div'); div.id='img-lightbox-root'; div.innerHTML=`<div class="img-lightbox-backdrop" data-close="lb"><figure class="img-lightbox-figure"><img alt="Imagen del post" class="img-lightbox-img" /><figcaption class="img-lightbox-caption"></figcaption><button type="button" class="img-lightbox-close" data-close="lb" aria-label="Cerrar">×</button></figure></div>`; document.body.appendChild(div); div.addEventListener('click', e=>{ if(e.target.dataset.close==='lb') closeLightbox(); }); document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); }); }
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
