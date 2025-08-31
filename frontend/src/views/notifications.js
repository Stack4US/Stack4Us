const API_BASE='https://stack4us.up.railway.app';
const API_NOTIF='/api/notifications';
const ICON_BASE='/src/assets/img';
const ICON_EMPTY=`${ICON_BASE}/mdi_bell.png`;
const ICON_BADGE=`${ICON_BASE}/mdi_bell-badge.png`;

function getToken(){ const t=(localStorage.getItem('token')||'').trim(); return t&&t.split('.').length===3 ? t : null; }
function authHeaders(){ const tk=getToken(); return tk? { Authorization:`Bearer ${tk}` } : {}; }

function notificationItem(n){
  const date=new Date(n.date||n.created_at||Date.now());
  const time=date.toLocaleString();
  const read = n.status==='read';
  return `<div class="card notification-item ${read?'is-read':'is-unread'}" data-id="${n.notification_id}">
    <div class="notif-main">
      <p class="notif-msg">${n.message||''}</p>
      <small class="notif-date">${time}</small>
    </div>
    ${!read?'<button class="btn-mark" data-mark>Marcar leído</button>':''}
  </div>`;
}

export async function renderNotificationsAfterTemplateLoaded(){
  const root=document.getElementById('notificationsRoot');
  if(!root){ return; }
  root.innerHTML='<div class="card" style="padding:10px">Cargando…</div>';
  let data=[];
  try{
    const r=await fetch(`${API_BASE}${API_NOTIF}`, { headers:{...authHeaders()} });
    if(r.ok) data=await r.json(); else throw new Error(r.status);
  }catch(err){ console.error('Error cargando notificaciones', err); root.innerHTML='<div class="card" style="padding:10px">Error cargando notificaciones</div>'; return; }
  if(!Array.isArray(data) || !data.length){
    root.innerHTML=`<div class="card" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
      <img src="${ICON_EMPTY}" alt="bell" style="width:60px;height:60px;object-fit:contain;opacity:.6" />
      <p style="margin:0;font-size:13px;color:#555">No notifications</p>
    </div>`;
    updateBellIcon(false);
    return;
  }
  // render list
  root.innerHTML = data.map(notificationItem).join('');
  updateBellIcon(data.some(n=> n.status!=='read'));
  root.addEventListener('click', async e=>{
    const btn=e.target.closest('[data-mark]'); if(!btn) return; const item=btn.closest('.notification-item'); if(!item) return; const id=item.dataset.id; btn.disabled=true; try{ const r=await fetch(`${API_BASE}${API_NOTIF}/${id}`, {method:'PATCH', headers:{...authHeaders(), 'Content-Type':'application/json'}, body:JSON.stringify({})}); if(r.ok){ item.classList.remove('is-unread'); item.classList.add('is-read'); btn.remove(); // refresh badge icon
        const anyUnread = root.querySelector('.notification-item.is-unread'); updateBellIcon(!!anyUnread); } }catch(err){ console.error('mark read fail', err); btn.disabled=false; }
  });
}

export async function fetchNotifications(){
  try{ const r=await fetch(`${API_BASE}${API_NOTIF}`, { headers:{...authHeaders()} }); if(!r.ok) return []; return await r.json(); }catch{return [];} }

export function buildPopover(notifs){
  if(!Array.isArray(notifs)||!notifs.length){ return `<div class='notif-empty'><img src='${ICON_EMPTY}' alt='bell' style='width:54px;height:54px;opacity:.5'/><div>Sin notificaciones</div></div>`; }
  return `<ul class='notif-list'>${notifs.slice(0,15).map(n=>{ const read=n.status==='read'; const d=new Date(n.date||n.created_at||Date.now()); return `<li class='notif-item ${read?'':'unread'}' data-id='${n.notification_id}'><span>${n.message||''}</span><div style='display:flex;align-items:center;gap:8px;'><time>${d.toLocaleString()}</time>${!read?`<button class='notif-mark' data-mark>Marcar leído</button>`:''}</div></li>`; }).join('')}</ul>`;
}
