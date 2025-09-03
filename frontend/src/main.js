// src/main.js (SPA router + layout + notifications UI)
import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard";
import { fetchNotifications, buildPopover, bindNotificationNavigation } from './views/notifications.js';

// SPA routes: path -> template file
const routes = {
  "/dashboard": "./src/templates/dashboard.html",
  "/comments": "./src/templates/comments.html",
  "/ranking": "./src/templates/ranking.html",
  "/edit-post": "./src/templates/edit-post.html",
  "/profile": "./src/templates/profile.html",
  // Auth
  "/register": "./src/templates/auth/register.html",
  "/login": "./src/templates/auth/login.html",
  // Optional full page for notifications
  "/notifications": "./src/templates/notifications.html",
};

const url = "https://stack4us.up.railway.app/api/users"; // base for auth only

// Tiny helper: basic JWT shape check
function hasValidToken() {
  const t = (localStorage.getItem("token") || "").trim();
  return t && t.split(".").length === 3;
}

// Build top navigation based on page + auth state
function setupNavigation(currentPath) {
  const nav = document.getElementById("navUl");
  if (!nav) return;

  const appPages = ["/dashboard", "/ranking"]; // pages with minimal nav
  const onAppPages = appPages.includes(currentPath);
  const isMobile = window.innerWidth < 1000;
  const activeClass = (p) => (currentPath === p ? "active" : "");

  // If in app pages, show compact nav (or public links if not auth)
  if (onAppPages) {
    if (!isAuth() || !hasValidToken()) {
      nav.innerHTML = `
        <a href="/about.html" class="noAuth">About</a>
        <a href="/register" class="noAuth" data-link>Register</a>
        <a href="/login" class="noAuth" data-link>Login</a>
      `;
      return;
    }
    // Mobile: show app links
    if (isMobile) {
      nav.innerHTML = `
        <a href="/dashboard" data-link class="${activeClass('/dashboard')}">Comments</a>
        <a href="/ranking" data-link class="${activeClass('/ranking')}">Ranking</a>
        <a href="/logout" data-link id="close-sesion">Logout</a>
      `;
    } else {
      // Desktop: only logout (sidebar holds the rest)
      nav.innerHTML = `<a href="/logout" data-link id="close-sesion">Logout</a>`;
    }
    return;
  }

  // Public pages full nav if not auth
  if (!isAuth() || !hasValidToken()) {
    nav.innerHTML = `
      <a href="/about.html" class="noAuth">About</a>
      <a href="/register" class="noAuth" data-link>Register</a>
      <a href="/login" class="noAuth" data-link>Login</a>
    `;
    return;
  }

  // Default authenticated nav
  nav.innerHTML = `
    <a href="/dashboard" data-link>Dashboard</a>
    <a href="/ranking" data-link>Ranking</a>
    <a href="/logout" data-link id="close-sesion">Logout</a>
  `;
}

// Mobile drawer: build links + open/close behavior
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

  // Drawer controls
  function open(){ drawer.classList.remove('hidden'); drawer.classList.add('open'); btn.classList.add('is-open'); btn.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); }
  function close(){ drawer.classList.add('hidden'); drawer.classList.remove('open'); btn.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); }
  btn.onclick = ()=>{ if(drawer.classList.contains('hidden')) open(); else close(); };
  drawer.addEventListener('click', e=>{ if(e.target.dataset.close==='drawer') close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });

  // Allow rebuilding links from outside
  setupMobileMenu.rebuild = (newPath)=>{ path=newPath; build(); };
}

