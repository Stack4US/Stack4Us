// Edit Post view logic
import { navigate } from '../main';

const API = 'https://stack4us.up.railway.app'; // backend base (not used directly here)

function qs(id){ return document.getElementById(id); }

export async function renderEditPostAfterTemplateLoaded(){
  // Ensure CSS is loaded once
  if(!document.querySelector('link[data-edit-post-css]')){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='/src/css/edit-post.css';
    l.setAttribute('data-edit-post-css','1');
    document.head.appendChild(l);
  }

  // Get post data from sessionStorage (set by dashboard)
  const raw = sessionStorage.getItem('edit_post');
  if(!raw){
    alert('No post data.');
    navigate('/dashboard');
    return;
  }

  // Parse saved post JSON
  let post;
  try { 
    post = JSON.parse(raw); 
  } catch { 
    alert('Bad post data'); 
    navigate('/dashboard'); 
    return; 
  }

  // Fill form with current values
  qs('ep_post_id').value = post.post_id;
  qs('ep_title').value = post.title || '';
  qs('ep_description').value = post.description || '';
  qs('ep_type').value = post.type || '';
  qs('ep_status').value = post.status || '';

  // Show current image (or fallback text)
  const imgWrap = qs('ep_current_image');
  if (post.image){
    imgWrap.innerHTML = `<img src="${post.image}" alt="current" style="max-width:180px;border:1px solid #27313f;border-radius:10px" onerror="this.style.display='none'">`;
  } else {
    imgWrap.textContent = 'No current image';
  }

  const form = qs('edit-post-form');
  const hint = qs('ep_hint');
  const cancelBtn = qs('ep_cancel');

  // Back to dashboard
  cancelBtn?.addEventListener('click', () => navigate('/dashboard'));

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hint.textContent = 'Saving...';

    // Token not required after backend revert (no auth middleware)
    const fd = new FormData();
    const title = qs('ep_title').value.trim();
    const type = qs('ep_type').value.trim();
    const status = qs('ep_status').value.trim();
    const desc = qs('ep_description').value.trim();
    const file = qs('ep_image').files[0];

    // Only append changed fields
    if (title) fd.append('title', title);
    if (type) fd.append('type', type);
    if (status) fd.append('status', status);
    if (desc) fd.append('description', desc);
    if (file) fd.append('image', file);

    // Nothing to update
    if ([...fd.keys()].length === 0){ 
      hint.textContent = 'No changes'; 
      return; 
    }

    // Local-only update: store overrides in localStorage (simulated edit)
    try {
      const overridesRaw = localStorage.getItem('post_overrides') || '{}';
      let overrides = {};
      try { overrides = JSON.parse(overridesRaw); } catch { overrides = {}; }

      // Build changes object
      const changes = {};
      if (title) changes.title = title;
      if (type) changes.type = type;
      if (status) changes.status = status;
      if (desc) changes.description = desc;

      // If new image, convert to dataURL for local preview
      if (file) {
        const toDataURL = (file)=> new Promise((res,rej)=>{
          const reader = new FileReader();
          reader.onload = ()=>res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        try { changes.image = await toDataURL(file); } catch {}
      }

      // Merge with existing overrides for this post_id
      overrides[post.post_id] = { ...(overrides[post.post_id]||{}), ...changes };
      localStorage.setItem('post_overrides', JSON.stringify(overrides));

      hint.textContent = 'Saved locally';
      setTimeout(()=>navigate('/dashboard'), 600);
    } catch(err){
      console.error(err);
      hint.textContent = 'Error saving locally';
    }
  });
}
