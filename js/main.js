import { api } from './api.js';
import { initialProducts, categories } from './data.js';

// State
let appState = {
    products: [],
    cart: JSON.parse(localStorage.getItem('tech_store_cart')) || [],
    currentCategory: 'all',
    user: null,
    favorites: [],
    // Catalog Filter State
    originalProducts: [],
    filters: {
        category: 'all',
        search: '',
        minPrice: 0,
        maxPrice: 500000,
        sort: 'recommended'
    }
};

// DOM Elements
const elements = {
    productsGrid: document.getElementById('products-grid'),
    cartCount: document.getElementById('cart-count'),
    categoryList: document.getElementById('category-list'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartTotal: document.getElementById('cart-total'),
    authContainer: document.querySelector('.header .flex.items-center.gap-4')
};

// --- Initialization ---

async function init() {
    await checkAuth();
    updateCartCount();

    if (elements.productsGrid) {
        await initCatalog();
    }

    if (elements.cartItemsContainer) {
        renderCartPage();
    }

    if (elements.categoryList) {
        renderCategories();
    }

    const favoritesGrid = document.getElementById('favorites-grid');
    if (favoritesGrid) {
        await initFavorites(favoritesGrid);
    }

    setupMobileMenu();
}

function setupMobileMenu() {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;

    // Create Hamburger Button
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰';
    // CSS handles visibility

    // Insert before logo or at start
    headerInner.insertBefore(btn, headerInner.firstChild);

    // Create Mobile Menu Container
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.innerHTML = `
        <a href="index.html">Главная</a>
        <a href="catalog.html">Каталог</a>
        <a href="builds.html">Сборки</a>
        <a href="cart.html">Корзина</a>
        <div id="mobile-auth-links">
            <a href="auth.html">Войти</a>
        </div>
    `;

    // Insert after header inner (or append to body/header)
    document.querySelector('.header').appendChild(menu);

    // Toggle Logic
    btn.addEventListener('click', () => {
        const isActive = menu.classList.toggle('active');
        btn.innerHTML = isActive ? '✕' : '☰';
        document.body.style.overflow = isActive ? 'hidden' : ''; // Prevent scroll
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('active');
            btn.innerHTML = '☰';
            document.body.style.overflow = '';
        });
    });
}

async function checkAuth() {
    console.log("checkAuth started");

    // 1. Try to recover from cache first for immediate UI feedback
    const cachedUser = JSON.parse(localStorage.getItem('cached_user'));
    const cachedRole = localStorage.getItem('cached_role');

    if (cachedUser && cachedRole) {
        console.log("Restoring from cache");
        appState.user = cachedUser;
        appState.userRole = cachedRole;
        updateAuthUI(cachedUser);
        // Also update mobile menu if it exists
        updateMobileAuthUI(cachedUser, cachedRole);
    }

    // 2. Verify with API (optimistic UI)
    const { data } = await api.getSession();
    console.log("Session data:", data);
    appState.user = data.session?.user || null;

    if (appState.user) {
        console.log("User found:", appState.user.email);

        // Cache basic user info
        localStorage.setItem('cached_user', JSON.stringify(appState.user));

        // If caching mismatch or not present, fetch fresh role
        // For admin security, we always re-check role eventually, but show cached one first
        const freshRole = await api.getUserRole();
        appState.userRole = freshRole;
        localStorage.setItem('cached_role', freshRole);

        appState.favorites = await api.getFavorites();

        updateAuthUI(appState.user);
        updateMobileAuthUI(appState.user, freshRole);
    } else {
        console.log("No active session");
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_role');

        // Clear UI if we were optimistically logged in but session is dead
        if (cachedUser) {
            window.location.reload(); // Simplest way to reset state
        }
    }
}

