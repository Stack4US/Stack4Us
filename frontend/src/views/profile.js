// Simple profile view logic
export async function renderProfileAfterTemplateLoaded(){
  // Ensure profile stylesheet loaded (avoid duplicate)
  if (!document.querySelector('link[data-profile-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/css/profile.css';
    link.setAttribute('data-profile-css','1');
    document.head.appendChild(link);
  }
  const nameEl = document.getElementById('profileUserName');
  const roleEl = document.getElementById('profileRole');
  const emailEl = document.getElementById('profileEmail');
  const descEl = document.getElementById('profileDescription');
  const avatarEl = document.getElementById('profileAvatar');
  const btnEdit = document.getElementById('btnEditDesc');
  const form = document.getElementById('formEditDesc');
  const input = document.getElementById('descInput');
  const btnCancel = document.getElementById('btnCancelDesc');
  const hint = document.getElementById('descHint');

  const API = 'https://stack4us.up.railway.app';

  // Basic user info
  const user_name = localStorage.getItem('user_name') || 'User';
  let role = localStorage.getItem('role') || localStorage.getItem('rol_id') || 'coder';
  if (role === '1') role = 'coder';
  if (role === '2') role = 'team_leader';
  if (role === '3') role = 'admin';
  const email = localStorage.getItem('email') || '';
  const user_id = localStorage.getItem('user_id');

  let storedProfile = {};
  try { storedProfile = JSON.parse(localStorage.getItem('user_profile')||'{}'); } catch{}

  function hydrateFromCache(){
    if(storedProfile.profile_image && storedProfile.user_name) return; // already have
    try{
      const cache = JSON.parse(localStorage.getItem('all_users_cache')||'[]');
      const me = cache.find(u=> String(u.user_id)===String(user_id));
      if(me){ storedProfile = { ...me, ...storedProfile }; localStorage.setItem('user_profile', JSON.stringify(storedProfile)); }
    }catch{}
  }
  hydrateFromCache();

  async function refreshFromAPI(){
    try{
      const token = localStorage.getItem('token');
      if(!token || !user_id) return;
      const r = await fetch(`${API}/api/users/all`, { headers:{ Authorization:`Bearer ${token}` }});
      if(r.ok){
        const list = await r.json();
        const me = list.find(u=> String(u.user_id)===String(user_id));
        if(me){
          storedProfile = { ...storedProfile, ...me };
          localStorage.setItem('user_profile', JSON.stringify(storedProfile));
          if(me.profile_image) localStorage.setItem('profile_image', me.profile_image);
          if(me.user_name) localStorage.setItem('user_name', me.user_name);
          paint();
        }
      }
    }catch(err){ console.warn('profile refresh fail', err); }
  }
  await refreshFromAPI();

  function paint(){
    nameEl.textContent = storedProfile.user_name || user_name;
    roleEl.textContent = role;
    emailEl.textContent = storedProfile.email || email;
    descEl.textContent = storedProfile.description || 'No description set.';
    const img = storedProfile.profile_image || localStorage.getItem('profile_image');
    const fallback = '/src/assets/img/qlementine-icons_user-16.png';
    if (img) { avatarEl.src = img; avatarEl.style.display='block'; }
    else { avatarEl.src = fallback; avatarEl.style.display='block'; }
    avatarEl.onerror = () => { avatarEl.onerror=null; avatarEl.src=fallback; };
  }
  paint();

  btnEdit?.addEventListener('click', () => {
    form.style.display = 'block';
    btnEdit.style.display = 'none';
    input.value = storedProfile.description || '';
    input.focus();
  });
  btnCancel?.addEventListener('click', () => {
    form.style.display = 'none';
    btnEdit.style.display = 'inline-block';
    hint.textContent = '';
  });

  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const desc = input.value.trim();
    if (desc.length > 500) { hint.textContent = 'Max 500 chars'; return; }
    hint.textContent = 'Saving...';
    try {
      const fd = new FormData();
      fd.append('description', desc);
      const token = localStorage.getItem('token');
      const r = await fetch(`${API}/edit-user/${user_id}`, { method:'POST', body: fd, headers: token? { 'Authorization': `Bearer ${token}` } : {} });
      if(!r.ok){
        const data = await r.json().catch(()=>({}));
        hint.textContent = data.error || 'Error saving';
        return;
      }
      const data = await r.json();
      storedProfile = { ...storedProfile, ...data.user };
      localStorage.setItem('user_profile', JSON.stringify(storedProfile));
      hint.textContent = 'Saved';
      paint();
      setTimeout(()=>{
        form.style.display='none';
        btnEdit.style.display='inline-block';
        hint.textContent='';
      }, 600);
    } catch(err){
      console.error(err);
      hint.textContent = 'Network error';
    }
  });
}