// Main SPA navigation: load template, mount page logic, adjust layout
export async function navigate(pathname) {
  // Guard: redirect to /login if not authenticated (except auth pages)
  if ((!isAuth() || !hasValidToken()) && pathname !== "/login" && pathname !== "/register") {
    pathname = "/login";
  }

  // Resolve route (fallback to dashboard/login)
  const route = routes[pathname];
  if(!route){
    pathname = isAuth() && hasValidToken() ? '/dashboard' : '/login';
  }

  // Load template HTML and mount in #content
  const html = await fetch(routes[pathname]).then((res) => res.text());
  document.getElementById("content").innerHTML = html;
  history.pushState({}, "", pathname);

  // Toggle dashboard layout class
  const layoutPages = ["/dashboard","/ranking","/notifications"];
  if (layoutPages.includes(pathname)) document.body.classList.add("has-dashboard"); else document.body.classList.remove("has-dashboard");

  // Mount page modules
  if (pathname === "/login") login(url);
  if (pathname === "/register") register(url);

  // Lazy load dashboard CSS once
  const needsDashCSS = ["/dashboard","/ranking","/notifications"].includes(pathname);
  if (needsDashCSS && !document.querySelector('link[data-dashboard-css]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/src/css/dashboard.css';
    l.setAttribute('data-dashboard-css', '1');
    document.head.appendChild(l);
  }

  // Page-specific loaders
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

  // ===== Notifications popover (bell in top bar) =====
  const bellBtn=document.getElementById('bellBtn');
  const bellIcon=document.getElementById('bellIconImg');
  const bellBadge=document.getElementById('bellBadge');
  const pop=document.getElementById('notifPopover');

  if(bellBtn && pop){
    let open=false; let loaded=false; let cache=[];

    // Fetch and render popover content
    async function refresh(){
      try { cache=await fetchNotifications(); } catch { cache=[]; }
      bellBadge.classList.toggle('hidden', !cache.some(n=> n.status!=='read'));
      bellIcon.src = cache.some(n=> n.status!=='read')? '/src/assets/img/mdi_bell-badge.png':'/src/assets/img/mdi_bell.png';
      pop.innerHTML = `<div class='notif-popover-header'><span>Notifications</span><button class='close-pop' data-close>x</button></div>` + buildPopover(cache);
      bindNotificationNavigation(pop);
      loaded=true; bindMarks();
    }

    // Bind "Mark read" buttons inside popover
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
            bellIcon.src = cache.some(n=> n.status!=='read')? '/src/assets/img/mdi_bell-badge.png':'/src/assets/img/mdi_bell.png';
          }catch{}
        });
      });
    }

    // Toggle popover open/close
    bellBtn.addEventListener('click', async ()=>{
      open=!open;
      pop.classList.toggle('hidden', !open);
      if(open && !loaded){ await refresh(); }
    });

    // Click outside to close
    document.addEventListener('click', e=>{
      if(!open) return;
      if(e.target.closest('#bellBtn')|| e.target.closest('#notifPopover')) return;
      open=false; pop.classList.add('hidden');
    });

    // Close button inside popover
    pop.addEventListener('click', e=>{
      if(e.target.matches('[data-close]')){ open=false; pop.classList.add('hidden'); }
    });
  }

  // Build header nav + mobile drawer for this page
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

  // Sidebar (desktop)
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

  // Rebuild mobile drawer links if needed
  if(typeof setupMobileMenu.rebuild==='function') setupMobileMenu.rebuild(window.location.pathname);
}
// Listen to cross-component updates and storage changes
document.addEventListener('user:updated', refreshUserUI);
window.addEventListener('storage', (e)=>{ if(['user_name','role','profile_image'].includes(e.key)) refreshUserUI(); });

// Global link handler (SPA navigation + logout)
document.body.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    const path = e.target.getAttribute("href");

    // Handle logout
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

  // Sidebar user card → go to profile
  const uc = e.target.closest('#sidebarUserCard');
  if (uc) {
    e.preventDefault();
    navigate('/profile');
  }
});

// App bootstrap: theme, auth check, first route
window.addEventListener("DOMContentLoaded", () => {
  // Inject global theme once
  if(!document.querySelector('link[data-global-theme]')){
    const t=document.createElement('link');
    t.rel='stylesheet';
    t.href='/src/css/theme.css';
    t.setAttribute('data-global-theme','1');
    document.head.appendChild(t);
  }
  document.body.classList.add('theme-dark');

  // If token is invalid, drop Auth flag
  if (localStorage.getItem("Auth") === "true" && !hasValidToken()) {
    localStorage.setItem("Auth", "false");
  }

  // First navigation: keep current route if valid, else choose based on auth
  const path = window.location.pathname;
  if (routes[path]) navigate(path);
  else {
    if (!isAuth() || !hasValidToken()) navigate("/login"); else navigate("/dashboard");
  }
});

// Recompute top nav on resize (mobile/desktop switch)
window.addEventListener("resize", () => setupNavigation(window.location.pathname));
