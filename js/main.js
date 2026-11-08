import { api } from './api.js';
import { initialProducts, categories } from './data.js';
import { showToast } from './toast.js';
import { showSkeletons, initScrollAnimations } from './animations.js';
import { initSlider } from './slider.js';

// State
let appState = {
    products: [],
    cart: JSON.parse(localStorage.getItem('tech_store_cart')) || [],
    currentCategory: 'all',
    user: null,
    userRole: 'user',
    favorites: [],
    // Catalog Filter & Pagination State
    originalProducts: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 8,
        visibleCount: 8
    },
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
    paginationContainer: document.getElementById('pagination-container'),
    cartCount: document.getElementById('cart-count'),
    categoryList: document.getElementById('category-list'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartTotal: document.getElementById('cart-total'),
    authContainer: document.querySelector('.header .flex.items-center.gap-4')
};

// --- Initialization ---

async function init() {
    setupMobileMenu();
    updateCartCount();

    // Инициализируем слайдер, если мы на главной странице
    if (document.getElementById('promo-slider-container')) {
        initSlider('promo-slider-container');
    }

    initScrollAnimations();

    await checkAuth();

    if (elements.categoryList) {
        renderCategories();
    }

    if (elements.productsGrid) {
        await initCatalog();
    }

    if (elements.cartItemsContainer) {
        renderCartPage();
    }

    const favoritesGrid = document.getElementById('favorites-grid');
    if (favoritesGrid) {
        await initFavorites(favoritesGrid);
    }
}

function setupMobileMenu() {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;

    if (headerInner.querySelector('.mobile-menu-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰';
    headerInner.insertBefore(btn, headerInner.firstChild);

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

    document.querySelector('.header').appendChild(menu);

    btn.addEventListener('click', () => {
        const isActive = menu.classList.toggle('active');
        btn.innerHTML = isActive ? '✕' : '☰';
        document.body.style.overflow = isActive ? 'hidden' : '';
    });

    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('active');
            btn.innerHTML = '☰';
            document.body.style.overflow = '';
        });
    });
}

async function checkAuth() {
    const cachedUser = JSON.parse(localStorage.getItem('cached_user'));
    const cachedRole = localStorage.getItem('cached_role');

    if (cachedUser && cachedRole) {
        appState.user = cachedUser;
        appState.userRole = cachedRole;
        updateAuthUI(cachedUser, cachedRole);
        updateMobileAuthUI(cachedUser, cachedRole);
    }

    const { data } = await api.getSession();
    appState.user = data.session?.user || null;

    if (appState.user) {
        localStorage.setItem('cached_user', JSON.stringify(appState.user));
        const freshRole = await api.getUserRole();
        appState.userRole = freshRole || 'user';
        localStorage.setItem('cached_role', appState.userRole);

        appState.favorites = await api.getFavorites();

        updateAuthUI(appState.user, appState.userRole);
        updateMobileAuthUI(appState.user, appState.userRole);
    } else {
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_role');
        appState.favorites = await api.getFavorites();

        if (cachedUser) {
            window.location.reload();
        }
    }
}

function updateMobileAuthUI(user, role) {
    const mobileAuth = document.getElementById('mobile-auth-links');
    if (!mobileAuth) return;

    const name = user.user_metadata?.full_name || user.email.split('@')[0];

    if (role === 'admin') {
        mobileAuth.innerHTML = `
            <div style="padding: 10px; color: var(--accent-primary); font-weight: bold;">🛠️ ${name} (Админ)</div>
            <a href="orders.html">📋 Панель администратора</a>
            <a href="#" onclick="window.signOut()">🚪 Выйти</a>
         `;
    } else {
        mobileAuth.innerHTML = `
            <div style="padding: 10px; color: var(--accent-primary); font-weight: bold;">👤 ${name}</div>
            <a href="profile.html">👤 Личный кабинет</a>
            <a href="favorites.html">❤️ Избранное</a>
            <a href="my-orders.html">📦 Мои заказы</a>
            <a href="#" onclick="window.signOut()">🚪 Выйти</a>
         `;
    }
}

