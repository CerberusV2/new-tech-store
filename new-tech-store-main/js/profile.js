import { api } from './api.js';
import { categories } from './data.js';
import { showToast } from './toast.js';
import { validateForm, validateRequired, validatePhone } from './validation.js';
import { initScrollAnimations } from './animations.js';

let currentUser = null;
let currentRole = 'user';
let userOrders = [];
let userFavIds = [];
let allProducts = [];

async function initProfile() {
    const { data } = await api.getSession();
    currentUser = data?.session?.user || JSON.parse(localStorage.getItem('cached_user'));

    const notLoggedEl = document.getElementById('profile-not-logged');
    const contentEl = document.getElementById('profile-content');

    if (!currentUser) {
        if (notLoggedEl) notLoggedEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        return;
    }

    if (notLoggedEl) notLoggedEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    // Загружаем данные параллельно
    const [role, orders, favIds, products] = await Promise.all([
        api.getUserRole(),
        api.getUserOrders(),
        api.getFavorites(),
        api.getProducts('all')
    ]);

    currentRole = role || localStorage.getItem('cached_role') || 'user';
    userOrders = orders || [];
    userFavIds = favIds || [];
    allProducts = products || [];

    renderProfileHeader();
    setupLogout();

    // Для администратора скрываем весь покупательский личный кабинет и оставляем только переход в Панель админа
    if (currentRole === 'admin') {
        const statsEl = document.querySelector('.profile-stats');
        const tabsEl = document.querySelector('.profile-tabs');
        const tabContents = document.querySelectorAll('.profile-tab-content');
        if (statsEl) statsEl.style.display = 'none';
        if (tabsEl) tabsEl.style.display = 'none';
        tabContents.forEach(el => el.style.display = 'none');
        return;
    }

    renderStats();
    fillProfileForm();
    renderOrdersTab();
    renderFavoritesTab();
    setupTabs();
    setupFormHandler();
}

function renderProfileHeader() {
    const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();

    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = currentUser.email;

    const createdDate = currentUser.created_at
        ? new Date(currentUser.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'недавно';
    document.getElementById('profile-since').textContent = `Дата регистрации: ${createdDate}`;

    const roleBadge = document.getElementById('profile-role-badge');
    if (currentRole === 'admin') {
        roleBadge.textContent = 'Администратор';
        roleBadge.className = 'role-badge role-admin';
        const adminLink = document.getElementById('admin-panel-link');
        if (adminLink) adminLink.style.display = 'inline-flex';
    } else {
        roleBadge.textContent = 'Покупатель';
        roleBadge.className = 'role-badge role-user';
    }
}

function renderStats() {
    document.getElementById('stat-orders-count').textContent = userOrders.length;
    document.getElementById('stat-favorites-count').textContent = userFavIds.length;

    const totalSpent = userOrders
        .filter(o => o.status !== 'отменен')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

    document.getElementById('stat-total-spent').textContent = `${totalSpent.toFixed(0)} сом`;
}

function fillProfileForm() {
    const savedProfile = JSON.parse(localStorage.getItem(`profile_extra_${currentUser.id}`)) || {};
    const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.username || currentUser.email.split('@')[0];

    document.getElementById('prof-username').value = savedProfile.username || name;
    document.getElementById('prof-email').value = currentUser.email;
    document.getElementById('prof-phone').value = currentUser.user_metadata?.phone || savedProfile.phone || '';
    document.getElementById('prof-address').value = currentUser.user_metadata?.address || savedProfile.address || '';
}

function setupFormHandler() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('prof-username');
        const phoneInput = document.getElementById('prof-phone');
        const addressInput = document.getElementById('prof-address');

        const rules = [
            {
                input: usernameInput,
                validators: [(val) => validateRequired(val, 'Имя пользователя')]
            }
        ];

        if (phoneInput.value.trim() !== '') {
            rules.push({
                input: phoneInput,
                validators: [(val) => validatePhone(val)]
            });
        }

        const { valid } = validateForm(rules);
        if (!valid) {
            showToast('Проверьте правильность заполнения полей', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        const updatedData = {
            username: usernameInput.value.trim(),
            full_name: usernameInput.value.trim(),
            phone: phoneInput.value.trim(),
            address: addressInput.value.trim()
        };

        // Сохраняем локально и в Supabase
        localStorage.setItem(`profile_extra_${currentUser.id}`, JSON.stringify(updatedData));
        const { user, error } = await api.updateProfile(updatedData);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить изменения';

        if (error) {
            showToast('Профиль сохранен локально', 'info');
        } else {
            if (user) currentUser = user;
            showToast('Профиль успешно обновлен!', 'success');
        }

        renderProfileHeader();
    });
}

