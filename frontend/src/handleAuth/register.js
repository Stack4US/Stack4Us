import axios from 'axios';

function register(apiBase) {
  const form = document.getElementById('form_register');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const description = document.getElementById('description')?.value.trim();
    const file = document.getElementById('profile_image')?.files[0];

    if (!user_name || !email || !password) {
      alert('Please complete username, email and password');
      return;
    }

    const payload = { user_name, email, password };
    try {
      // corrected: apiBase already includes /api/users
      const regResp = await axios.post(`${apiBase}/register`, payload, { headers: { 'Content-Type': 'application/json' }});
      if (regResp.status !== 201) {
        alert('Register error');
        return;
      }

      // If no extra data, just finish.
      if (!description && !file) {
        alert('Registration successful. Now log in.');
        return;
      }

      // Quick auto-login ONLY to upload image/description
      try {
        const loginResp = await axios.post(`${apiBase}/login`, { user_name, password });
        const token = loginResp.data?.token;
        if (token) {
          // Temporarily save to use it in the update
          localStorage.setItem('token', token);
          localStorage.setItem('Auth', 'true');
          // get user_id from token (base64 payload)
          let userIdFromToken = null;
          try { const payload = JSON.parse(atob(token.split('.')[1])); userIdFromToken = payload.user_id; } catch{}
          // PUT /api/users/profile (no longer /edit-user/:id)
          const fd = new FormData();
          if (description) fd.append('description', description);
            if (file) fd.append('image', file);
          await fetch(`${apiBase}/profile`, { method:'PUT', body: fd, headers:{ Authorization:`Bearer ${token}` }}).catch(()=>{});
          // Load list to get image (getAll includes profile_image)
          try{
            const all = await fetch(`${apiBase}/all`, { headers:{ Authorization:`Bearer ${token}` }}).then(r=> r.ok? r.json(): []);
            const me = all.find(u=> Number(u.user_id)===Number(userIdFromToken));
            if(me){
              localStorage.setItem('user_profile', JSON.stringify(me));
              if(me.profile_image) localStorage.setItem('profile_image', me.profile_image);
              if(me.user_name) localStorage.setItem('user_name', me.user_name);
              localStorage.setItem('user_id', String(me.user_id));
            }
          }catch{}
        }
      } catch (e2) {
        console.warn('Auto profile update failed:', e2.message);
      }
      alert('Registration completed. Log in to continue.');
    } catch (err) {
      console.error('Register error:', err);
      alert(err?.response?.data?.error || 'Register error');
    }
  });
}

export default register;