function updateAuthUI(user, userRole) {
    if (!elements.authContainer) return;

    const name = user.user_metadata?.full_name || user.user_metadata?.username || user.email.split('@')[0];

    let menuHtml = '';
    if (userRole === 'admin') {
        menuHtml = `
            <div class="user-menu">
                <button class="user-btn">
                    <span>🛠️</span> <span class="user-name">${name}</span>
                </button>
                <div class="user-dropdown">
                    <a href="orders.html" class="dropdown-item">📋 Панель админа</a>
                    <a href="#" class="dropdown-item" onclick="window.signOut()">🚪 Выйти</a>
                </div>
            </div>
        `;
    } else {
        menuHtml = `
            <div class="user-menu">
                <button class="user-btn">
                    <span>👤</span> <span class="user-name">${name}</span>
                </button>
                <div class="user-dropdown">
                    <a href="profile.html" class="dropdown-item">👤 Личный кабинет</a>
                    <a href="favorites.html" class="dropdown-item">❤️ Избранное</a>
                    <a href="my-orders.html" class="dropdown-item">📦 Мои заказы</a>
                    <a href="#" class="dropdown-item" onclick="window.signOut()">🚪 Выйти</a>
                </div>
            </div>
        `;
    }

    const existingMenu = elements.authContainer.querySelector('.user-menu');
    const authLinks = elements.authContainer.querySelectorAll('a');
    const loginLink = Array.from(authLinks).find(c => c.textContent.includes('Войти'));

    if (existingMenu) {
        existingMenu.outerHTML = menuHtml;
    } else if (loginLink) {
        loginLink.outerHTML = menuHtml;
    }

    const cartBtn = elements.authContainer.querySelector('.cart-btn');
    if (cartBtn && userRole === 'admin') {
        cartBtn.href = 'orders.html';
        cartBtn.innerHTML = `📋`;
        cartBtn.title = 'Панель администратора';
    }

    // Скрываем кнопки покупки на странице сборок для администратора
    if (userRole === 'admin') {
        document.querySelectorAll('[onclick*="addPrebuiltToCart"], [onclick*="addCustomBuildToCart"]').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

window.signOut = async () => {
    await api.signOut();
    localStorage.removeItem('cached_user');
    localStorage.removeItem('cached_role');
    showToast('Вы вышли из аккаунта', 'info');
    setTimeout(() => {
        window.location.reload();
    }, 400);
};

// --- Catalog Logic ---

async function initCatalog() {
    try {
        // Показываем скелетоны на время загрузки
        showSkeletons(elements.productsGrid, 6);

        // Проверяем URL-параметр категории (например, ?category=gpu)
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryParam && categories.some(c => c.id === categoryParam)) {
            appState.filters.category = categoryParam;
            appState.currentCategory = categoryParam;
            renderCategories();
        }

        const products = await api.getProducts();
        appState.products = products;
        appState.originalProducts = [...products];

        setupCatalogFilters();
        applyFilters();
    } catch (e) {
        console.error("Error loading products:", e);
        elements.productsGrid.innerHTML = '<p class="text-center">Не удалось загрузить товары.</p>';
    }
}

function setupCatalogFilters() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.filters.search = e.target.value.toLowerCase();
            resetPagination();
            applyFilters();
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.filters.sort = e.target.value;
            resetPagination();
            applyFilters();
        });
    }

    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    const minDisplay = document.getElementById('price-min-display');
    const maxDisplay = document.getElementById('price-max-display');
    const track = document.getElementById('slider-track');

    if (minInput && maxInput) {
        const maxProductPrice = Math.max(...appState.originalProducts.map(p => Number(p.price) || 0), 5000);
        const roundedMax = Math.ceil(maxProductPrice / 1000) * 1000;
        minInput.max = roundedMax;
        maxInput.max = roundedMax;
        maxInput.value = roundedMax;
        appState.filters.maxPrice = roundedMax;

        const updateSlider = () => {
            let minVal = parseInt(minInput.value, 10);
            let maxVal = parseInt(maxInput.value, 10);

            if (minVal > maxVal - 50) {
                if (document.activeElement === minInput) minInput.value = Math.max(0, maxVal - 50);
                else maxInput.value = minVal + 50;
            }

            minVal = parseInt(minInput.value, 10);
            maxVal = parseInt(maxInput.value, 10);

            appState.filters.minPrice = minVal;
            appState.filters.maxPrice = maxVal;

            minDisplay.textContent = `${minVal} сом`;
            maxDisplay.textContent = `${maxVal} сом`;

            const percent1 = (minVal / minInput.max) * 100;
            const percent2 = (maxVal / maxInput.max) * 100;
            track.style.background = `linear-gradient(to right, rgba(255,255,255,0.1) ${percent1}%, var(--accent-primary) ${percent1}%, var(--accent-primary) ${percent2}%, rgba(255,255,255,0.1) ${percent2}%)`;

            resetPagination();
            applyFilters();
        };

        minInput.addEventListener('input', updateSlider);
        maxInput.addEventListener('input', updateSlider);
        updateSlider();
    }
}

