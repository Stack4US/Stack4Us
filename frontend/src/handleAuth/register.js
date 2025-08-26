import axios from 'axios';
function register(url) {
  const form = document.getElementById('form_register');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user_name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validación básica
    if (!user_name || !email || !password) {
      alert('Por favor, completa todos los campos');
      return;
    }
    
    const userData = {
      user_name,
      email,
      password,
      // role: document.getElementById('role').value
    };
    await axios.post(`${url}/register`, userData) // Backend can update this root name
  });
}

export default register;