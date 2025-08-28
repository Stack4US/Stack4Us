// Edit Post view logic //ablandoa
import { navigate } from '../main';

const API = 'http://localhost:3000'; // match backend base //ablandoa

function qs(id){ return document.getElementById(id); }

export async function renderEditPostAfterTemplateLoaded(){
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
    imgWrap.innerHTML = `<img src="${post.image}" alt="current" style="max-width:180px;border:1px solid #ddd;border-radius:6px" onerror="this.style.display='none'">`;
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
    const fd = new FormData();
    const title = qs('ep_title').value.trim();
    const type = qs('ep_type').value.trim();
    const status = qs('ep_status').value.trim();
    const desc = qs('ep_description').value.trim();
    const file = qs('ep_image').files[0];

    if (title) fd.append('title', title);
    if (type) fd.append('type', type);
    if (status) fd.append('status', status);
    if (desc) fd.append('description', desc);
    if (file) fd.append('image', file);
    if ([...fd.keys()].length === 0){ hint.textContent = 'No changes'; return; }

    // Simular actualización local sin backend: guardar overrides en localStorage
    try {
      const overridesRaw = localStorage.getItem('post_overrides') || '{}';
      let overrides = {};
      try { overrides = JSON.parse(overridesRaw); } catch { overrides = {}; }
      const changes = {};
      if (title) changes.title = title;
      if (type) changes.type = type;
      if (status) changes.status = status;
      if (desc) changes.description = desc;
      if (file) {
        // Convertir imagen a dataURL para pre-visualizar localmente
        const toDataURL = (file)=> new Promise((res,rej)=>{
          const reader = new FileReader();
          reader.onload = ()=>res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        try { changes.image = await toDataURL(file); } catch {}
      }
      overrides[post.post_id] = { ...(overrides[post.post_id]||{}), ...changes };
      localStorage.setItem('post_overrides', JSON.stringify(overrides));
      hint.textContent = 'Guardado local';
      setTimeout(()=>navigate('/dashboard'), 500);
    } catch(err){
      console.error(err);
      hint.textContent = 'Error guardando localmente';
    }
  });
}
