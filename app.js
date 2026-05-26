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
  initPosPage();
  initCheckoutPage();
});


const POS_ITEMS_KEY = 'summitFblaPosItems';
const POS_CART_KEY = 'summitFblaPosCart';
const POS_TAX_RATE_KEY = 'summitFblaPosTaxRate';

function getStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getPosItems() {
  const items = getStoredJson(POS_ITEMS_KEY, []);
  return Array.isArray(items) ? items : [];
}

function savePosItems(items) {
  localStorage.setItem(POS_ITEMS_KEY, JSON.stringify(items));
}

function getCart() {
  const cart = getStoredJson(POS_CART_KEY, []);
  return Array.isArray(cart) ? cart : [];
}

function saveCart(cart) {
  localStorage.setItem(POS_CART_KEY, JSON.stringify(cart));
}

function getTaxRate() {
  const stored = Number(localStorage.getItem(POS_TAX_RATE_KEY));
  return Number.isFinite(stored) && stored >= 0 ? stored : 0;
}

function money(value) {
  return `$${value.toFixed(2)}`;
}

function renderItemButtons() {
  const container = document.getElementById('itemButtons');
  if (!container) return;

  const items = getPosItems();
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">No items yet. Add your first item above.</p>';
    return;
  }

  container.innerHTML = items
    .map((item) => `<button type="button" class="item-btn" data-item-id="${item.id}">${item.name}<span>${money(item.price)}</span></button>`)
    .join('');

  container.querySelectorAll('.item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((i) => i.id === btn.dataset.itemId);
      if (!item) return;
      const cart = getCart();
      cart.push({ id: item.id, name: item.name, price: item.price });
      saveCart(cart);
      renderTicket();
    });
  });
}

function renderTicket() {
  const list = document.getElementById('ticketItems');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');
  if (!list || !subtotalEl || !taxEl || !totalEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    list.innerHTML = '<p class="empty-state">No items on this ticket yet.</p>';
  } else {
    list.innerHTML = cart.map((item, idx) => `<div class="ticket-row"><span>${idx + 1}. ${item.name}</span><strong>${money(item.price)}</strong></div>`).join('');
  }

  const taxRate = getTaxRate();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  subtotalEl.textContent = money(subtotal);
  taxEl.textContent = money(tax);
  taxEl.parentElement.querySelector('span').textContent = `Tax (${(taxRate * 100).toFixed(2)}%)`;
  totalEl.textContent = money(total);
}

function initPosPage() {
  const itemForm = document.getElementById('itemForm');
  if (!itemForm) return;

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('itemName');
    const priceInput = document.getElementById('itemPrice');
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name || !Number.isFinite(price) || price < 0) return;

    const items = getPosItems();
    items.push({ id: crypto.randomUUID(), name, price });
    savePosItems(items);
    itemForm.reset();
    renderItemButtons();
  });

  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      saveCart([]);
      renderTicket();
    });
  }

  renderItemButtons();
  renderTicket();
}

function initCheckoutPage() {
  const totalEl = document.getElementById('checkoutTotal');
  if (!totalEl) return;

  const cart = getCart();
  const taxRate = getTaxRate();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const total = subtotal + subtotal * taxRate;
  totalEl.textContent = money(total);

  const cashBtn = document.getElementById('cashCalcBtn');
  const cashInput = document.getElementById('cashGiven');
  const result = document.getElementById('cashResult');

  cashBtn?.addEventListener('click', () => {
    const given = Number(cashInput.value);
    if (!Number.isFinite(given) || given < 0) {
      result.textContent = 'Enter a valid cash amount.';
      result.className = 'message error';
      return;
    }

    const diff = given - total;
    if (diff < 0) {
      result.textContent = `Customer still owes ${money(Math.abs(diff))}.`;
      result.className = 'message error';
    } else if (diff === 0) {
      result.textContent = 'Exact cash received. No change needed.';
      result.className = 'message';
    } else {
      result.textContent = `Give back ${money(diff)} from the register.`;
      result.className = 'message';
    }
  });
}
