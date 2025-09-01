// src/main.js
import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard";
import { fetchNotifications, buildPopover, bindNotificationNavigation } from './views/notifications.js';
// Global styles (bundled by Vite - SPA approach Option 1)
import './css/theme.css';
import './css/navbar.css';
import './css/style.css';
import './css/login.css';
import './css/footer.css';
import './css/dashboard.css';
import './css/profile.css';
import './css/edit-post.css';

// Rutas (SPA)
const routes = {
  "/dashboard": "/templates/dashboard.html",
  "/comments": "/templates/comments.html",
  "/ranking": "/templates/ranking.html",
  "/edit-post": "/templates/edit-post.html",
  "/profile": "/templates/profile.html",
  // Auth
  "/register": "/templates/auth/register.html",
  "/login": "/templates/auth/login.html",
  // Página interna opcional de notificaciones (además del popover)
  "/notifications": "/templates/notifications.html",
};

const url = "https://stack4us.up.railway.app/api/users"; // base solo para auth (login/register)

// helper minúsculo para validar formato de JWT
function hasValidToken() {
  const t = (localStorage.getItem("token") || "").trim();
  return t && t.split(".").length === 3;
}

function setupNavigation(currentPath) {
  const nav = document.getElementById("navUl");
  if (!nav) return;
  const appPages = ["/dashboard", "/ranking"]; // internal app pages
  const onAppPages = appPages.includes(currentPath);
  const isMobile = window.innerWidth < 1000;
  const activeClass = (p) => (currentPath === p ? "active" : "");

  if (onAppPages) {
    if (!isAuth() || !hasValidToken()) {
      nav.innerHTML = `
        <a href="/about.html" class="noAuth">About</a>
        <a href="/register" class="noAuth" data-link>Register</a>
        <a href="/login" class="noAuth" data-link>Login</a>
      `;
      return;
    }
    if (isMobile) {
      nav.innerHTML = `
        <a href="/dashboard" data-link class="${activeClass('/dashboard')}">Comments</a>
        <a href="/ranking" data-link class="${activeClass('/ranking')}">Ranking</a>
        <a href="/logout" data-link id="close-sesion">Logout</a>
      `;
    } else {
      nav.innerHTML = `<a href="/logout" data-link id="close-sesion">Logout</a>`;
    }
    return;
  }

  if (!isAuth() || !hasValidToken()) {
    nav.innerHTML = `
      <a href="/about.html" class="noAuth">About</a>
      <a href="/register" class="noAuth" data-link>Register</a>
      <a href="/login" class="noAuth" data-link>Login</a>
    `;
    return;
  }

  nav.innerHTML = `
    <a href="/dashboard" data-link>Dashboard</a>
    <a href="/ranking" data-link>Ranking</a>
    <a href="/logout" data-link id="close-sesion">Logout</a>
  `;
}

