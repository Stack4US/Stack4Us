// Dashboard view logic (fetching and rendering) //ablandoa
const API = 'http://localhost:3000'; // keep in sync with backend base URL //ablandoa

function postCard(p) { //ablandoa
  // Use the correct field sent by backend: "image" (not image_url) //ablandoa
  const hasImg = Boolean(p.image && String(p.image).trim()); //ablandoa
  const thumb = hasImg
    ? `<img src="${p.image}" alt="post image"
            style="width:96px;height:96px;object-fit:cover;border-radius:8px;background:#f3f3f3"
            onerror="this.style.display='none'">` // hide if broken //ablandoa
    : `<div style="width:96px;height:96px;border-radius:8px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888">
         sin imagen
       </div>`;

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
        </div>
      </div>
    </article>
  `;
}

function answerItem(a) { //ablandoa
  // your schema calls these fields "description" and "date" //ablandoa
  const when = a.date ? new Date(a.date).toLocaleString() : ''; //ablandoa
  const text = a.description ?? '';                               //ablandoa
  return `<div class="card" style="padding:10px"><b>User #${a.user_id ?? '-'}</b> <small>${when}</small><p>${text}</p></div>`;
}

async function getJSON(url) { //ablandoa
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function renderDashboardAfterTemplateLoaded() { //ablandoa
  const qEl = document.getElementById('questions-count');
  const aEl = document.getElementById('answers-count');
  const pEl = document.getElementById('points-count');

  const postsEl   = document.getElementById('posts');
  const answersEl = document.getElementById('answers');

  const form = document.getElementById('post-form');
  const hint = document.getElementById('post-hint');

  async function loadPosts() { //ablandoa
    const posts = await getJSON(`${API}/all-posts`);
    if (qEl) qEl.textContent = posts.length; //ablandoa
    if (postsEl) {
      postsEl.innerHTML = posts.length
        ? posts.slice().reverse().map(postCard).join('') // newest first //ablandoa
        : '<div class="card" style="padding:10px">No hay posts.</div>';
    }
  }

  async function loadAnswers() { //ablandoa
    const answers = await getJSON(`${API}/answers`);
    if (aEl) aEl.textContent = answers.length; //ablandoa
    if (pEl) pEl.textContent = String(answers.length * 10); // simple points metric //ablandoa

    if (answersEl) {
      answersEl.innerHTML = answers.length
        ? answers.slice().reverse().map(answerItem).join('') //ablandoa
        : '<div class="card" style="padding:10px">No hay answers.</div>';
    }
  }

  if (form) { //ablandoa
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (hint) hint.textContent = 'Publicando…';

      try {
        const fd = new FormData(form);

        // always override user_id from localStorage to avoid stale hidden values //ablandoa
        const uid = localStorage.getItem('user_id');                 //ablandoa
        if (uid) fd.set('user_id', uid);                             //ablandoa

        // normalize type/status to match DB expectations (lowercase) //ablandoa
        const type = String(fd.get('type') || '').toLowerCase().trim();   //ablandoa
        const status = String(fd.get('status') || '').toLowerCase().trim(); //ablandoa
        if (type) fd.set('type', type);                                   //ablandoa
        if (status) fd.set('status', status);                             //ablandoa

        const r = await fetch(`${API}/insert-post`, { method: 'POST', body: fd });
        if (!r.ok) {
          // try to extract server detail for better UX //ablandoa
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

  await Promise.all([loadPosts(), loadAnswers()]); //ablandoa
}
