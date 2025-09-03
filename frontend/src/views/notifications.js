const API_BASE='https://stack4us.up.railway.app';
const API_NOTIF='/api/notifications';
const POSTS_ENDPOINT = '/api/posts/all';
const ICON_BASE='/src/assets/img';
const ICON_EMPTY=`${ICON_BASE}/mdi_bell.png`;
const ICON_BADGE=`${ICON_BASE}/mdi_bell-badge.png`;

// Read JWT from storage (basic check: 3 parts)
function getToken(){ const t=(localStorage.getItem('token')||'').trim(); return t&&t.split('.').length===3 ? t : null; }
// Build auth header if token exists
function authHeaders(){ const tk=getToken(); return tk? { Authorization:`Bearer ${tk}` } : {}; }

// Cached users list (from localStorage)
function cacheUsers(){ try{ return JSON.parse(localStorage.getItem('all_users_cache')||'[]'); }catch{ return []; } }
// Get username by id (fallback label if not found)
function userNameById(id){ const list=cacheUsers(); const u=list.find(x=> String(x.user_id)===String(id)); return u?.user_name || `User #${id}`; }

let postsTitleMap = {};
// Escape HTML to avoid breaking markup
function escapeHtml(s){return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}

// Improve notification text with post title (if available)
function enrichNotification(n){
  let msg = n.message||'';
  let postId = n.post_id || null;

  // Try to extract Post ID from message like "(ID: 123)"
  if(!postId){
    const m = msg.match(/\(ID:\s*(\d+)\)/i); if(m){ postId = m[1]; }
  }

  // If we know the post title, insert it into the message
  if(postId){
    const title = postsTitleMap[String(postId)];
    if(title){
      msg = msg.replace(/\s*\(ID:\s*\d+\)/i,''); // remove "(ID: ...)"
      msg = msg.replace(/your post/i, `your post “${escapeHtml(title)}”`);
    }
  }
  return { msg, postId };
}

// Build one notification card (HTML string)
function notificationItem(n){
  const date=new Date(n.date||n.created_at||Date.now());
  const time=date.toLocaleString();
  const read = n.status==='read';
  const actorLabel = n.actor_user_id ? `<strong>${userNameById(n.actor_user_id)}</strong>: ` : '';
  const {msg, postId} = enrichNotification(n);

  return `<div class="card notification-item ${read?'is-read':'is-unread'}" data-id="${n.notification_id}" ${postId?`data-post="${postId}"`:''}>
    <div class="notif-main">
      <p class="notif-msg">${actorLabel}${msg}</p>
      <small class="notif-date">${time}</small>
    </div>
    ${!read?'<button class="btn-mark" data-mark>Mark read</button>':''}
  </div>`;
}

// Main render after template is mounted
export async function renderNotificationsAfterTemplateLoaded(){
  const root=document.getElementById('notificationsRoot');
  if(!root){ return; }
  root.innerHTML='<div class="card" style="padding:10px">Loading…</div>';

  let data=[]; let posts=[];
  try{
    // Load posts (for titles) and notifications in parallel
    const [rP,rN] = await Promise.all([
      fetch(`${API_BASE}${POSTS_ENDPOINT}`, { headers:{...authHeaders()} }).catch(()=>null),
      fetch(`${API_BASE}${API_NOTIF}`, { headers:{...authHeaders()} })
    ]);

    // Map post_id -> title (used to enrich messages)
    if(rP && rP.ok){ posts = await rP.json(); postsTitleMap = Object.fromEntries(posts.map(p=>[String(p.post_id), p.title||`Post ${p.post_id}`])); }

    if(rN.ok) data=await rN.json(); else throw new Error(rN.status);
  }catch(err){
    console.error('Error loading notifications', err);
    root.innerHTML='<div class="card" style="padding:10px">Error loading notifications</div>';
    return;
  }

  // Empty state
  if(!Array.isArray(data) || !data.length){
    root.innerHTML=`<div class="card" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
      <img src="${ICON_EMPTY}" alt="bell" style="width:60px;height:60px;object-fit:contain;opacity:.6" />
      <p style="margin:0;font-size:13px;color:#555">No notifications</p>
    </div>`;
    updateBellIcon(false);
    return;
  }

  // Render items and set bell icon state
  root.innerHTML = data.map(notificationItem).join('');
  updateBellIcon(data.some(n=> n.status!=='read'));

  // Click handlers: open post or mark as read
  root.addEventListener('click', async e=>{
    const btn=e.target.closest('[data-mark]');
    const item=e.target.closest('.notification-item');

    // Open dashboard focused on the post (if any)
    if(item && !btn){
      const postId=item.getAttribute('data-post');
      if(postId){
        sessionStorage.setItem('focus_post_id', postId);
        try{ const {navigate}=await import('../main.js'); navigate('/dashboard'); }catch{}
      }
      return;
    }

    // Mark as read via PATCH
    if(!btn) return; if(!item) return;
    const id=item.dataset.id;
    btn.disabled=true;
    try{
      const r=await fetch(`${API_BASE}${API_NOTIF}/${id}`, {
        method:'PATCH',
        headers:{...authHeaders(), 'Content-Type':'application/json'},
        body:JSON.stringify({})
      });
      if(r.ok){
        item.classList.remove('is-unread');
        item.classList.add('is-read');
        btn.remove();
        const anyUnread = root.querySelector('.notification-item.is-unread');
        updateBellIcon(!!anyUnread);
      }
    }catch(err){
      console.error('mark read fail', err);
      btn.disabled=false;
    }
  });
}

// Fetch notifications list (silent fail → empty array)
export async function fetchNotifications(){
  try{
    const r=await fetch(`${API_BASE}${API_NOTIF}`, { headers:{...authHeaders()} });
    if(!r.ok) return [];
    return await r.json();
  }catch{
    return [];
  }
}

// Build HTML for popover dropdown (top 15)
export function buildPopover(notifs){
  if(!Array.isArray(notifs)||!notifs.length){
    return `<div class='notif-empty'><img src='${ICON_EMPTY}' alt='bell' style='width:54px;height:54px;opacity:.5'/><div>No notifications</div></div>`;
  }
  return `<ul class='notif-list'>${notifs.slice(0,15).map(n=>{
    const read=n.status==='read';
    const d=new Date(n.date||n.created_at||Date.now());
    const actor = n.actor_user_id ? `${userNameById(n.actor_user_id)}: `:'';
    const {msg,postId}=enrichNotification(n);
    return `<li class='notif-item ${read?'':'unread'}' data-id='${n.notification_id}' ${postId?`data-post='${postId}'`:''}>
      <span class='notif-text' style='cursor:${postId?'pointer':'default'}'>${actor}${msg}</span>
      <div style='display:flex;align-items:center;gap:8px;'><time>${d.toLocaleString()}</time>${!read?`<button class='notif-mark' data-mark>Mark read</button>`:''}</div>
    </li>`;
  }).join('')}</ul>`;
}

// Enable navigation when clicking items inside the popover
export function bindNotificationNavigation(popRoot){
  if(!popRoot) return;
  popRoot.addEventListener('click', async e=>{
    const li=e.target.closest('.notif-item');
    if(!li) return;
    const postId=li.getAttribute('data-post');
    if(postId && !e.target.closest('.notif-mark')){
      sessionStorage.setItem('focus_post_id', postId);
      try{ const {navigate}=await import('../main.js'); navigate('/dashboard'); }catch{}
    }
  });
}
