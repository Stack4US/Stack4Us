const API = 'http://localhost:3000/api';

async function j(u, o) {
  const r = await fetch(u, o);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function row(i, u) {
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px;margin:6px 0">
      <div style="width:24px;text-align:center;font-weight:700">${i}</div>
      <div style="flex:1">
        <div style="font-weight:600">User #${u.user_id}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">${u.answers_count}</div>
        <div style="font-size:12px;color:#666">answers</div>
      </div>
    </div>`;
}

export async function renderRankingAfterTemplateLoaded() {
  const list = document.getElementById('rankingList');
  try {
    const answers = await j(`${API}/answers`);
    const counts = new Map();
    answers.forEach(a => {
      const uid = a.user_id;
      counts.set(uid, (counts.get(uid) || 0) + 1);
    });
    const arr = Array.from(counts.entries()).map(([user_id, answers_count]) => ({ user_id, answers_count }))
      .sort((a,b)=> b.answers_count - a.answers_count)
      .slice(0, 10);
    list.innerHTML = arr.length
      ? arr.map((u, i) => row(i + 1, u)).join('')
      : `<div class="card" style="padding:10px">Sin datos de ranking.</div>`;
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="card" style="padding:10px">Error cargando ranking.</div>`;
  }
}
