import axios from 'axios';
export let loged = false;
import { navigate } from '../main';

// Helper: a valid JWT must have 3 parts separated by '.'
function looksLikeJWT(t) {
  return typeof t === 'string' && t.trim().split('.').length === 3;
}

function login(url) {
  const form = document.getElementById('form_login');
  if (!form) return;

  // Cache input elements
  const userInput = document.getElementById('name');
  const passInput = document.getElementById('password');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Read form values
    const user_name = (userInput?.value || '').trim();
    const password  = (passInput?.value || '').trim();

    if (!user_name || !password) {
      alert('Please fill all fields');
      return;
    }

    const userData = { user_name, password };

    try {
      // Prevent double submit
      if (submitBtn) submitBtn.disabled = true;

      // Send request to backend (/api/users/login)
      const resp = await axios.post(`${url}/login`, userData);
      console.debug('[login] raw resp.data', resp.data);

      loged = resp.status === 200 || resp.status === 201;
      if (!loged) {
        alert('Invalid username or password');
        return;
      }

      // -------- Handle response --------
      const userFromResp = resp.data?.user || {};
      let token = resp.data?.token;

      // Fallback: search JWT anywhere in response if not in token field
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
        if (token) console.debug('[login] token fallback found', token.slice(0,25)+'...');
      }

      // Validate token format
      if (!looksLikeJWT(token)) {
        console.warn('[login] No valid JWT received.');
        alert('A valid token was not received. Try again.');
        localStorage.setItem('Auth', 'false');
        localStorage.removeItem('token');
        return;
      }

      // Save token and auth flag
      localStorage.setItem('token', token.trim());
      localStorage.setItem('Auth', 'true');

      // Try to decode token payload (not verifying signature)
      try {
        const payloadB64 = token.split('.')[1]; 
        const payloadJson = JSON.parse(atob(payloadB64));

        // Role mapping
        if (payloadJson?.rol != null) {
          let r = String(payloadJson.rol);
          if (r === '1') r = 'coder';
          else if (r === '2') r = 'admin';
          else if (r === '3') r = 'team_leader';
          localStorage.setItem('role', r);
        }

        // Fallback: user_id from token
        if (payloadJson?.user_id != null && !localStorage.getItem('user_id')) {
          localStorage.setItem('user_id', String(payloadJson.user_id));
        }
      } catch (e) {
        console.warn('[login] jwt decode failed', e);
      }

      // Save user info from response
      const uid = String(userFromResp.user_id ?? userFromResp.id ?? '');
      if (uid) localStorage.setItem('user_id', uid);
      if (userFromResp.user_name) localStorage.setItem('user_name', userFromResp.user_name);

      // Default role if missing
      if (!localStorage.getItem('role')) localStorage.setItem('role', 'coder');

      console.debug('[login] localStorage keys', {
        Auth: localStorage.getItem('Auth'),
        role: localStorage.getItem('role'),
        user_id: localStorage.getItem('user_id'),
        hasToken: !!localStorage.getItem('token')
      });

      // Update sidebar UI if mounted
      try {
        const nameEl = document.getElementById('navUserName');
        const roleEl = document.getElementById('navUserRole');
        const avatarEl = document.getElementById('sidebarAvatar');
        if (nameEl) nameEl.textContent = localStorage.getItem('user_name') || 'User';
        if (roleEl) roleEl.textContent = localStorage.getItem('role') || 'coder';
        if (avatarEl && !avatarEl.querySelector('img')) {
          const profileImage = localStorage.getItem('profile_image');
          if (profileImage) {
            avatarEl.innerHTML = `<img src='${profileImage}' alt='avatar' style='width:100%;height:100%;object-fit:cover;border-radius:50%' onerror="this.remove();">`;
          }
        }
      } catch (_) {}

      // Dispatch event and navigate to dashboard
      document.dispatchEvent(new CustomEvent('user:updated', { detail: { source: 'login' }}));
      navigate('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Error logging in';
      alert(msg);
    } finally {
      // Re-enable submit button
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

export default login;
