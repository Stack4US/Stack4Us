const API = 'http://localhost:3000/api';
const DEFAULT_AVATAR = '/src/assets/img/qlementine-icons_user-16.png';

async function j(u, o) {
  const r = await fetch(u, o);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function row(i, u) {
  const displayName = u.user_name || 'Usuario';
  const avg = (u.avg_rating!=null)? (Math.round(u.avg_rating*10)/10).toFixed(1) : '-';
  const votes = u.ratings_count || 0;
  const answers = u.answers_with_votes != null ? u.answers_with_votes : (u.answers_count||0);
  return `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:10px;margin:6px 0">
      <div style="width:26px;text-align:center;font-weight:700">${i}</div>
      <img src="${u.profile_image||DEFAULT_AVATAR}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null;" />
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${displayName}</div>
        <div style="font-size:11px;color:#666">⭐ ${avg} · ${votes} votos · ${answers} resp.</div>
      </div>
    </div>`;
}

export async function renderRankingAfterTemplateLoaded() {
  const list = document.getElementById('rankingList');
  try {
    // Intentar ranking del backend (incluye nombre e imagen)
    const ranking = await j(`${API}/ratings/ranking`).catch(()=>null);
    if(ranking && Array.isArray(ranking) && ranking.length){
      list.innerHTML = ranking.map((u,i)=>row(i+1,u)).join('');
      return;
    }
    // Fallback: contar respuestas (sin datos de rating)
    const answers = await j(`${API}/answers`);
    const counts = new Map();
    answers.forEach(a=> counts.set(a.user_id, (counts.get(a.user_id)||0)+1));
    const arr = Array.from(counts.entries()).map(([user_id, answers_count])=>({user_id, answers_count})).sort((a,b)=> b.answers_count-a.answers_count).slice(0,10);
    list.innerHTML = arr.length ? arr.map((u,i)=> row(i+1,{...u, avg_rating:null, ratings_count:null, answers_with_votes:u.answers_count})).join('') : `<div class="card" style="padding:10px">Sin datos de ranking.</div>`;
  } catch(err){
    console.error(err);
    list.innerHTML = `<div class="card" style="padding:10px">Error cargando ranking.</div>`;
  }
}
