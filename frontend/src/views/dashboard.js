// Dashboard view logic (fetching and rendering)
// Administra carga de posts, answers y conversaciones (replies a answers)
// Validaciones reales van en el backend.

const API_BASE = 'http://localhost:3000/api';
const DEFAULT_AVATAR = '/src/assets/img/qlementine-icons_user-16.png'; // imagen por defecto
const RATINGS_ENABLED = false; // poner true cuando existan endpoints de rating en backend

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
  if(!RATINGS_ENABLED) return; // evita 404
  let summary=[]; try{ summary=await getJSON(`${API_BASE}/answers/ratings-summary`);}catch{ summary=[]; }
  ratingsSummaryMap.clear(); summary.forEach(r=> ratingsSummaryMap.set(Number(r.answer_id), {avg:Number(r.avg_rating)||0, count:Number(r.ratings_count)||0}));
  myRatingsMap.clear(); if(getToken()){ try{ const mine=await apiFetch('/my-answer-ratings').then(r=>r.ok?r.json():[]); mine.forEach(r=> myRatingsMap.set(Number(r.answer_id), Number(r.rating))); }catch{} }
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
  return `<article class="card post-card">
    <h4>${post.title || ''}</h4>
    <div class="post-meta"><span>Tipo: ${post.type||'-'}</span> · <span>Estado: ${post.status||'unsolved'}</span> · <span>Autor #${post.user_id||'-'}</span></div>
    <p class="post-desc">${post.description||''}</p>
    ${imageBox}
    <div class="post-actions">${canEdit?`<button class='btn-edit' data-id='${post.post_id}'>Editar</button>`:''}${canDelete?`<button class='btn-delete' data-id='${post.post_id}'>Eliminar</button>`:''}</div>
    ${answersHTML}
    <form class='answer-form' data-post='${post.post_id}'><input name='description' placeholder='Add answer...'><button type='submit'>Enviar</button></form>
  </article>`;
}

async function getJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); }