function renderOrdersTab() {
    const container = document.getElementById('profile-orders-list');
    if (!container) return;

    if (userOrders.length === 0) {
        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3>У вас пока нет заказов</h3>
                <p style="color: var(--text-secondary); margin: 0.5rem 0 1.5rem;">Выберите комплектующие в каталоге и оформите свой первый заказ!</p>
                <a href="catalog.html" class="btn btn-primary">Перейти в каталог</a>
            </div>
        `;
        return;
    }

    container.innerHTML = userOrders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const itemsHtml = (order.items || []).map(item => `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                <span>${item.name} × ${item.quantity}</span>
                <span style="font-weight: 600;">${(item.price * item.quantity).toFixed(0)} сом</span>
            </div>
        `).join('');

        const statusClass = (order.status || 'в обработке').replace(/ /g, '-');

        return `
            <div class="glass-panel profile-order-card scroll-animate">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.25rem;">Заказ #${String(order.id).slice(0, 8)}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">${date}</p>
                    </div>
                    <span class="status-badge status-${statusClass}">${order.status}</span>
                </div>
                <div style="margin-bottom: 1rem;">
                    ${itemsHtml}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        📍 ${order.address_info?.address || 'Адрес не указан'}
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-primary);">
                        ${order.total} сом
                    </div>
                </div>
            </div>
        `;
    }).join('');

    initScrollAnimations();
}

function renderFavoritesTab() {
    const grid = document.getElementById('profile-favorites-grid');
    if (!grid) return;

    const favProducts = allProducts.filter(p => userFavIds.includes(p.id));

    if (favProducts.length === 0) {
        grid.style.display = 'block';
        grid.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3>Список избранного пуст</h3>
                <p style="color: var(--text-secondary); margin: 0.5rem 0 1.5rem;">Нажимайте на сердечко ❤️ на карточках товаров, чтобы сохранять их сюда.</p>
                <a href="catalog.html" class="btn btn-primary">Смотреть каталог</a>
            </div>
        `;
        return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = favProducts.map(product => {
        const catName = categories.find(c => c.id === product.category)?.name || product.category;
        const hasDiscount = product.oldPrice && product.discountPercent > 0;
        return `
            <div class="product-card scroll-animate">
                <div class="product-image-container" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">
                    ${hasDiscount ? `<span class="discount-badge">-${product.discountPercent}% СКИДКА</span>` : ''}
                    <button class="fav-btn active" onclick="event.stopPropagation(); window.removeFavFromProfile('${product.id}')">❤️</button>
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
                        <button class="btn btn-primary btn-sm" onclick="window.addToCart('${product.id}')">В корзину</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    initScrollAnimations();
}

window.removeFavFromProfile = async (productId) => {
    await api.removeFavorite(productId);
    userFavIds = userFavIds.filter(id => id !== productId);
    renderStats();
    renderFavoritesTab();
    showToast('Товар удален из избранного', 'info');
};

function setupTabs() {
    const buttons = document.querySelectorAll('.profile-tab-btn');
    const contents = document.querySelectorAll('.profile-tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            buttons.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const activeContent = document.getElementById(`tab-${tab}`);
            if (activeContent) activeContent.classList.add('active');
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        await api.signOut();
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_role');
        showToast('Вы вышли из аккаунта', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

initProfile();
