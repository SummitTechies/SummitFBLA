const VALID_USER = 'SHSFBLAcontrol';
const VALID_PASS = 'Adminoverride471';
const AUTH_KEY = 'summitFblaAuth';
const POSTS_KEY = 'summitFblaPosts';

function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

function getPosts() {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleString();
}

function initSidebar() {
  const authLinks = document.querySelectorAll('[data-auth-required="true"]');
  authLinks.forEach((el) => {
    el.classList.toggle('hidden', !isLoggedIn());
  });

  const guestOnly = document.querySelectorAll('[data-guest-only="true"]');
  guestOnly.forEach((el) => {
    el.classList.toggle('hidden', isLoggedIn());
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.classList.toggle('hidden', !isLoggedIn());
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(AUTH_KEY);
      window.location.href = 'login.html';
    });
  }

  const page = document.body.dataset.page;
  if (page) {
    const current = document.querySelector(`[data-link="${page}"]`);
    if (current) current.classList.add('active');
  }
}

function protectPage() {
  if (document.body.dataset.requiresAuth === 'true' && !isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const msg = document.getElementById('loginMessage');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username === VALID_USER && password === VALID_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      msg.textContent = 'Login successful! Redirecting...';
      msg.className = 'message';
      setTimeout(() => (window.location.href = 'feed.html'), 700);
      return;
    }

    msg.textContent = 'Invalid username or password.';
    msg.className = 'message error';
  });
}

function renderPosts(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const posts = getPosts();
  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-state">No updates yet. Check back soon!</p>';
    return;
  }

  container.innerHTML = posts
    .map(
      (post) => `
      <article class="post">
        <div class="meta">Posted ${formatDate(post.createdAt)}</div>
        <div>${post.content.replace(/</g, '&lt;')}</div>
        ${post.image ? `<img src="${post.image}" alt="FBLA update image" />` : ''}
      </article>
    `
    )
    .join('');
}

function initControlFeed() {
  const form = document.getElementById('postForm');
  if (!form) return;

  const msg = document.getElementById('postMessage');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = document.getElementById('postContent').value.trim();
    const imageInput = document.getElementById('postImage');

    if (!content) {
      msg.textContent = 'Please enter an announcement message.';
      msg.className = 'message error';
      return;
    }

    const file = imageInput.files[0];
    const createPost = (imageData = '') => {
      const posts = getPosts();
      posts.unshift({
        content,
        image: imageData,
        createdAt: new Date().toISOString()
      });
      savePosts(posts);
      form.reset();
      msg.textContent = 'Post submitted! It is now visible in Feed.';
      msg.className = 'message';
      renderPosts('controlPostsPreview');
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => createPost(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      createPost();
    }
  });

  renderPosts('controlPostsPreview');
}

document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  initSidebar();
  initLogin();
  initControlFeed();
  renderPosts('feedPosts');
});
