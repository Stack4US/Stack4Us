import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
// routes
const routes = {

  // Loged secction
  "/dashboard": "./src/templates/dashboard.html",
  "/comments": "./src/templates/comments.html",
  "/ranking": "./src/templates/ranking.html",


  // Login and Register
  "/register": "./src/templates/auth/register.html",
  "/login": "./src/templates/auth/login.html",
};

const url = 'http://localhost:3000';


function setupNavigation() {
  const nav = document.getElementById("navUl");
  
  if (!nav) return;
  
  const userRole = localStorage.getItem("role"); // This variable was created to handle views || admin || coder || team_leader

  if (!isAuth()) {
    nav.innerHTML = `
      <a href="/register" class="noAuth" data-link>Register</a>
    `;
    return;
  } else {
    nav.innerHTML = `
      <a href="/dashboard" data-link>Comentarios</a>
      <a href="/ranking" data-link>Ranking</a>
      <a href="/logout" data-link id="close-sesion">Logout</a>
    `;
  }
}

export async function navigate(pathname) {
  // Allow access to login and register pages without authentication
  if (!isAuth() && pathname !== "/login" && pathname !== "/register") {
    pathname = "/login";
  }

  const route = routes[pathname];
  const html = await fetch(route).then((res) => res.text());
  document.getElementById("content").innerHTML = html;
  history.pushState({}, "", pathname);

  if (pathname === "/login") login(url);
  if (pathname === "/register") register(url);

  // Customer
  // if (pathname === "/dashboard") comments();
  // if (pathname === "/newCustomer") setupAddcustomerForm();
  // if (pathname === "/editcustomer") setupEditcustomerForm()

  // Setup navigation after loading content
  setupNavigation();
}

document.body.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    const path = e.target.getAttribute("href");
    
    // Manejar logout
    if (path === "/logout") {
      localStorage.setItem("Auth", "false");
      localStorage.removeItem("role");
      navigate("/login");
      return;
    }
    
    navigate(path);
  }
});

// Initialize navigation when the page loads
window.addEventListener("DOMContentLoaded", () => {
  // Render nav (login/register or user links)
  setupNavigation();

  // Load initial route safely: if the current pathname matches a known route, navigate there.
  // Otherwise, send unauthenticated users to /login and authenticated users to /dashboard.
  const path = window.location.pathname;
  if (routes[path]) {
    navigate(path);
  } else {
    if (!isAuth()) navigate("/login");
    else navigate("/dashboard");
  }
});