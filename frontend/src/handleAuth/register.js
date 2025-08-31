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
      alert('Por favor, completa usuario, email y contraseña');
      return;
    }

    const payload = { user_name, email, password };
    try {
      // corregido: apiBase ya incluye /api/users
      const regResp = await axios.post(`${apiBase}/register`, payload, { headers: { 'Content-Type': 'application/json' }});
      if (regResp.status !== 201) {
        alert('Error registrando');
        return;
      }

      // Si no hay datos extra, terminar.
      if (!description && !file) {
        alert('Registro exitoso. Ahora inicia sesión.');
        return;
      }

      // Auto-login rápido SOLO para subir imagen/descripcion
      try {
        const loginResp = await axios.post(`${apiBase}/login`, { user_name, password });
        const token = loginResp.data?.token;
        if (token) {
          // Guardar temporal para usarlo en la actualización
          localStorage.setItem('token', token);
          localStorage.setItem('Auth', 'true');
          // obtener user_id del token (payload base64)
          let userIdFromToken = null;
          try { const payload = JSON.parse(atob(token.split('.')[1])); userIdFromToken = payload.user_id; } catch{}
          // PUT /api/users/profile (ya no /edit-user/:id)
          const fd = new FormData();
          if (description) fd.append('description', description);
            if (file) fd.append('image', file);
          await fetch(`${apiBase}/profile`, { method:'PUT', body: fd, headers:{ Authorization:`Bearer ${token}` }}).catch(()=>{});
          // Cargar lista para obtener imagen (getAll incluye profile_image)
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
        console.warn('Auto update profile falló:', e2.message);
      }
      alert('Registro completado. Inicia sesión para continuar.');
    } catch (err) {
      console.error('Error registrando:', err);
      alert(err?.response?.data?.error || 'Error registrando');
    }
  });
}

export default register;