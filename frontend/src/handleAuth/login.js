function login() {
  const form = document.getElementById('form_login');
  
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    
    if (!name || !password) {
      alert('Por favor, completa todos los campos');
      return;
    }
    
    const userData = {
      name,
      password
    };
    const data = axios.post(`${url}/users/login`, userData) // Backend can update this root name
    // localStorage.setItem("Auth", "true");
    // localStorage.setItem("role", "user");
    
  });
}

export default login