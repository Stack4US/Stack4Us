// Edit Post view logic //ablandoa
import { navigate } from '../main';

const API = 'https://stack4us.up.railway.app'; // match backend base //ablandoa

function qs(id){ return document.getElementById(id); }

export async function renderEditPostAfterTemplateLoaded(){
  // (CSS already bundled in main) removed dynamic link injection
  // Recover post data from sessionStorage (set by dashboard) //ablandoa
  const raw = sessionStorage.getItem('edit_post');
  if(!raw){
    alert('No post data.');
    navigate('/dashboard');
    return;
  }
  let post;
  try { post = JSON.parse(raw); } catch { alert('Bad post data'); navigate('/dashboard'); return; }

  // Fill form
  qs('ep_post_id').value = post.post_id;
  qs('ep_title').value = post.title || '';
  qs('ep_description').value = post.description || '';
  qs('ep_type').value = post.type || '';
  qs('ep_status').value = post.status || '';
  const imgWrap = qs('ep_current_image');
  if (post.image){
    imgWrap.innerHTML = `<img src="${post.image}" alt="current" style="max-width:180px;border:1px solid #27313f;border-radius:10px" onerror="this.style.display='none'">`;
  } else {
    imgWrap.textContent = 'No current image';
  }

  const form = qs('edit-post-form');
  const hint = qs('ep_hint');
  const cancelBtn = qs('ep_cancel');

  cancelBtn?.addEventListener('click', () => navigate('/dashboard'));

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hint.textContent = 'Saving...';
  // Token not required after backend revert (no auth middleware)
    const title = qs('ep_title').value.trim();
    const type = qs('ep_type').value.trim();
    const status = qs('ep_status').value.trim();
    const desc = qs('ep_description').value.trim();
    const file = qs('ep_image').files[0];

    // Decide payload strategy: multipart only if there is a file
    const isMultipart = !!file;
    let payload; let headers = {};
    if(isMultipart){
      const fd = new FormData();
      if (title) fd.append('title', title);
      if (type) fd.append('type', type);
      if (status) fd.append('status', status);
      if (desc) fd.append('description', desc);
      fd.append('image', file); // only path if exists
      payload = fd;
    } else {
      const body = {};
      if (title) body.title = title;
      if (type) body.type = type;
      if (status) body.status = status;
      if (desc) body.description = desc;
      if (!Object.keys(body).length){ hint.textContent='No changes'; return; }
      payload = JSON.stringify(body);
      headers['Content-Type']='application/json';
    }

    // Ownership sanity check (client-side) to catch 404 masquerading real 403
    try{
      const rawTok = localStorage.getItem('token');
      if(rawTok){
        const parts=rawTok.split('.');
        if(parts.length===3){
          const decoded = JSON.parse(atob(parts[1]));
            if(decoded.user_id && String(decoded.user_id)!==String(post.user_id)){
              // Ownership mismatch hint (non-blocking). Could indicate viewing someone else's post.
              console.info('[EditPost] Ownership mismatch (token vs post user)', decoded.user_id, post.user_id);
            }
        }
      }
    }catch(err){ console.warn('JWT decode fail', err); }

    // Try modern route first: /api/posts/owns/:id then legacy /owns-posts/:id
    const token=(localStorage.getItem('token')||'').trim();
  const attempts=[`${API}/api/posts/owns/${post.post_id}`, `${API}/owns-posts/${post.post_id}`];
    let success=false; let lastStatus=null;
    for(const url of attempts){
      try{
        console.log('[EditPost] PUT', url);
        const resp=await fetch(url,{
          method:'PUT',
          headers:{ Authorization:`Bearer ${token}`, ...headers },
          body: payload,
          cache:'no-store'
        });
        lastStatus=resp.status;
        let txt=''; try{ txt=await resp.clone().text(); }catch{}
        console.log('[EditPost] Response', resp.status, txt);
        if(resp.ok){
          success=true; hint.textContent='Saved'; break;
        }
        if([404,405].includes(resp.status)) continue; else break;
      }catch(err){ console.warn('Edit attempt failed', url, err); }
    }
    if(!success){
      hint.textContent=`Save failed (${lastStatus||'network'})`;
      return;
    }
    sessionStorage.setItem('force_reload_posts','1');
    setTimeout(()=>navigate('/dashboard'), 600);

  // removed local fallback logic to force real persistence
  });
}
