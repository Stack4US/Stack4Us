// Dashboard view logic (fetching and rendering)
const API = 'http://localhost:3000'; // keep in sync with backend base URL

function postCard(p) {
  // Use the correct field sent by backend: "image"
  const hasImg = Boolean(p.image && String(p.image).trim());
  const thumb = hasImg
    ? `<img src="${p.image}" alt="post image"
            style="width:96px;height:96px;object-fit:cover;border-radius:8px;background:#f3f3f3"
            onerror="this.style.display='none'">`
    : `<div style="width:96px;height:96px;border-radius:8px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888">
         sin imagen
       </div>`;

  // ############################## HANDLE ROLES ##############################
  const userRole = localStorage.getItem('role');
  const me = Number(localStorage.getItem('user_id'));
  const showButtons = (p.user_id === me) || (userRole === 'admin');

  if (userRole === 'coder') {
    return `
    <article class="card" style="padding:12px">
      <div style="display:flex;gap:12px">
        ${thumb}
        <div>
          <h4 style="margin:0">${p.title ?? ''}</h4>
          <div style="font-size:12px;color:#666;margin:4px 0">
            <span>Tipo: ${p.type ?? '-'}</span> ·
            <span>Estado: ${p.status ?? 'unsolved'}</span> ·
            <span>Autor #${p.user_id ?? '-'}</span>
          </div>
          <p style="margin:6px 0 0">${p.description ?? ''}</p>
          ${ showButtons ? `
          <div class="btns">
            <button class="btn-edit" data-id="${p.post_id}">Editar</button>
            <button class="btn-delete" data-id="${p.post_id}">Eliminar</button>
          </div>` : '' }
        </div>
      </div>
    </article>
  `;
  } else if (userRole === 'admin') {
    return `
    <article class="card" style="padding:12px">
      <div style="display:flex;gap:12px">
        ${thumb}
        <div>
          <h4 style="margin:0">${p.title ?? ''}</h4>
          <div style="font-size:12px;color:#666;margin:4px 0">
            <span>Tipo: ${p.type ?? '-'}</span> ·
            <span>Estado: ${p.status ?? 'unsolved'}</span> ·
            <span>Autor #${p.user_id ?? '-'}</span>
          </div>
          <p style="margin:6px 0 0">${p.description ?? ''}</p>
          ${ showButtons ? `
          <div class="btns">
            <button class="btn-edit" data-id="${p.post_id}">Editar</button>
            <button class="btn-delete" data-id="${p.post_id}">Eliminar</button>
          </div>` : '' }
        </div>
      </div>
    </article>
  `;
  } else if (userRole === 'team_leader') {
    return `
    <article class="card" style="padding:12px">
      <div style="display:flex;gap:12px">
        ${thumb}
        <div>
          <h4 style="margin:0">${p.title ?? ''}</h4>
          <div style="font-size:12px;color:#666;margin:4px 0">
            <span>Tipo: ${p.type ?? '-'}</span> ·
            <span>Estado: ${p.status ?? 'unsolved'}</span> ·
            <span>Autor #${p.user_id ?? '-'}</span>
          </div>
          <p style="margin:6px 0 0">${p.description ?? ''}</p>
          ${ showButtons ? `
          <div class="btns">
            <button class="btn-edit" data-id="${p.post_id}">Editar</button>
            <button class="btn-delete" data-id="${p.post_id}">Eliminar</button>
          </div>` : '' }
        </div>
      </div>
    </article>
  `;
  } else {
    return 'Without role';
  }
}

function answerItem(a) {
  const when = a.date ? new Date(a.date).toLocaleString() : '';
  const text = a.description ?? '';
  return `<div class="card" style="padding:10px"><b>User #${a.user_id ?? '-'}</b> <small>${when}</small><p>${text}</p></div>`;
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function renderDashboardAfterTemplateLoaded() {
  const qEl = document.getElementById('questions-count');
  const aEl = document.getElementById('answers-count');
  const pEl = document.getElementById('points-count');

  const postsEl = document.getElementById('posts');
  const answersEl = document.getElementById('answers');

  const form = document.getElementById('post-form');
  const hint = document.getElementById('post-hint');

  async function loadPosts() {
    const posts = await getJSON(`${API}/all-posts`);
    if (qEl) qEl.textContent = posts.length;
    if (postsEl) {
      postsEl.innerHTML = posts.length
        ? posts.slice().reverse().map(postCard).join('')
        : '<div class="card" style="padding:10px">No hay posts.</div>';
    }
  }

  async function loadAnswers() {
    const answers = await getJSON(`${API}/answers`);
    if (aEl) aEl.textContent = answers.length;
    if (pEl) pEl.textContent = String(answers.length * 10);

    if (answersEl) {
      answersEl.innerHTML = answers.length
        ? answers.slice().reverse().map(answerItem).join('')
        : '<div class="card" style="padding:10px">No hay answers.</div>';
    }
  }

  if (form) {
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

  if (postsEl) {
    postsEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const me = localStorage.getItem('user_id');

      if (btn.classList.contains('btn-delete')) {
        if (!confirm('Eliminar post?')) return;
        const r = await fetch(`${API}/posts/${id}?user_id=${me}`, { method: 'DELETE' });
        if (r.ok) await loadPosts();
        else console.error(await r.json());
      }

      if (btn.classList.contains('btn-edit')) {
        const title = prompt('Nuevo título:', ''); if (title == null) return;
        const fd = new FormData();
        fd.append('user_id', me); // temporal
        fd.append('title', title);
        const r = await fetch(`${API}/posts/${id}`, { method: 'PUT', body: fd });
        if (r.ok) await loadPosts();
        else console.error(await r.json());
      }
    });
  }

  await Promise.all([loadPosts(), loadAnswers()]);
}