function updateMobileAuthUI(user, role) {
    const mobileAuth = document.getElementById('mobile-auth-links');
    if (!mobileAuth) return;

    const name = user.user_metadata?.full_name || user.email.split('@')[0];

    if (role === 'admin') {
        mobileAuth.innerHTML = `
            <div style="padding: 10px; color: var(--accent-primary); font-weight: bold;">👤 ${name} (Admin)</div>
            <a href="orders.html">✅ Управление заказами</a>
            <a href="#" onclick="window.signOut()">🚪 Выйти</a>
         `;
    } else {
        mobileAuth.innerHTML = `
            <div style="padding: 10px; color: var(--accent-primary); font-weight: bold;">👤 ${name}</div>
            <a href="favorites.html">❤️ Избранное</a>
            <a href="my-orders.html">📦 Мои заказы</a>
            <a href="#" onclick="window.signOut()">🚪 Выйти</a>
         `;
    }
}

async function updateAuthUI(user) {
    if (!elements.authContainer) {
        console.error("Auth container not found for selector: .header .flex.items-center.gap-4");
        return;
    }

    console.log("Updating Auth UI for user", user.email);
    const name = user.user_metadata?.full_name || user.user_metadata?.username || user.email.split('@')[0];

    // Получаем роль пользователя
    const userRole = await api.getUserRole();
    console.log("User role:", userRole);

    // Find auth link (usually first child or by text)
    // We replace "Войти" link with User Menu
    const authLinks = elements.authContainer.querySelectorAll('a');
    const loginLink = Array.from(authLinks).find(c => c.textContent.includes('Войти'));

    if (loginLink) {
        let menuHtml = '';

        if (userRole === 'admin') {
            // Для admin: меню без "Мои заказы" и без "Избранное"
            menuHtml = `
                <div class="user-menu">
                    <button class="user-btn">
                        <span>👤</span> <span class="user-name">${name}</span>
                    </button>
                    <div class="user-dropdown">
                        <a href="#" class="dropdown-item" onclick="window.signOut()">🚪 Выйти</a>
                    </div>
                </div>
            `;
        } else {
            // Для обычного user: меню с "Мои заказы"
            menuHtml = `
                <div class="user-menu">
                    <button class="user-btn">
                        <span>👤</span> <span class="user-name">${name}</span>
                    </button>
                    <div class="user-dropdown">
                        <a href="favorites.html" class="dropdown-item">❤️ Избранное</a>
                        <a href="my-orders.html" class="dropdown-item">📦 Мои заказы</a>
                        <a href="#" class="dropdown-item" onclick="window.signOut()">🚪 Выйти</a>
                    </div>
                </div>
            `;
        }

        loginLink.outerHTML = menuHtml;
    }

    // Заменяем корзину на "Заказы" для admin
    const cartBtn = elements.authContainer.querySelector('.cart-btn');
    if (cartBtn && userRole === 'admin') {
        cartBtn.href = 'orders.html';
        cartBtn.innerHTML = `📋`;
        cartBtn.title = 'Управление заказами';
    }
}

window.signOut = async () => {
    await api.signOut();
    localStorage.removeItem('cached_user');
    localStorage.removeItem('cached_role');
    localStorage.removeItem('tech_store_cart'); // Optional: clear cart on logout
    window.location.reload();
};

// --- Catalog Logic ---

async function initCatalog() {
    try {
        const products = await api.getProducts();
        console.log('Загружено товаров:', products.length);
        console.log('Первый товар:', products[0]);
        appState.products = products;
        appState.originalProducts = [...products]; // Store copy

        setupCatalogFilters();
        applyFilters();
    } catch (e) {
        console.error("Error loading products:", e);
        elements.productsGrid.innerHTML = '<p class="text-center">Не удалось загрузить товары.</p>';
    }
}

function setupCatalogFilters() {
    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.filters.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.filters.sort = e.target.value;
            applyFilters();
        });
    }

    // Double Range Slider
    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    const minDisplay = document.getElementById('price-min-display');
    const maxDisplay = document.getElementById('price-max-display');
    const track = document.getElementById('slider-track');

    // Category buttons - добавляем обработчики событий
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            if (category) {
                window.filterCategory(category);
            }
        });
    });

    if (minInput && maxInput) {
        const updateSlider = () => {
            let minVal = parseInt(minInput.value);
            let maxVal = parseInt(maxInput.value);

            // Prevent crossing
            if (minVal > maxVal - 100) {
                if (document.activeElement === minInput) minInput.value = maxVal - 100;
                else maxInput.value = minVal + 100;
            }

            minVal = parseInt(minInput.value);
            maxVal = parseInt(maxInput.value);

            appState.filters.minPrice = minVal;
            appState.filters.maxPrice = maxVal;

            minDisplay.textContent = `${minVal} сом`;
            maxDisplay.textContent = `${maxVal} сом`;

            // Update track visual
            const percent1 = (minVal / minInput.max) * 100;
            const percent2 = (maxVal / maxInput.max) * 100;
            track.style.background = `linear-gradient(to right, rgba(255,255,255,0.1) ${percent1}%, var(--accent-primary) ${percent1}%, var(--accent-primary) ${percent2}%, rgba(255,255,255,0.1) ${percent2}%)`;

            applyFilters();
        };

        minInput.addEventListener('input', updateSlider);
        maxInput.addEventListener('input', updateSlider);
        // Init track
        updateSlider();
    }
}

