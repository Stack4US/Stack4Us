import axios from 'axios';
function register(url) {
  const form = document.getElementById('form_register');
  
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validación básica
    if (!name || !email || !password) {
      alert('Por favor, completa todos los campos');
      return;
    }
    
    const userData = {
      name,
      email,
      password,
      // role: document.getElementById('role').value
    };
    const data = axios.post(`${url}/users/register`, userData) // Backend can update this root name
  });
}

export default register;