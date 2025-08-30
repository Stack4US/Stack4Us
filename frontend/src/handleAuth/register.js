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
      const regResp = await axios.post(`${apiBase}/api/users/register`, payload, { headers: { 'Content-Type': 'application/json' }});
      if (regResp.status !== 201) {
        alert('Error registrando');
        return;
      }

      // Si no hay datos extra, terminar.
      if (!description && !file) {
        alert('Registro exitoso, ahora inicia sesión');
        return;
      }

      // Auto-login rápido para obtener user_id y token
      try {
        const loginResp = await axios.post(`${apiBase}/api/users/login`, { user_name, password });
        const user = loginResp.data?.user;
        const token = loginResp.data?.token;
        if (user?.user_id) {
          const fd = new FormData();
          if (description) fd.append('description', description);
          if (file) fd.append('image', file);
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const upd = await fetch(`${apiBase}/edit-user/${user.user_id}`, { method:'POST', body: fd, headers });
          if (upd.ok) {
            const data = await upd.json();
            localStorage.setItem('user_profile', JSON.stringify(data.user));
          }
        }
      } catch (e2) {
        console.warn('Auto update profile failed:', e2.message);
      }
      alert('Registro completado. Inicia sesión para continuar.');
    } catch (err) {
      console.error('Error registrando:', err);
      alert(err?.response?.data?.error || 'Error registrando');
    }
  });
}

export default register;