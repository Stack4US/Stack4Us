import axios from 'axios';
export let loged = false;
import { navigate } from '../main';

function login(url) {
  const form = document.getElementById('form_login');
  if (!form) return;

  // cache inputs once //ablandoa
  const userInput = document.getElementById('name');        //ablandoa
  const passInput = document.getElementById('password');    //ablandoa
  const submitBtn = form.querySelector('button[type="submit"]'); //ablandoa

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // read & normalize //ablandoa
    const user_name = (userInput?.value || '').trim();      //ablandoa
    const password  = (passInput?.value || '').trim();      //ablandoa

    if (!user_name || !password) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const userData = { user_name, password };

    try {
      // prevent double submit //ablandoa
      if (submitBtn) submitBtn.disabled = true;             //ablandoa

      const resp = await axios.post(`${url}/login`, userData);
      loged = resp.status === 200 || resp.status === 201;

      if (loged) {
        localStorage.setItem('Auth', 'true');
        localStorage.setItem('role', 'coder');

        // Persist real user info for later (dashboard posts, etc.) //ablandoa
        const user = resp.data?.user || {};                        //ablandoa
        const uid  = String(user.user_id ?? user.id ?? '');        //ablandoa
        if (uid) localStorage.setItem('user_id', uid);             //ablandoa
        if (user.user_name) localStorage.setItem('user_name', user.user_name); //ablandoa

        navigate('/dashboard');
      } else {
        alert('Usuario o contraseña inválidos');
      }
    } catch (err) {
      // Friendly error handling for UX //ablandoa
      console.error('Login error:', err);                          //ablandoa
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Error al iniciar sesión';
      alert(msg);
    } finally {
      // re-enable button //ablandoa
      if (submitBtn) submitBtn.disabled = false;                   //ablandoa
    }
  });
}

export default login;
