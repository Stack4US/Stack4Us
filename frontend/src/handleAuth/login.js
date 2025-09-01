import axios from 'axios';
export let loged = false;
import { navigate } from '../main';

// helper: un JWT válido debe tener 3 partes separadas por '.'
function looksLikeJWT(t) {
  return typeof t === 'string' && t.trim().split('.').length === 3;
}

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
      alert('Please fill all fields');
      return;
    }

    const userData = { user_name, password };

    try {
      // prevent double submit //ablandoa
      if (submitBtn) submitBtn.disabled = true;             //ablandoa

      const resp = await axios.post(`${url}/login`, userData); // url ya incluye /api/users
      console.debug('[login] raw resp.data', resp.data);        // debug //ablandoa

      loged = resp.status === 200 || resp.status === 201;

      if (!loged) {
        alert('Invalid username or password');
        return;
      }

      // -------- procesar respuesta --------
      const userFromResp = resp.data?.user || {};
      let token = resp.data?.token;

      // Fallback: buscar cualquier string con formato JWT dentro del objeto respuesta //ablandoa
      if (!looksLikeJWT(token)) {
        let found = null;
        const walk = (obj) => {
          if (!obj || found) return;
          if (typeof obj === 'string' && looksLikeJWT(obj)) { found = obj; return; }
          if (Array.isArray(obj)) { obj.forEach(walk); return; }
          if (typeof obj === 'object') { Object.values(obj).forEach(walk); }
        };
        try { walk(resp.data); } catch(_) {}
        token = found || null;
        if (token) console.debug('[login] token fallback encontrado', token.slice(0,25)+'...');
      }

      if (!looksLikeJWT(token)) {
        console.warn('[login] No valid JWT received (avoid storing token).');
        alert('A valid token was not received. Try again.');
        // asegurar estado "no autenticado"
        localStorage.setItem('Auth', 'false');
        localStorage.removeItem('token');
        return;
      }

      // Guardar token y marcar sesión
      localStorage.setItem('token', token.trim());
      localStorage.setItem('Auth', 'true');

      // Intentar extraer rol e id del payload del JWT (lectura sin verificación de firma)
      try {
        const payloadB64 = token.split('.')[1]; // segunda parte //ablandoa
        const payloadJson = JSON.parse(atob(payloadB64));   // decodificar //ablandoa

        // role
        if (payloadJson?.rol != null) {
          let r = String(payloadJson.rol);
          if (r === '1') r = 'coder';
          else if (r === '2') r = 'admin';
          else if (r === '3') r = 'team_leader';
          localStorage.setItem('role', r);
        }

        // user_id desde token como respaldo
        if (payloadJson?.user_id != null && !localStorage.getItem('user_id')) {
          localStorage.setItem('user_id', String(payloadJson.user_id));
        }
      } catch (e) {
        console.warn('[login] jwt decode failed', e);
      }

      // Persistir datos de usuario de la respuesta (tiene prioridad)
      const uid = String(userFromResp.user_id ?? userFromResp.id ?? '');
      if (uid) localStorage.setItem('user_id', uid);
      if (userFromResp.user_name) localStorage.setItem('user_name', userFromResp.user_name);

      // Fallback si no quedó role
      if (!localStorage.getItem('role')) localStorage.setItem('role', 'coder');

      // Confirmación en consola
      console.debug('[login] localStorage keys ahora', {
        Auth: localStorage.getItem('Auth'),
        role: localStorage.getItem('role'),
        user_id: localStorage.getItem('user_id'),
        hasToken: !!localStorage.getItem('token')
      });

      // navegar al dashboard
      navigate('/dashboard');

    } catch (err) {
      console.error('Login error:', err); // abl
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Error logging in';
      alert(msg);
    } finally {
      // re-enable button //ablandoa
      if (submitBtn) submitBtn.disabled = false;             //ablandoa
    }
  });
}

export default login;