function setupMobileMenu(path){
  const btn=document.getElementById('hamburgerBtn');
  const drawer=document.getElementById('mobileMenu');
  const linksWrap=document.getElementById('mobileNavLinks');
  const footer=document.getElementById('mobileMenuFooter');
  if(!btn||!drawer||!linksWrap) return;
  function build(){
    const isAuthd = isAuth() && hasValidToken();
    linksWrap.innerHTML = isAuthd ? `
      <a href="/dashboard" data-link class="${path==='/dashboard'?'active':''}">Comments</a>
      <a href="/ranking" data-link class="${path==='/ranking'?'active':''}">Ranking</a>
      <a href="/profile" data-link class="profile-link ${path==='/profile'?'active':''}">My Profile</a>
    ` : `
      <a href="/about.html">About</a>
      <a href="/register" data-link>Register</a>`;
    footer.innerHTML = isAuthd ? `<a href="/logout" data-link id="close-sesion">Logout</a>` : '';
  }
  build();
  function open(){ drawer.classList.remove('hidden'); drawer.classList.add('open'); btn.classList.add('is-open'); btn.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); }
  function close(){ drawer.classList.add('hidden'); drawer.classList.remove('open'); btn.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); }
  btn.onclick = ()=>{ if(drawer.classList.contains('hidden')) open(); else close(); };
  drawer.addEventListener('click', e=>{ if(e.target.dataset.close==='drawer') close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  setupMobileMenu.rebuild = (newPath)=>{ path=newPath; build(); };
}

export async function navigate(pathname) {
  if ((!isAuth() || !hasValidToken()) && pathname !== "/login" && pathname !== "/register") {
    pathname = "/login";
  }

  const route = routes[pathname];
  if(!route){
    // fallback
    pathname = isAuth() && hasValidToken() ? '/dashboard' : '/login';
  }
  const html = await fetch(routes[pathname]).then((res) => res.text());
  document.getElementById("content").innerHTML = html;
  history.pushState({}, "", pathname);

  const layoutPages = ["/dashboard","/ranking","/notifications"]; // agregar aquí si se desea que tengan layout
  if (layoutPages.includes(pathname)) document.body.classList.add("has-dashboard"); else document.body.classList.remove("has-dashboard");

  if (pathname === "/login") login(url);
  if (pathname === "/register") register(url);

  // (dashboard/profile/edit-post styles already bundled)

  if (pathname === "/dashboard") {
    await renderDashboardAfterTemplateLoaded();
  }
  if (pathname === "/ranking") {
    const mod = await import("./views/ranking.js");
    await mod.renderRankingAfterTemplateLoaded();
  }
  if (pathname === "/edit-post") {
    const mod = await import("./views/editPost.js");
    await mod.renderEditPostAfterTemplateLoaded();
  }
  if (pathname === "/profile") {
    const mod = await import("./views/profile.js");
    await mod.renderProfileAfterTemplateLoaded();
  }
  if (pathname === "/notifications") {
  const mod = await import("./views/notifications.js");
  await mod.renderNotificationsAfterTemplateLoaded();
  }

  // NOTIFICATION POPUP
  const bellBtn=document.getElementById('bellBtn');
  const bellIcon=document.getElementById('bellIconImg');
  const bellBadge=document.getElementById('bellBadge');
  const pop=document.getElementById('notifPopover');
  if(bellBtn && pop){
    let open=false; let loaded=false; let cache=[];
    async function refresh(){
      try { cache=await fetchNotifications(); } catch { cache=[]; }
      bellBadge.classList.toggle('hidden', !cache.some(n=> n.status!=='read'));
  bellIcon.src = cache.some(n=> n.status!=='read')? '/img/mdi_bell-badge.png':'/img/mdi_bell.png';
      pop.innerHTML = `<div class='notif-popover-header'><span>Notifications</span><button class='close-pop' data-close>x</button></div>` + buildPopover(cache);
      bindNotificationNavigation(pop);
      loaded=true; bindMarks();
    }
    function bindMarks(){
      pop.querySelectorAll('.notif-mark').forEach(btn=>{
        btn.addEventListener('click', async ev=>{
          ev.stopPropagation();
          const li=btn.closest('.notif-item'); if(!li) return; const id=li.dataset.id; btn.disabled=true;
          try{
            await fetch(`https://stack4us.up.railway.app/api/notifications/${id}`, {method:'PATCH', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
            li.classList.remove('unread'); btn.remove();
            cache=cache.map(n=> n.notification_id==id? {...n, status:'read'}:n);
            bellBadge.classList.toggle('hidden', !cache.some(n=> n.status!=='read'));
            bellIcon.src = cache.some(n=> n.status!=='read')? '/img/mdi_bell-badge.png':'/img/mdi_bell.png';
          }catch{}
        });
      });
    }
    bellBtn.addEventListener('click', async ()=>{ open=!open; pop.classList.toggle('hidden', !open); if(open && !loaded){ await refresh(); } });
    document.addEventListener('click', e=>{ if(!open) return; if(e.target.closest('#bellBtn')|| e.target.closest('#notifPopover')) return; open=false; pop.classList.add('hidden'); });
    pop.addEventListener('click', e=>{ if(e.target.matches('[data-close]')){ open=false; pop.classList.add('hidden'); } });
  }

  setupNavigation(pathname);
  setupMobileMenu(pathname);
  if(typeof setupMobileMenu.rebuild==='function') setupMobileMenu.rebuild(pathname);
}

  // === Live user info refresh (desktop + mobile) ===
  function refreshUserUI(){
    const name = localStorage.getItem('user_name') || 'User';
    let role = localStorage.getItem('role') || '';
    if(role==='1') role='coder'; else if(role==='2') role='team_leader'; else if(role==='3') role='admin';
    const avatar = localStorage.getItem('profile_image');
    const nameEl = document.getElementById('navUserName');
    const roleEl = document.getElementById('navUserRole');
    const avatarEl = document.getElementById('sidebarAvatar');
    if(nameEl) nameEl.textContent = name;
    if(roleEl) roleEl.textContent = role || 'coder';
    if(avatarEl){
      if(avatar){
        avatarEl.innerHTML = `<img src='${avatar}' alt='avatar' style='width:100%;height:100%;object-fit:cover;border-radius:50%' onerror="this.remove();">`;
      } else if(!avatarEl.textContent.trim()) {
        avatarEl.textContent='👤';
      }
    }
    // mobile menu (if open or will open later, rebuild its content)
    if(typeof setupMobileMenu.rebuild==='function') setupMobileMenu.rebuild(window.location.pathname);
  }
  document.addEventListener('user:updated', refreshUserUI);
  window.addEventListener('storage', (e)=>{ if(['user_name','role','profile_image'].includes(e.key)) refreshUserUI(); });

document.body.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    const path = e.target.getAttribute("href");

    if (path === "/logout") {
      localStorage.setItem("Auth", "false");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_name");
      navigate("/login");
      return;
    }
    navigate(path);
  }

  const uc = e.target.closest('#sidebarUserCard');
  if (uc) {
    e.preventDefault();
    navigate('/profile');
  }
});

window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add('theme-dark');
  if (localStorage.getItem("Auth") === "true" && !hasValidToken()) {
    localStorage.setItem("Auth", "false");
  }
  const path = window.location.pathname;
  if (routes[path]) navigate(path); else {
    if (!isAuth() || !hasValidToken()) navigate("/login"); else navigate("/dashboard");
  }
});

window.addEventListener("resize", () => setupNavigation(window.location.pathname));
