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

  const resp = await axios.post(`${url}/login`, userData); // peticion login //ablandoa
  console.debug('[login] raw resp.data', resp.data); // debug //ablandoa
      loged = resp.status === 200 || resp.status === 201;

      if (loged) {
        localStorage.setItem('Auth', 'true');
        const user = resp.data?.user || {}; // objeto user devuelto //ablandoa
        let token = resp.data?.token;     // jwt devuelto (clave esperada) //ablandoa
        // Fallback: buscar cualquier string con formato JWT en el objeto respuesta //ablandoa
        if (!token) {
          const possible = [];
          const walk = (obj) => {
            if (!obj) return;
            if (typeof obj === 'string') {
              if (/^[A-Za-z0-9-_]+=*\.[A-Za-z0-9-_]+=*\.[A-Za-z0-9-_]+=*$/.test(obj) || obj.split('.').length === 3) possible.push(obj);
              return;
            }
            if (Array.isArray(obj)) { obj.forEach(walk); return; }
            if (typeof obj === 'object') { Object.values(obj).forEach(walk); }
          };
          try { walk(resp.data); } catch(_) {}
          if (possible.length) {
            token = possible.find(t => t.split('.').length === 3);
            console.debug('[login] token fallback encontrado', token?.slice(0,25)+'...');
          }
        }
  if (token) {
          localStorage.setItem('token', token); // guardamos token //ablandoa
          console.debug('[login] token guardado length', token.length); //ablandoa
          // Intentar extraer rol desde el payload del JWT (sin verificar firma, solo lectura rápida) //ablandoa
          try {
            const payloadB64 = token.split('.')[1]; // segunda parte //ablandoa
            const payloadJson = JSON.parse(atob(payloadB64)); // decodificar //ablandoa
            if (payloadJson?.rol != null) {
              let r = String(payloadJson.rol);
              // mapear numerico -> alias //ablandoa
              if (r === '1') r = 'coder';
              else if (r === '2') r = 'admin';
              else if (r === '3') r = 'team_leader';
              localStorage.setItem('role', r); //ablandoa
            }
          } catch (e) { console.warn('decode jwt fallo', e); } //ablandoa
        }
        // Fallback si no pudimos deducir rol //ablandoa
        if (!localStorage.getItem('role')) localStorage.setItem('role', 'coder'); //ablandoa
        if (!token) {
          console.warn('[login] No se recibió token en la respuesta. Edición de posts fallará.');
        } else if (!localStorage.getItem('token')) {
            console.warn('[login] token detectado pero no persistido');
        }
        // Persist real user info for later (dashboard posts, etc.) //ablandoa
        const uid  = String(user.user_id ?? user.id ?? '');        //ablandoa
        if (uid) localStorage.setItem('user_id', uid);             //ablandoa
        if (user.user_name) localStorage.setItem('user_name', user.user_name); //ablandoa

        // Confirmar que el token quedó persistido antes de navegar //ablandoa
        console.debug('[login] localStorage keys ahora', {
          Auth: localStorage.getItem('Auth'),
          role: localStorage.getItem('role'),
          user_id: localStorage.getItem('user_id'),
          hasToken: !!localStorage.getItem('token')
        }); //ablandoa
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