function resetPagination() {
    appState.pagination.currentPage = 1;
    appState.pagination.visibleCount = appState.pagination.itemsPerPage;
}

function applyFilters() {
    let result = [...appState.originalProducts];

    if (appState.filters.category !== 'all') {
        result = result.filter(p => p.category === appState.filters.category);
    }

    result = result.filter(p => p.price >= appState.filters.minPrice && p.price <= appState.filters.maxPrice);

    if (appState.filters.search) {
        result = result.filter(p =>
            p.name.toLowerCase().includes(appState.filters.search) ||
            (p.description && p.description.toLowerCase().includes(appState.filters.search))
        );
    }

    if (appState.filters.sort === 'price-asc') {
        result.sort((a, b) => a.price - b.price);
    } else if (appState.filters.sort === 'price-desc') {
        result.sort((a, b) => b.price - a.price);
    }

    appState.products = result;

    // Обновляем заголовок категории
    const titleEl = document.getElementById('catalog-title');
    if (titleEl) {
        const catObj = categories.find(c => c.id === appState.filters.category);
        titleEl.textContent = appState.filters.category === 'all' ? 'Все Товары' : (catObj?.name || 'Товары');
    }

    renderPaginatedProducts();
    updateProductCount(result.length);
}

function renderPaginatedProducts() {
    const total = appState.products.length;
    const perPage = appState.pagination.itemsPerPage;
    const currentPage = appState.pagination.currentPage;

    const startIndex = (currentPage - 1) * perPage;
    const endIndex = Math.max(startIndex + perPage, appState.pagination.visibleCount);
    const visibleProducts = appState.products.slice(startIndex, endIndex);

    renderProducts(visibleProducts);
    renderPaginationControls(total, perPage, currentPage, endIndex);
}

