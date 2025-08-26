import axios from 'axios';
export let loged = false;
import { navigate } from '../main';
function login(url) {
  const form = document.getElementById('form_login');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user_name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    
    if (!user_name || !password) {
      alert('Por favor, completa todos los campos');
      return;
    }
    
    const userData = {
      user_name,
      password
    };
      const data = await axios.post(`${url}/login`, userData)
      loged = data.status === 200 || data.status === 201;
      if (loged) {
         localStorage.setItem("Auth", "true");
        localStorage.setItem("role", "coder");
        navigate("/dashboard")
      }
  });
}

export default login;