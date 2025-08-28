const API = 'http://localhost:3000';

async function j(u, o) {
  const r = await fetch(u, o);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function row(i, u) {
  const roleName =
    u.rol_id === '1' ? 'coder' :
    u.rol_id === '2' ? 'team_leader' :
    u.rol_id === '3' ? 'admin' :
    u.rol_id;

  const img = u.profile_image
    ? `<img src="${u.profile_image}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#eee">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:#eee"></div>`;

  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px;margin:6px 0">
      <div style="width:24px;text-align:center;font-weight:700">${i}</div>
      ${img}
      <div style="flex:1">
        <div style="font-weight:600">${u.user_name || ('Usuario #' + u.user_id)}</div>
        <div style="font-size:12px;color:#666">${roleName}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">${(Math.round((u.avg_rating || 0) * 100) / 100).toFixed(2)}</div>
        <div style="font-size:12px;color:#666">${u.ratings_count || 0} voto(s) · ${u.answers_with_votes || 0} answer(s)</div>
      </div>
    </div>`;
}

export async function renderRankingAfterTemplateLoaded() {
  const list = document.getElementById('rankingList');
  try {
    const data = await j(`${API}/ranking?min_votes=1&limit=10`);
    list.innerHTML = data.length
      ? data.map((u, i) => row(i + 1, u)).join('')
      : `<div class="card" style="padding:10px">Sin datos de ranking.</div>`;
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="card" style="padding:10px">Error cargando ranking.</div>`;
  }
}