function renderPaginationControls(total, perPage, currentPage, currentEndIndex) {
    if (!elements.paginationContainer) return;

    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) {
        elements.paginationContainer.innerHTML = '';
        return;
    }

    const hasMore = currentEndIndex < total;
    const loadMoreBtn = hasMore
        ? `<button class="btn btn-outline" onclick="window.loadMoreProducts()">Показать ещё (${Math.min(perPage, total - currentEndIndex)})</button>`
        : '';

    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToCatalogPage(${i})">
                ${i}
            </button>
        `;
    }

    elements.paginationContainer.innerHTML = `
        ${loadMoreBtn}
        <div class="pagination-controls">
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.goToCatalogPage(${currentPage - 1})">❮</button>
            ${pagesHtml}
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.goToCatalogPage(${currentPage + 1})">❯</button>
        </div>
    `;
}

window.loadMoreProducts = () => {
    appState.pagination.visibleCount += appState.pagination.itemsPerPage;
    renderPaginatedProducts();
};

window.goToCatalogPage = (page) => {
    const totalPages = Math.ceil(appState.products.length / appState.pagination.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    appState.pagination.currentPage = page;
    appState.pagination.visibleCount = page * appState.pagination.itemsPerPage;
    renderPaginatedProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateProductCount(count) {
    const countEl = document.getElementById('product-count');
    if (countEl) {
        countEl.textContent = `${count} ${getNoun(count, 'товар', 'товара', 'товаров')}`;
    }
}

function getNoun(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
}

function renderProducts(products) {
    if (!elements.productsGrid) return;

    if (products.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="glass-panel text-center" style="grid-column: 1/-1; padding: 3rem;">
                <h3>Ничего не найдено</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">Попробуйте изменить параметры поиска или фильтры цены.</p>
            </div>
        `;
        return;
    }

    elements.productsGrid.innerHTML = products.map(product => {
        const isFav = appState.favorites.includes(product.id);
        const isAdmin = appState.userRole === 'admin';
        const catName = categories.find(c => c.id === product.category)?.name || product.category;
        const hasDiscount = product.oldPrice && product.discountPercent > 0;

        return `
        <div class="product-card scroll-animate">
            <div class="product-image-container" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">
                ${hasDiscount ? `<span class="discount-badge">-${product.discountPercent}% СКИДКА</span>` : ''}
                ${!isAdmin ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavorite('${product.id}')" title="В избранное">
                    ${isFav ? '❤️' : '♡'}
                </button>` : ''}
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-category">${catName}</div>
                <h3 class="product-title" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price-block">
                        ${hasDiscount ? `<span class="old-price">${product.oldPrice} сом</span>` : ''}
                        <div class="product-price ${hasDiscount ? 'discounted' : ''}">${product.price} сом</div>
                    </div>
                    ${!isAdmin ? `<button class="btn btn-primary btn-sm" onclick="window.addToCart('${product.id}')">В корзину</button>` : ''}
                </div>
            </div>
        </div>
    `}).join('');

    initScrollAnimations();
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

window.filterCategory = (categoryId) => {
    appState.filters.category = categoryId;
    appState.currentCategory = categoryId;
    resetPagination();

    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        btn.classList.toggle('active', btnCategory === categoryId);
    });

    applyFilters();
};

window.toggleFavorite = async (id) => {
    if (appState.favorites.includes(id)) {
        await api.removeFavorite(id);
        appState.favorites = appState.favorites.filter(fid => fid !== id);
        showToast('Удалено из избранного', 'info');
    } else {
        await api.addFavorite(id);
        appState.favorites.push(id);
        showToast('Добавлено в избранное ❤️', 'success');
    }

    if (elements.productsGrid) {
        renderPaginatedProducts();
    }

    const favoritesGrid = document.getElementById('favorites-grid');
    if (favoritesGrid) {
        renderFavoritesPage(favoritesGrid);
    }
};

// --- Favorites Page Logic ---

async function initFavorites(gridElement) {
    try {
        showSkeletons(gridElement, 4);
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
        const catName = categories.find(c => c.id === product.category)?.name || product.category;
        const hasDiscount = product.oldPrice && product.discountPercent > 0;
        return `
        <div class="product-card scroll-animate">
            <div class="product-image-container" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">
                ${hasDiscount ? `<span class="discount-badge">-${product.discountPercent}% СКИДКА</span>` : ''}
                <button class="fav-btn active" onclick="event.stopPropagation(); window.toggleFavorite('${product.id}')">
                    ❤️
                </button>
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-category">${catName}</div>
                <h3 class="product-title" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price-block">
                        ${hasDiscount ? `<span class="old-price">${product.oldPrice} сом</span>` : ''}
                        <div class="product-price ${hasDiscount ? 'discounted' : ''}">${product.price} сом</div>
                    </div>
                    ${appState.userRole !== 'admin' ? `<button class="btn btn-primary btn-sm" onclick="window.addToCart('${product.id}')">В корзину</button>` : ''}
                </div>
            </div>
        </div>
    `}).join('');

    initScrollAnimations();
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
    showToast(`«${product.name}» добавлен в корзину`, 'success');
};

window.removeFromCart = (productId) => {
    appState.cart = appState.cart.filter(item => item.id !== productId);
    saveCart();
    renderCartPage();
    updateCartCount();
    showToast('Товар удален из корзины', 'info');
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
        showToast("Ваша корзина пуста!", "warning");
        return;
    }

    if (!appState.user) {
        showToast("Войдите в аккаунт для оформления заказа", "info");
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1000);
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
        elements.cartItemsContainer.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3>Ваша корзина пуста</h3>
                <p style="color: var(--text-secondary); margin: 0.5rem 0 1.5rem;">Добавьте комплектующие из каталога или соберите свой ПК!</p>
                <a href="catalog.html" class="btn btn-primary">Перейти в каталог</a>
            </div>
        `;
        updateCartTotals();
        return;
    }
    elements.cartItemsContainer.innerHTML = appState.cart.map(item => `
        <div class="cart-item scroll-animate">
            <img src="${item.image}" alt="${item.name}" style="cursor: pointer;" onclick="window.location.href='product.html?id=${item.id}'" onerror="this.src='https://placehold.co/100'">
            <div class="cart-item-info">
                <h3 style="cursor: pointer;" onclick="window.location.href='product.html?id=${item.id}'">${item.name}</h3>
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
    initScrollAnimations();
}

async function updateCartTotals() {
    if (!elements.cartSubtotal || !elements.cartTotal) return;
    const subtotal = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Проверяем активный промокод из Supabase / кеша
    const savedPromoCode = localStorage.getItem('tech_store_active_promo') || '';
    let promoDiscount = 0;
    let activePromoObj = null;

    if (savedPromoCode && subtotal > 0) {
        const res = await api.validatePromoCode(savedPromoCode, subtotal);
        if (res.valid) {
            promoDiscount = res.discountAmount;
            activePromoObj = res.promo;
        } else {
            localStorage.removeItem('tech_store_active_promo');
        }
    }

    const totalDiscount = Math.min(subtotal, promoDiscount);
    const finalTotal = Math.max(0, subtotal - totalDiscount);

    // Сохраняем расчет корзины для страницы оформления заказа
    localStorage.setItem('tech_store_cart_summary', JSON.stringify({
        subtotal: Number(subtotal.toFixed(2)),
        promoCode: activePromoObj ? activePromoObj.code : null,
        promoDiscount,
        totalDiscount: Number(totalDiscount.toFixed(2)),
        finalTotal: Number(finalTotal.toFixed(2))
    }));

    elements.cartSubtotal.innerText = `${subtotal.toFixed(2)} сом`;
    elements.cartTotal.innerText = `${finalTotal.toFixed(2)} сом`;

    // Строка скидки по промокоду и плашка активного промокода
    const promoRow = document.getElementById('cart-promo-discount-row');
    const promoLabel = document.getElementById('cart-promo-discount-label');
    const promoVal = document.getElementById('cart-promo-discount-val');
    const promoPill = document.getElementById('active-promo-pill');
    const promoPillLabel = document.getElementById('active-promo-label');
    const promoInput = document.getElementById('promo-code-input');

    if (activePromoObj && promoDiscount > 0) {
        if (promoRow) promoRow.style.display = 'flex';
        if (promoLabel) promoLabel.textContent = `Промокод (${activePromoObj.code})`;
        if (promoVal) promoVal.textContent = `-${promoDiscount.toFixed(2)} сом`;
        if (promoPill) promoPill.style.display = 'flex';
        if (promoPillLabel) promoPillLabel.textContent = `✅ ${activePromoObj.code}: ${activePromoObj.description}`;
        if (promoInput) promoInput.value = activePromoObj.code;
    } else {
        if (promoRow) promoRow.style.display = 'none';
        if (promoPill) promoPill.style.display = 'none';
    }

    const checkoutBtn = document.querySelector('.cart-summary .btn-primary');
    if (checkoutBtn) {
        checkoutBtn.onclick = window.proceedToCheckout;
    }
}

window.applyPromoCode = async () => {
    const input = document.getElementById('promo-code-input');
    if (!input) return;

    const subtotal = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal <= 0) {
        showToast('Сначала добавьте товары в корзину', 'warning');
        return;
    }

    const res = await api.validatePromoCode(input.value, subtotal);
    if (!res.valid) {
        showToast(res.message, 'error');
        return;
    }

    localStorage.setItem('tech_store_active_promo', res.promo.code);
    await updateCartTotals();
    showToast(res.message, 'success');
};

window.removePromoCode = async () => {
    localStorage.removeItem('tech_store_active_promo');
    const input = document.getElementById('promo-code-input');
    if (input) input.value = '';
    await updateCartTotals();
    showToast('Промокод удален', 'info');
};

init();