export async function renderDashboardAfterTemplateLoaded(){
  const qEl=document.getElementById('questions-count');
  const aEl=document.getElementById('answers-count');
  const pEl=document.getElementById('points-count');
  const postsEl=document.getElementById('posts');
  const form=document.getElementById('post-form');
  const hint=document.getElementById('post-hint');

  let answersCache=[];
  function groupAnswers(list){ const m=new Map(); list.forEach(a=>{ const arr=m.get(a.post_id)||[]; arr.push(a); m.set(a.post_id,arr); }); return m; }

  async function loadUsers(){ try{ const r=await apiFetch('/users/all'); if(r.ok){ const data=await r.json(); usersMap=new Map(data.map(u=>[Number(u.user_id),u])); } }catch(err){ console.warn('No se pudieron cargar usuarios', err); } }
  async function loadAnswers(){ answersCache = await getJSON(`${API_BASE}/answers`); if(aEl) aEl.textContent=answersCache.length; if(pEl) pEl.textContent=String(answersCache.length*10); }
  async function loadConversations(){ try{ conversationsCache = await getJSON(`${API_BASE}/conversations`);}catch{ conversationsCache=[]; } }
  async function loadPosts(){
    const posts = await getJSON(`${API_BASE}/posts/all`);
    let overrides={}; try{ overrides=JSON.parse(localStorage.getItem('post_overrides')||'{}'); }catch{}
    const merged = posts.map(p=> overrides[p.post_id]?{...p,...overrides[p.post_id]}:p);
    if(qEl) qEl.textContent=posts.length;
    const answersByPost = groupAnswers(answersCache);
    const convByAnswer = groupConversations(conversationsCache);
    if(postsEl){ postsEl.innerHTML = merged.length? merged.slice().reverse().map(p=>postCard(p,answersByPost,convByAnswer)).join('') : '<div class="card" style="padding:10px">No posts.</div>'; if(RATINGS_ENABLED) injectRatingsUI(postsEl, answersCache); attachImageLightboxHandlers(); }
  }

  if(form){ form.addEventListener('submit', async e=>{ e.preventDefault(); if(hint) hint.textContent='Publicando…'; try{ const fd=new FormData(form); const uid=localStorage.getItem('user_id'); if(uid) fd.set('user_id', uid); const type=String(fd.get('type')||'').trim().toLowerCase(); const status=String(fd.get('status')||'').trim().toLowerCase(); if(type) fd.set('type', type); if(status) fd.set('status', status); const r=await fetch(`${API_BASE}/posts/insert`, {method:'POST', body:fd}); if(!r.ok){ let msg='Error al crear el post.'; try{ const d=await r.json(); if(d?.detail||d?.error) msg=`Error al crear el post: ${d.detail||d.error}`; }catch{} throw new Error(msg); } form.reset(); if(hint) hint.textContent='¡Post creado!'; await loadPosts(); }catch(err){ console.error(err); if(hint) hint.textContent=err.message||'Error al crear el post.'; } }); }

  if(postsEl){
    // acciones (editar / eliminar)
    postsEl.addEventListener('click', async e=>{ const btn=e.target.closest('button'); if(!btn) return; const id=btn.dataset.id; if(btn.classList.contains('btn-delete')){ if(!confirm('Eliminar post?')) return; try{ const r=await apiFetch(`/posts/${id}`, {method:'DELETE'}); if(r.ok){ try{ const o=JSON.parse(localStorage.getItem('post_overrides')||'{}'); delete o[id]; localStorage.setItem('post_overrides', JSON.stringify(o)); }catch{} await loadPosts(); } else { try{ const err=await r.json(); alert(err.error||'Error eliminando'); }catch{} } }catch(err){ console.error(err); } }
      if(btn.classList.contains('btn-edit')){ const article=btn.closest('article'); const postId=id; const title=article.querySelector('h4')?.textContent||''; const desc=article.querySelector('p.post-desc')?.textContent||''; const meta=article.querySelector('.post-meta')?.textContent||''; let typeMatch=meta.match(/Tipo:\s*([^·]+)/i); let statusMatch=meta.match(/Estado:\s*([^·]+)/i); const type=typeMatch?typeMatch[1].trim().replace(/\.$/,''):''; const status=statusMatch?statusMatch[1].trim().replace(/\.$/,''):''; const image=article.querySelector('.post-image-box img')?.getAttribute('src')||''; const postData={post_id:postId,title,description:desc,type,status,image}; sessionStorage.setItem('edit_post', JSON.stringify(postData)); import('../main').then(m=>m.navigate('/edit-post')); }
    });

    // nueva answer
    postsEl.addEventListener('submit', async e=>{ const aForm=e.target.closest('.answer-form'); if(!aForm) return; e.preventDefault(); const postId=aForm.getAttribute('data-post'); const input=aForm.querySelector('input[name="description"]'); const txt=(input?.value||'').trim(); if(!txt) return; const uid=localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; } const fd=new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('post_id', postId); try{ const r=await apiFetch('/answers', {method:'POST', body:fd}); if(r.ok){ input.value=''; await loadAnswers(); await loadConversations(); await loadPosts(); } else { console.error(await r.json().catch(()=>({}))); } }catch(err){ console.error(err); } });

    // reply a answer / conversation (form inline)
    postsEl.addEventListener('click', e=>{ const trigger=e.target.closest('.reply-trigger'); if(!trigger) return; e.preventDefault(); const answerId=trigger.getAttribute('data-answer'); const userId=trigger.getAttribute('data-user'); const answerBox=trigger.closest('.answer-item'); if(!answerBox) return; answerBox.querySelectorAll('form.conversation-form').forEach(f=>f.remove()); const form=document.createElement('form'); form.className='conversation-form'; form.setAttribute('data-answer', answerId); if(userId) form.setAttribute('data-target', userId); form.innerHTML=`<div class='reply-context'>Respondiendo a <b>${userName(userId)}</b></div><input name='description' placeholder='Escribe tu respuesta...'/><button type='submit'>↳</button>`; const anchor=trigger.closest('.ig-actions-row')||answerBox; anchor.insertAdjacentElement('afterend', form); form.querySelector('input').focus(); });

    // enviar reply
    postsEl.addEventListener('submit', async e=>{ const cForm=e.target.closest('.conversation-form'); if(!cForm) return; e.preventDefault(); const answerId=cForm.getAttribute('data-answer'); const input=cForm.querySelector('input[name="description"]'); const targetUserId=cForm.getAttribute('data-target'); let txt=(input?.value||'').trim(); if(!txt) return; const uid=localStorage.getItem('user_id'); if(!uid){ alert('Sesión inválida'); return; } if(targetUserId && !txt.startsWith('@')){ const uname=userName(targetUserId).replace(/\s+/g,''); txt=`@${uname} ${txt}`; } const fd=new FormData(); fd.append('description', txt); fd.append('user_id', uid); fd.append('answer_id', answerId); try{ const r=await apiFetch('/conversations', {method:'POST', body:fd}); if(r.ok){ input.value=''; await loadConversations(); await loadPosts(); } else { let errInfo={}; try{ errInfo=await r.json(); }catch{} alert(errInfo.error||'Error enviando'); } }catch(err){ console.error(err); } });

    // eliminar answer o conversation
    postsEl.addEventListener('click', async e=>{ const del=e.target.closest('.comment-delete'); if(!del) return; e.preventDefault(); if(!confirm('Eliminar?')) return; const type=del.dataset.type; const id=del.dataset.answer||del.dataset.conv; try{ if(type==='answer'){ const r=await apiFetch(`/answers/${id}`, {method:'DELETE'}); if(!r.ok) console.error('Fail delete answer', await r.json().catch(()=>({}))); } else { const r=await apiFetch(`/conversations/${id}`, {method:'DELETE'}); if(!r.ok) console.error('Fail delete conv', await r.json().catch(()=>({}))); } await loadAnswers(); await loadConversations(); await loadPosts(); }catch(err){ console.error(err); } });

    postsEl.addEventListener('click', async e=>{
      const star=e.target.closest('.star'); if(star){ const answerId=Number(star.dataset.answer); const value=Number(star.dataset.value); if(!getToken()) return alert('Inicia sesión de nuevo'); const aObj=answersCache.find(a=>Number(a.answer_id)===answerId); if(!aObj) return; if(Number(aObj.user_id)===Number(localStorage.getItem('user_id'))) return alert('No puedes calificar tu propia respuesta'); if(myRatingsMap.has(answerId)) return alert('Ya calificaste'); if(!(value>=1&&value<=STAR_MAX)) return; try{ const r=await apiFetch(`/answers/${answerId}/rate`, {method:'POST', body:JSON.stringify({rating:value})}); if(!r.ok){ const err=await r.json().catch(()=>({})); return alert(err.error||'Error rating'); } await loadRatingsFromAPI(); await loadPosts(); }catch(err){ console.error(err); } }
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
function openLightbox(src, caption=''){ const root=document.getElementById('img-lightbox-root'); if(!root) return; root.querySelector('.img-lightbox-img').src=src; const cap=root.querySelector('.img-lightbox-caption'); if(caption){ cap.textContent=caption; cap.style.display='block'; } else { cap.textContent=''; cap.style.display='none'; } root.classList.add('is-open'); document.body.classList.add('lightbox-open'); }
function closeLightbox(){ const root=document.getElementById('img-lightbox-root'); if(!root) return; root.classList.remove('is-open'); document.body.classList.remove('lightbox-open'); }
function attachImageLightboxHandlers(){ const boxes=document.querySelectorAll('.post-image-box[data-full]'); boxes.forEach(b=>{ if(b.dataset.lbBound) return; b.dataset.lbBound='1'; b.style.cursor=b.classList.contains('is-empty')?'default':'zoom-in'; if(!b.classList.contains('is-empty')){ b.addEventListener('click', ()=>{ const src=b.dataset.full; const caption=b.closest('.post-card')?.querySelector('h4')?.textContent||''; openLightbox(src, caption); }); } }); }
