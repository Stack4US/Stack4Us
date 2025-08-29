// Dashboard view logic (fetching and rendering) //ablandoa
// Este archivo administra la carga de posts y sus respuestas, además
// de aplicar reglas de permisos en el FRONT (no reemplaza validación backend). //ablandoa
const API = 'http://localhost:3000'; // keep in sync with backend base URL //ablandoa
// caches para nombres y conversaciones
let usersMap = new Map(); // user_id -> user_name
let conversationsCache = []; // replies a answers
function userName(id){ return usersMap.get(String(id)) || `User #${id}`; }

function postCard(p, answersByPost, convByAnswer) { // dibuja una tarjeta de post con replies anidados //ablandoa
  let storedRole = localStorage.getItem('role'); // puede venir como id numerico (1,2,3) o alias //ablandoa
  // Mapeo numerico -> alias //ablandoa
  if (storedRole === '1') storedRole = 'coder';
  else if (storedRole === '2') storedRole = 'team_leader';
  else if (storedRole === '3') storedRole = 'admin';
  const userRole = storedRole; // usar alias normalizado //ablandoa
  const me = Number(localStorage.getItem('user_id')); // id usuario logueado //ablandoa
  const isOwner = Number(p.user_id) === Number(me); // comparación robusta numérica //ablandoa
  // Tabla de permisos front (NO segura): //ablandoa
  // coder: solo su propio post (editar y eliminar) //ablandoa
  // team_leader: puede eliminar cualquier post, editar solo propios //ablandoa
  // admin: todo //ablandoa
  const canEdit = (userRole === 'admin') || (userRole === 'coder' && isOwner) || (userRole === 'team_leader' && isOwner); //ablandoa
  const canDelete = (userRole === 'admin') || (userRole === 'team_leader') || (userRole === 'coder' && isOwner); //ablandoa
  // Debug temporal para inspeccionar permisos en consola //ablandoa
  try { console.debug('[postCard perms]', {post_id: p.post_id, p_user_id: p.user_id, p_user_id_type: typeof p.user_id, me, me_type: typeof me, userRole, isOwner, canEdit, canDelete}); } catch(_) {}
  const hasImg = Boolean(p.image && String(p.image).trim()); //ablandoa
    const imageBox = hasImg
      ? `<div class="post-image-box" data-full="${p.image}"><img src="${p.image}" alt="post image" onerror="this.parentNode.classList.add('is-error');this.remove();"></div>`
    : `<div class="post-image-box is-empty">IMG</div>`; // caja amplia para imagen o placeholder //ablandoa
  const answers = answersByPost.get(p.post_id) || []; // respuestas agrupadas //ablandoa
  const answersHTML = answers.length ? `<div class="answers-wrap" style="margin-top:8px">${answers.map(a=>{
    const convs = convByAnswer.get(a.answer_id)||[];
    const convHTML = convs.length ? `<div class='conversation-thread'>${convs.map(c=>{
      const raw = c.description||'';
      const directedMatch = raw.match(/^@(\S+)/); /* corregido: detectar solo si inicia con @ */
      const bodyHTML = raw.replace(/^@(\S+)/, (m,u)=>`<span class=\"mention\">@${u}</span>`);
      const isDirected = directedMatch? ' is-directed' : '';
      const meId = Number(localStorage.getItem('user_id'));
      const canDel = meId === Number(c.user_id);
      const convId = c.conversation_id || c.id || '';
      return `<div class='conversation-item ig-subcomment${isDirected}' data-conv='${convId}' data-user='${c.user_id}' data-answer='${a.answer_id}'>
        <div class='ig-comment-line'><b class='ig-user'>${userName(c.user_id)}</b> <span class='ig-text'>${bodyHTML}</span></div>
        <div class='ig-actions-row'>
          <button class='reply-trigger ig-action small' data-user='${c.user_id}' data-answer='${a.answer_id}' data-source='conversation'>Responder</button>
          ${canDel && convId?`<button class='ig-action comment-delete small' data-type='conversation' data-conv='${convId}'>Eliminar</button>`:''}
        </div>
      </div>`;
    }).join('')}</div>` : '';
    const meId = Number(localStorage.getItem('user_id'));
    const canDelAnswer = meId === Number(a.user_id);
    return `<div class='answer-item ig-comment' data-answer='${a.answer_id}'>
      <div class='ig-comment-line'><b class='ig-user'>${userName(a.user_id)}</b> <span class='ig-text'>${a.description||''}</span></div>
      <div class='ig-actions-row'>
        <button class='reply-trigger ig-action' data-answer='${a.answer_id}' data-user='${a.user_id}' data-source='answer'>Responder</button>
        ${canDelAnswer?`<button class='ig-action comment-delete' data-type='answer' data-answer='${a.answer_id}'>Eliminar</button>`:''}
      </div>
      <div class='ig-replies'>${convHTML}</div>
    </div>`;
  }).join('')}</div>` : '';
  return `<article class="card post-card"><h4>${p.title ?? ''}</h4><div class="post-meta"><span>Tipo: ${p.type ?? '-'}</span> · <span>Estado: ${p.status ?? 'unsolved'}</span> · <span>Autor ${userName(p.user_id ?? '-')}</span></div><p class="post-desc">${p.description ?? ''}</p>${imageBox}<div class="post-actions">${canEdit?`<button class='btn-edit' data-id='${p.post_id}'>Editar</button>`:''}${canDelete?`<button class='btn-delete' data-id='${p.post_id}'>Eliminar</button>`:''}</div>${answersHTML}<form class='answer-form' data-post='${p.post_id}'><input name='description' placeholder='Add answer...'><button type='submit'>Enviar</button></form></article>`; //ablandoa
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
  // --- inserted: grouping conversations and load helpers ---
  function groupConversations(list){
    const map = new Map();
    list.forEach(c=>{ const arr = map.get(c.answer_id)||[]; arr.push(c); map.set(c.answer_id, arr); });
    return map;
  }
  async function loadUsers(){
    try { const users = await getJSON(`${API}/Users`); usersMap = new Map(users.map(u=>[String(u.user_id), u.user_name])); }
    catch(err){ console.error('Error loading users', err); }
  }
  async function loadConversations(){
    try { conversationsCache = await getJSON(`${API}/conversations`); }
    catch(err){ console.error('Error loading conversations', err); conversationsCache = []; }
  }
  async function loadPosts() { // carga posts y renderiza //ablandoa
    const posts = await getJSON(`${API}/all-posts`);
    let overrides = {};
    try { overrides = JSON.parse(localStorage.getItem('post_overrides')||'{}'); } catch { overrides = {}; }
    const merged = posts.map(p => overrides[p.post_id] ? { ...p, ...overrides[p.post_id] } : p);
    if (qEl) qEl.textContent = posts.length;
    const answersByPost = groupAnswers(answersCache);
    const convByAnswer = groupConversations(conversationsCache || []);
    if (postsEl) {
      postsEl.innerHTML = merged.length ? merged.slice().reverse().map(p=>postCard(p, answersByPost, convByAnswer)).join('') : '<div class="card" style="padding:10px">No posts.</div>';
      attachImageLightboxHandlers();
    }
  }
  async function loadAnswers() { // carga todas las respuestas //ablandoa
    answersCache = await getJSON(`${API}/answers`);
    if (aEl) aEl.textContent = answersCache.length;
    if (pEl) pEl.textContent = String(answersCache.length * 10);
  }
  async function ensureCurrentUserExists(){
    const uid = localStorage.getItem('user_id');
    if(!uid) return false;
    // si ya está en usersMap evitar fetch extra
    if(usersMap && usersMap.has(String(uid))) return true;
    try { const users = await getJSON(`${API}/Users`); usersMap = new Map(users.map(u=>[String(u.user_id), u.user_name])); }
    catch(err){ console.warn('No se pudo refrescar usuarios', err); }
    const exists = usersMap.has(String(uid));
    if(!exists){
      console.warn('[ensureCurrentUserExists] user_id local no está en BD', uid);
    }
    return exists;
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

        const r = await fetch(`${API}/insert-post`, { method: 'POST', body: fd });
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
      if (!btn) return;
      const id = btn.dataset.id;
      const me = localStorage.getItem('user_id');
      const role = localStorage.getItem('role');
      if (btn.classList.contains('btn-delete')) { // eliminar post //ablandoa
        if (!confirm('Eliminar post?')) return; //ablandoa
        const token = localStorage.getItem('token'); //ablandoa
        if (!token) { alert('Sesión expirada. Reloguea.'); return; }
        const r = await fetch(`${API}/post/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (r.ok) {
          // quitar override local si existe //ablandoa
            try { const o = JSON.parse(localStorage.getItem('post_overrides')||'{}'); delete o[id]; localStorage.setItem('post_overrides', JSON.stringify(o)); } catch {}
            await loadPosts();
        } else { try { const err=await r.json(); console.error(err); alert(err.error||'Error eliminando'); } catch(_){} }
      }
      if (btn.classList.contains('btn-edit')) { // ir a pantalla de edición //ablandoa
        // Obtener datos del post actual desde el DOM reconstruyendo estructura mínima //ablandoa
        const article = btn.closest('article');
        const postId = id;
        // Extraer title y description del markup ya renderizado //ablandoa
        const title = article.querySelector('h4')?.textContent || '';
        const desc = article.querySelector('p')?.textContent || '';
        // Intentar leer meta (tipo, estado, autor) //ablandoa
        const meta = article.querySelector('div[style*="font-size:12px"]')?.textContent || '';
        let typeMatch = meta.match(/Tipo:\s*([^·]+)/i); //ablandoa
        let statusMatch = meta.match(/Estado:\s*([^·]+)/i); //ablandoa
        const type = typeMatch ? typeMatch[1].trim().replace(/\.$/, '') : '';
        const status = statusMatch ? statusMatch[1].trim().replace(/\.$/, '') : '';
        const image = article.querySelector('img')?.getAttribute('src') || '';
        const postData = { post_id: postId, title, description: desc, type, status, image };
        sessionStorage.setItem('edit_post', JSON.stringify(postData));
        import('../main').then(m=> m.navigate('/edit-post'));
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
  const uid = localStorage.getItem('user_id');
  if(!uid || isNaN(Number(uid))){ alert('Sesión inválida: user_id faltante. Reloguear.'); return; }
  if(!(await ensureCurrentUserExists())){ alert('Tu usuario ya no existe en el servidor. Reloguea.'); localStorage.clear(); return; }
      const fd = new FormData();
      fd.append('description', txt);
  fd.append('user_id', uid);
      fd.append('post_id', postId);
      try {
        const token = localStorage.getItem('token');
  const r = await fetch(`${API}/answer`, { method:'POST', headers: token? { 'Authorization': `Bearer ${token}` } : {}, body: fd });
        if(r.ok){ input.value=''; await loadAnswers(); await loadConversations?.(); await loadPosts(); }
        else console.error(await r.json());
      } catch(err){ console.error(err); }
    });
    // conversation reply form
    postsEl.addEventListener('submit', async (e)=>{
      const cForm = e.target.closest('.conversation-form');
      if(!cForm) return;
      e.preventDefault();
      const answerId = cForm.getAttribute('data-answer');
      const input = cForm.querySelector('input[name="description"]');
  const targetUserId = cForm.getAttribute('data-target');
      const txt = (input?.value||'').trim();
      if(!txt) return;
  const uid = localStorage.getItem('user_id');
  if(!uid || isNaN(Number(uid))){ alert('Sesión inválida: user_id faltante. Reloguear.'); return; }
  if(!(await ensureCurrentUserExists())){ alert('Tu usuario ya no existe en el servidor. Reloguea.'); localStorage.clear(); return; }
      // Prefijo @usuario si hay target seleccionado
      let finalText = txt;
      if(targetUserId){
        const uname = userName(targetUserId).replace(/\s+/g,'');
        if(!finalText.startsWith('@')) finalText = `@${uname} ${finalText}`; // simple mención
      }
      const fd = new FormData();
      fd.append('description', finalText);
  fd.append('user_id', uid);
      fd.append('answer_id', answerId);
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(`${API}/conversation`, { method:'POST', headers: token? { 'Authorization': `Bearer ${token}` } : {}, body: fd });
        if(r.ok){ input.value=''; await loadConversations?.(); await loadPosts(); }
        else {
          let errInfo = {}; try { errInfo = await r.json(); } catch {}
          console.error('Error conversacion', r.status, errInfo);
          alert(errInfo.error || 'Error enviando respuesta');
        }
      } catch(err){ console.error(err); }
    });
    // gestionar aparición del formulario al pulsar 'Responder'
    postsEl.addEventListener('click', (e)=>{
      const trigger = e.target.closest('.reply-trigger');
      if(!trigger) return;
      e.preventDefault();
      const answerId = trigger.getAttribute('data-answer');
      const userId = trigger.getAttribute('data-user');
      const answerBox = trigger.closest('.answer-item');
      if(!answerBox) return;
      // eliminar formulario existente si hay
      answerBox.querySelectorAll('form.conversation-form').forEach(f=>f.remove());
      // crear formulario inline
      const form = document.createElement('form');
      form.className = 'conversation-form';
      form.setAttribute('data-answer', answerId);
      if(userId) form.setAttribute('data-target', userId);
      form.innerHTML = `
        <div class='reply-context'>Respondiendo a <b>${userName(userId)}</b></div>
        <input name='description' placeholder='Escribe tu respuesta...' />
        <button type='submit' title='Enviar respuesta'>↳</button>`;
  // Seleccionar ancla robusta (IG style)
  const anchor = trigger.closest('.ig-actions-row') || trigger.closest('.conversation-item') || trigger.parentElement || answerBox;
  if(!anchor){ console.warn('[reply-trigger] anchor no encontrada'); return; }
  anchor.insertAdjacentElement('afterend', form);
      form.querySelector('input').focus();
    });
    // eliminar answer o conversation propia
    postsEl.addEventListener('click', async (e)=>{
      const delBtn = e.target.closest('.comment-delete');
      if(!delBtn) return;
      e.preventDefault();
      if(!confirm('Eliminar?')) return;
      const token = localStorage.getItem('token');
      if(!token){ alert('Sesión expirada'); return; }
      const type = delBtn.dataset.type;
      try {
        if(type==='answer'){
          const id = delBtn.dataset.answer;
          console.debug('[delete answer attempt]', id);
          const r = await fetch(`${API}/owns-answers/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` }});
          if(!r.ok){ console.error('Fail delete answer', await r.json().catch(()=>({}))); }
        } else if(type==='conversation') {
          const id = delBtn.dataset.conv;
          console.debug('[delete conversation attempt]', id);
          const r = await fetch(`${API}/owns-conversation/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` }});
          if(!r.ok){ console.error('Fail delete conv', await r.json().catch(()=>({}))); }
        }
        await loadAnswers(); await loadConversations?.(); await loadPosts();
      } catch(err){ console.error(err); }
    });
  }
  await loadUsers?.();
  await loadAnswers();
  await loadConversations?.();
  await loadPosts();
  setupLightboxRoot();
}

// ---- Lightbox para imágenes de posts ---- //ablandoa
function setupLightboxRoot(){
  if(document.getElementById('img-lightbox-root')) return;
  const div = document.createElement('div');
  div.id = 'img-lightbox-root';
  div.innerHTML = `\n    <div class="img-lightbox-backdrop" data-close="lb">\n      <figure class="img-lightbox-figure">\n        <img alt="Imagen del post" class="img-lightbox-img" />\n        <figcaption class="img-lightbox-caption"></figcaption>\n        <button type="button" class="img-lightbox-close" data-close="lb" aria-label="Cerrar">×</button>\n      </figure>\n    </div>`;
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