function applyFilters() {
    let result = [...appState.originalProducts];

    console.log('Фильтры:', appState.filters);
    console.log('Всего товаров:', result.length);

    // 1. Category
    if (appState.filters.category !== 'all') {
        result = result.filter(p => p.category === appState.filters.category);
        console.log(`После фильтра категории "${appState.filters.category}":`, result.length);
    }

    // 2. Price
    result = result.filter(p => p.price >= appState.filters.minPrice && p.price <= appState.filters.maxPrice);

    // 3. Search
    if (appState.filters.search) {
        result = result.filter(p => p.name.toLowerCase().includes(appState.filters.search));
    }

    // 4. Sort
    if (appState.filters.sort === 'price-asc') {
        result.sort((a, b) => a.price - b.price);
    } else if (appState.filters.sort === 'price-desc') {
        result.sort((a, b) => b.price - a.price);
    }
    // recommended = default order (as is)

    appState.products = result;
    renderProducts(result);
    updateProductCount(result.length);
}

function updateProductCount(count) {
    const countEl = document.getElementById('product-count');
    if (countEl) {
        countEl.textContent = `${count} ${getNoun(count, 'товар', 'товара', 'товаров')}`;
    }
}

// Helper for pluralization
function getNoun(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

function renderProducts(products) {
    if (!elements.productsGrid) return;

    elements.productsGrid.innerHTML = products.map(product => {
        const isFav = appState.favorites.includes(product.id);
        const isAdmin = appState.userRole === 'admin';

        return `
        <div class="product-card">
            <div class="product-image-container">
                ${!isAdmin ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${product.id}')">
                    ${isFav ? '❤️' : '♡'}
                </button>` : ''}
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-category">${categories.find(c => c.id === product.category)?.name || product.category}</div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">${product.price} сом</div>
                    <button class="btn btn-primary btn-sm" onclick="window.addToCart('${product.id}')">В корзину</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function renderCategories() {
    if (!elements.categoryList) return;
    elements.categoryList.innerHTML = categories.map(cat => `
        <li>
            <button class="category-btn ${cat.id === appState.currentCategory ? 'active' : ''}" 
                    data-category="${cat.id}"
                    onclick="window.filterCategory('${cat.id}')">
                ${cat.name}
            </button>
        </li>
    `).join('');
}

window.filterCategory = async (categoryId) => {
    appState.filters.category = categoryId;
    appState.currentCategory = categoryId;

    // Update active button UI
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        if (btnCategory === categoryId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    applyFilters();
};

window.toggleFavorite = async (id) => {
    if (!appState.user) {
        alert("Войдите в аккаунт, чтобы добавлять в избранное");
        return;
    }

    if (appState.favorites.includes(id)) {
        await api.removeFavorite(id);
        appState.favorites = appState.favorites.filter(fid => fid !== id);
    } else {
        await api.addFavorite(id);
        appState.favorites.push(id);
    }
    // Re-render to update icon
    // Re-render to update icon
    if (elements.productsGrid) {
        renderProducts(appState.products);
    }

    // If on favorites page, re-render that too
    const favoritesGrid = document.getElementById('favorites-grid');
    if (favoritesGrid) {
        renderFavoritesPage(favoritesGrid);
    }
};

// --- Favorites Page Logic ---

async function initFavorites(gridElement) {
    try {
        if (appState.products.length === 0) {
            appState.products = await api.getProducts();
        }
        renderFavoritesPage(gridElement);
    } catch (e) {
        console.error("Error loading favorites:", e);
        gridElement.innerHTML = '<p class="text-center">Не удалось загрузить избранное.</p>';
    }
}

function renderFavoritesPage(gridElement) {
    if (!appState.user) {
        gridElement.innerHTML = '<p class="text-center">Пожалуйста, войдите, чтобы видеть избранное.</p>';
        return;
    }

    const favProducts = appState.products.filter(p => appState.favorites.includes(p.id));
    const emptyMsg = document.getElementById('empty-favorites-msg');

    if (favProducts.length === 0) {
        gridElement.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    gridElement.style.display = 'grid';

    gridElement.innerHTML = favProducts.map(product => {
        return `
        <div class="product-card">
            <div class="product-image-container">
                <button class="fav-btn active" onclick="window.toggleFavorite('${product.id}')">
                    ❤️
                </button>
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-category">${categories.find(c => c.id === product.category)?.name || product.category}</div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">${product.price} сом</div>
                    <button class="btn btn-primary btn-sm" onclick="window.addToCart('${product.id}')">В корзину</button>
                </div>
            </div>
        </div>
    `}).join('');
}

// --- Cart Logic ---

window.addToCart = async (productId) => {
    const product = await api.getProductById(productId);
    if (!product) return;
    const existingItem = appState.cart.find(item => item.id === productId);
    if (existingItem) existingItem.quantity += 1;
    else appState.cart.push({ ...product, quantity: 1 });
    saveCart();
    updateCartCount();
    alert(`Товар ${product.name} добавлен в корзину`);
};

window.removeFromCart = (productId) => {
    appState.cart = appState.cart.filter(item => item.id !== productId);
    saveCart();
    renderCartPage();
    updateCartCount();
};

window.updateQuantity = (productId, change) => {
    const item = appState.cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            window.removeFromCart(productId);
            return;
        }
    }
    saveCart();
    renderCartPage();
    updateCartCount();
};

window.proceedToCheckout = () => {
    if (appState.cart.length === 0) {
        alert("Ваша корзина пуста!");
        return;
    }

    if (!appState.user) {
        if (confirm("Для оформления заказа необходимо войти. Перейти на страницу входа?")) {
            window.location.href = 'auth.html';
        }
        return;
    }
    window.location.href = 'checkout.html';
};

function saveCart() {
    localStorage.setItem('tech_store_cart', JSON.stringify(appState.cart));
}

function updateCartCount() {
    if (elements.cartCount) {
        const count = appState.cart.reduce((sum, item) => sum + item.quantity, 0);
        elements.cartCount.innerText = count;
    }
}

function renderCartPage() {
    if (!elements.cartItemsContainer) return;
    if (appState.cart.length === 0) {
        elements.cartItemsContainer.innerHTML = '<p>Ваша корзина пуста.</p>';
        updateCartTotals();
        return;
    }
    elements.cartItemsContainer.innerHTML = appState.cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/100'">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p style="color: var(--text-secondary);">${categories.find(c => c.id === item.category)?.name || item.category}</p>
            </div>
            <div class="quantity-controls">
                <button class="qty-btn" onclick="window.updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="window.updateQuantity('${item.id}', 1)">+</button>
            </div>
            <div style="margin-left: 2rem; font-weight: bold; color: var(--accent-primary);">
                ${(item.price * item.quantity).toFixed(2)} сом
            </div>
            <button class="btn btn-sm btn-outline" style="margin-left: 1rem; border: none;" onclick="window.removeFromCart('${item.id}')">✕</button>
        </div>
    `).join('');
    updateCartTotals();
}

function updateCartTotals() {
    if (!elements.cartSubtotal || !elements.cartTotal) return;
    const total = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    elements.cartSubtotal.innerText = `${total.toFixed(2)} сом`;
    elements.cartTotal.innerText = `${total.toFixed(2)} сом`;

    // Update Checkout Button
    const checkoutBtn = document.querySelector('.cart-summary .btn-primary');
    if (checkoutBtn) {
        checkoutBtn.onclick = window.proceedToCheckout;
    }
}

// Start
init();
