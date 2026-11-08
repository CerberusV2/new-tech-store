import { api } from './api.js';
import { categories } from './data.js';
import { showToast } from './toast.js';
import { validateForm, validateRequired, validatePositiveNumber, clearFieldErrors } from './validation.js';

let allOrders = [];
let allProducts = [];
let currentOrderFilter = 'all';
let currentProductCategory = 'all';
let currentProductSearch = '';

async function initAdmin() {
    const role = await api.getUserRole();
    const cachedRole = localStorage.getItem('cached_role');

    if (role !== 'admin' && cachedRole !== 'admin') {
        const container = document.getElementById('orders-container');
        const adminCheck = document.getElementById('admin-check');
        if (container) container.style.display = 'none';
        if (adminCheck) adminCheck.style.display = 'block';
        return;
    }

    await Promise.all([
        loadOrders(),
        loadProducts(),
        renderPromos()
    ]);

    updateDashboardStats();
    setupAdminListeners();
}

function setupAdminListeners() {
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentOrderFilter = e.target.value;
            renderOrders();
        });
    }

    const prodSearch = document.getElementById('admin-product-search');
    if (prodSearch) {
        prodSearch.addEventListener('input', (e) => {
            currentProductSearch = e.target.value.toLowerCase();
            renderProducts();
        });
    }

    const prodCatFilter = document.getElementById('admin-category-filter');
    if (prodCatFilter) {
        prodCatFilter.addEventListener('change', (e) => {
            currentProductCategory = e.target.value;
            renderProducts();
        });
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleSaveProduct);
    }

    const promoForm = document.getElementById('admin-promo-form');
    if (promoForm) {
        promoForm.addEventListener('submit', handleAddPromo);
    }

    // Автоматический расчет бейджа скидки и старой/новой цены в модальном окне товара
    const priceInput = document.getElementById('prod-price');
    const oldPriceInput = document.getElementById('prod-old-price');
    const pctInput = document.getElementById('prod-discount-pct');

    const updateDiscountPreview = (source) => {
        if (!priceInput || !oldPriceInput || !pctInput) return;
        const preview = document.getElementById('prod-discount-preview');

        if (source === 'pct') {
            const pct = Number(pctInput.value);
            const currentPrice = Number(priceInput.value);
            const currentOld = Number(oldPriceInput.value);

            if (pct > 0 && pct < 100) {
                if (currentOld > 0) {
                    priceInput.value = Math.round(currentOld * (1 - pct / 100));
                } else if (currentPrice > 0) {
                    oldPriceInput.value = Math.round(currentPrice / (1 - pct / 100));
                }
            } else if (pct === 0) {
                oldPriceInput.value = '';
            }
        }

        const p = Number(priceInput.value);
        const oldP = Number(oldPriceInput.value);
        if (oldP > p && p > 0) {
            const calcPct = Math.round(((oldP - p) / oldP) * 100);
            if (source !== 'pct') pctInput.value = calcPct;
            if (preview) {
                preview.style.display = 'inline-block';
                preview.textContent = `-${calcPct}% СКИДКА`;
            }
        } else {
            if (source !== 'pct') pctInput.value = '';
            if (preview) preview.style.display = 'none';
        }
    };

    priceInput?.addEventListener('input', () => updateDiscountPreview('price'));
    oldPriceInput?.addEventListener('input', () => updateDiscountPreview('old'));
    pctInput?.addEventListener('input', () => updateDiscountPreview('pct'));
}

window.switchAdminTab = (tabName) => {
    const ordersTab = document.getElementById('admin-orders-tab');
    const productsTab = document.getElementById('admin-products-tab');
    const promosTab = document.getElementById('admin-promos-tab');
    const btnOrders = document.getElementById('tab-btn-orders');
    const btnProducts = document.getElementById('tab-btn-products');
    const btnPromos = document.getElementById('tab-btn-promos');

    if (ordersTab) ordersTab.style.display = tabName === 'orders' ? 'block' : 'none';
    if (productsTab) productsTab.style.display = tabName === 'products' ? 'block' : 'none';
    if (promosTab) promosTab.style.display = tabName === 'promos' ? 'block' : 'none';

    btnOrders?.classList.toggle('active', tabName === 'orders');
    btnProducts?.classList.toggle('active', tabName === 'products');
    btnPromos?.classList.toggle('active', tabName === 'promos');
};

function updateDashboardStats() {
    const totalOrdersEl = document.getElementById('admin-stat-total-orders');
    const pendingOrdersEl = document.getElementById('admin-stat-pending-orders');
    const productsCountEl = document.getElementById('admin-stat-products-count');
    const revenueEl = document.getElementById('admin-stat-revenue');
    const badgeEl = document.getElementById('orders-count');

    const pendingCount = allOrders.filter(o => o.status === 'в обработке').length;
    const revenue = allOrders
        .filter(o => o.status !== 'отменен')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

    if (totalOrdersEl) totalOrdersEl.textContent = allOrders.length;
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingCount;
    if (productsCountEl) productsCountEl.textContent = allProducts.length;
    if (revenueEl) revenueEl.textContent = `${revenue.toFixed(0)} сом`;
    if (badgeEl) badgeEl.textContent = pendingCount;
}

// ================= УПРАВЛЕНИЕ ЗАКАЗАМИ =================

async function loadOrders() {
    allOrders = await api.getAllOrders();
    renderOrders();
    updateDashboardStats();
}

function renderOrders() {
    const tbody = document.getElementById('orders-table');
    if (!tbody) return;

    let filtered = allOrders;
    if (currentOrderFilter !== 'all') {
        filtered = allOrders.filter(o => o.status === currentOrderFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Заказов не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU');
        const clientName = order.address_info?.name || 'Не указано';
        const statusClass = (order.status || 'в обработке').replace(/ /g, '-');

        return `
            <tr>
                <td data-label="№ Заказа">#${String(order.id).slice(0, 8)}</td>
                <td data-label="Дата">${date}</td>
                <td data-label="Клиент">${clientName}</td>
                <td data-label="Сумма" style="font-weight: 700; color: var(--accent-primary);">${order.total} сом</td>
                <td data-label="Статус">
                    <span class="status-badge status-${statusClass}">${order.status}</span>
                </td>
                <td data-label="Действия" style="text-align: right;">
                    <div class="flex gap-1" style="justify-content: flex-end; align-items: center;">
                        <select onchange="window.changeStatus('${order.id}', this.value)" class="admin-select" style="padding: 5px 10px; font-size: 0.85rem;">
                            <option value="">Изменить статус...</option>
                            <option value="в обработке" ${order.status === 'в обработке' ? 'selected' : ''}>В обработке</option>
                            <option value="отправлен" ${order.status === 'отправлен' ? 'selected' : ''}>Отправлен</option>
                            <option value="доставлен" ${order.status === 'доставлен' ? 'selected' : ''}>Доставлен</option>
                            <option value="отменен" ${order.status === 'отменен' ? 'selected' : ''}>Отменен</option>
                        </select>
                        <button onclick="window.viewOrderDetails('${order.id}')" class="btn btn-sm btn-outline">Детали</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.changeStatus = async (orderId, newStatus) => {
    if (!newStatus) return;

    const { error } = await api.updateOrderStatus(orderId, newStatus);
    if (error) {
        showToast('Ошибка при обновлении статуса: ' + error.message, 'error');
    } else {
        showToast(`Статус заказа изменен на «${newStatus}»`, 'success');
        await loadOrders();
    }
};

window.viewOrderDetails = (orderId) => {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const modal = document.getElementById('order-details-modal');
    const title = document.getElementById('order-modal-title');
    const body = document.getElementById('order-modal-body');

    const info = order.address_info || {};
    const itemsHtml = (order.items || []).map(item => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span>${item.name} × ${item.quantity}</span>
            <span style="font-weight: 600;">${(item.price * item.quantity).toFixed(0)} сом</span>
        </div>
    `).join('');

    title.textContent = `Заказ #${String(order.id).slice(0, 8)}`;
    body.innerHTML = `
        <div style="margin-bottom: 1.25rem;">
            <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;">Контактные данные клиента</h4>
            <p><strong>Имя:</strong> ${info.name || '—'}</p>
            <p><strong>Телефон:</strong> ${info.phone || '—'}</p>
            <p><strong>Email:</strong> ${info.email || '—'}</p>
            <p><strong>Адрес доставки:</strong> ${info.address || '—'}</p>
        </div>
        <div style="margin-bottom: 1.25rem;">
            <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;">Состав заказа</h4>
            ${itemsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 800;">
            <span>Итого к оплате:</span>
            <span style="color: var(--accent-primary);">${order.total} сом</span>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeOrderModal = () => {
    const modal = document.getElementById('order-details-modal');
    if (modal) modal.style.display = 'none';
};

// ================= УПРАВЛЕНИЕ ТОВАРАМИ =================

async function loadProducts() {
    allProducts = await api.getProducts('all');
    renderProducts();
    updateDashboardStats();
}

function getCategoryLabel(catId) {
    return categories.find(c => c.id === catId)?.name || catId;
}

function formatSpecsSummary(specs) {
    if (!specs || Object.keys(specs).length === 0) return '<span style="color: var(--text-muted);">—</span>';
    const parts = [];
    if (specs.wattage) parts.push(`${specs.wattage}W`);
    if (specs.socket) parts.push(specs.socket);
    if (specs.type) parts.push(specs.type);
    if (specs.performance_score) parts.push(`Score: ${specs.performance_score}`);
    return parts.join(' • ') || '—';
}

function renderProducts() {
    const tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;

    let filtered = [...allProducts];
    if (currentProductCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentProductCategory);
    }
    if (currentProductSearch) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(currentProductSearch));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Товары не найдены</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(product => `
        <tr>
            <td data-label="Фото">
                <img src="${product.image}" alt="${product.name}" class="admin-product-thumb" onerror="this.src='https://placehold.co/80x60?text=Img'">
            </td>
            <td data-label="Название" style="font-weight: 600;">
                <a href="product.html?id=${product.id}" style="color: var(--text-primary);">${product.name}</a>
            </td>
            <td data-label="Категория">${getCategoryLabel(product.category)}</td>
            <td data-label="Характеристики" style="font-size: 0.85rem; color: var(--text-secondary);">
                ${formatSpecsSummary(product.specs)}
            </td>
            <td data-label="Цена">
                ${product.oldPrice ? `<div style="font-size: 0.8rem; color: var(--text-muted); text-decoration: line-through;">${product.oldPrice} сом</div>` : ''}
                <div style="font-weight: 700; color: ${product.oldPrice ? '#00ff80' : 'var(--accent-primary)'};">
                    ${product.price} сом
                    ${product.discountPercent ? `<span style="margin-left: 6px; font-size: 0.72rem; background: linear-gradient(135deg, #ff0055, #ff5e00); color: #fff; padding: 2px 7px; border-radius: 10px;">-${product.discountPercent}% СКИДКА</span>` : ''}
                </div>
            </td>
            <td data-label="Действия" style="text-align: right;">
                <div class="flex gap-1" style="justify-content: flex-end;">
                    <button class="admin-btn-edit" onclick="window.openEditProductModal('${product.id}')">✏️ Изм.</button>
                    <button class="admin-btn-delete" onclick="window.handleDeleteProduct('${product.id}')">🗑️ Удал.</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.openAddProductModal = () => {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    clearFieldErrors(form);
    form.reset();
    document.getElementById('prod-id').value = '';
    const fileInput = document.getElementById('prod-image-file');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('prod-discount-preview');
    if (preview) preview.style.display = 'none';
    document.getElementById('product-modal-title').textContent = '➕ Добавить новый товар';
    document.getElementById('save-product-btn').textContent = 'Добавить в каталог';

    modal.style.display = 'flex';
};

window.openEditProductModal = (productId) => {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    clearFieldErrors(form);
    const fileInput = document.getElementById('prod-image-file');
    if (fileInput) fileInput.value = '';
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name || '';
    document.getElementById('prod-category').value = product.category || 'gpu';
    document.getElementById('prod-price').value = product.price || '';
    document.getElementById('prod-old-price').value = product.oldPrice || '';
    document.getElementById('prod-discount-pct').value = product.discountPercent || '';
    const preview = document.getElementById('prod-discount-preview');
    if (preview) {
        if (product.discountPercent > 0) {
            preview.style.display = 'inline-block';
            preview.textContent = `-${product.discountPercent}% СКИДКА`;
        } else {
            preview.style.display = 'none';
        }
    }
    document.getElementById('prod-image').value = product.image || '';
    document.getElementById('prod-desc').value = product.description || '';

    const specs = product.specs || {};
    document.getElementById('spec-wattage').value = specs.wattage || '';
    document.getElementById('spec-score').value = specs.performance_score || '';
    document.getElementById('spec-socket').value = specs.socket || '';
    document.getElementById('spec-type').value = specs.type || '';

    document.getElementById('product-modal-title').textContent = '✏️ Редактировать товар';
    document.getElementById('save-product-btn').textContent = 'Сохранить изменения';

    modal.style.display = 'flex';
};

window.closeProductModal = () => {
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'none';
};

async function handleSaveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('prod-id').value.trim();
    const nameInput = document.getElementById('prod-name');
    const categoryInput = document.getElementById('prod-category');
    const priceInput = document.getElementById('prod-price');
    const imageInput = document.getElementById('prod-image');
    const descInput = document.getElementById('prod-desc');

    const { valid } = validateForm([
        { input: nameInput, validators: [(v) => validateRequired(v, 'Название товара')] },
        { input: priceInput, validators: [(v) => validateRequired(v, 'Цена'), (v) => validatePositiveNumber(v, 'Цена')] },
        { input: descInput, validators: [(v) => validateRequired(v, 'Описание товара')] }
    ]);

    if (!valid) {
        showToast('Пожалуйста, заполните обязательные поля', 'error');
        return;
    }

    const specs = {};
    const wattage = Number(document.getElementById('spec-wattage').value);
    const score = Number(document.getElementById('spec-score').value);
    const socket = document.getElementById('spec-socket').value;
    const type = document.getElementById('spec-type').value;

    if (wattage > 0) specs.wattage = wattage;
    if (score > 0) specs.performance_score = score;
    if (socket) specs.socket = socket;
    if (type) specs.type = type;

    const oldPriceVal = Number(document.getElementById('prod-old-price')?.value || 0);

    const productData = {
        name: nameInput.value.trim(),
        category: categoryInput.value,
        price: Number(priceInput.value),
        oldPrice: oldPriceVal > Number(priceInput.value) ? oldPriceVal : null,
        image: imageInput.value.trim() || `https://placehold.co/400x300/1a1d2e/00f0ff?text=${encodeURIComponent(nameInput.value.trim())}`,
        description: descInput.value.trim(),
        specs
    };

    const saveBtn = document.getElementById('save-product-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение в Supabase...';

    // Если выбран файл изображения, сначала загружаем его в Supabase Storage ('image')
    const fileInput = document.getElementById('prod-image-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const uploadRes = await api.uploadProductImage(fileInput.files[0]);
        if (uploadRes.url) {
            productData.image = uploadRes.url;
        }
    }

    if (id) {
        const { syncedWithSupabase } = await api.updateProduct(id, productData);
        if (syncedWithSupabase) {
            showToast(`Товар «${productData.name}» обновлен в БД Supabase!`, 'success');
        } else {
            showToast(`Товар «${productData.name}» обновлен (проверьте RLS-политику products в Supabase)`, 'warning');
        }
    } else {
        const { syncedWithSupabase } = await api.addProduct(productData);
        if (syncedWithSupabase) {
            showToast(`Товар «${productData.name}» добавлен в БД Supabase!`, 'success');
        } else {
            showToast(`Товар «${productData.name}» добавлен (проверьте RLS-политику products в Supabase)`, 'warning');
        }
    }

    saveBtn.disabled = false;
    window.closeProductModal();
    await loadProducts();
    window.switchAdminTab('products');
}

window.handleDeleteProduct = async (productId) => {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    const { syncedWithSupabase } = await api.deleteProduct(productId);
    if (syncedWithSupabase) {
        showToast(`Товар «${product.name}» удален из БД Supabase!`, 'info');
    } else {
        showToast(`Товар «${product.name}» удален`, 'info');
    }
    await loadProducts();
};

// ================= УПРАВЛЕНИЕ ПРОМОКОДАМИ =================

async function renderPromos() {
    const tbody = document.getElementById('admin-promos-tbody');
    if (!tbody) return;

    const promos = await api.getPromoCodes();
    if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Активных промокодов нет</td></tr>';
        return;
    }

    tbody.innerHTML = promos.map(p => `
        <tr>
            <td data-label="Промокод" style="font-weight: 800; color: var(--accent-primary); letter-spacing: 1px;">${p.code}</td>
            <td data-label="Размер скидки" style="font-weight: 700; color: #00ff80;">
                ${p.type === 'percent' ? `-${p.value}%` : `-${p.value} сом`}
            </td>
            <td data-label="Мин. сумма">${p.minOrder > 0 ? `от ${p.minOrder} сом` : 'Без ограничений'}</td>
            <td data-label="Описание" style="color: var(--text-secondary);">${p.description || '—'}</td>
            <td data-label="Действия" style="text-align: right;">
                <button class="admin-btn-delete" onclick="window.handleDeletePromo('${p.code}')">🗑️ Удалить</button>
            </td>
        </tr>
    `).join('');
}

async function handleAddPromo(e) {
    e.preventDefault();
    const codeInput = document.getElementById('new-promo-code');
    const typeInput = document.getElementById('new-promo-type');
    const valInput = document.getElementById('new-promo-val');
    const minInput = document.getElementById('new-promo-min');
    const descInput = document.getElementById('new-promo-desc');

    if (!codeInput.value.trim() || !valInput.value || Number(valInput.value) <= 0) {
        showToast('Укажите код купона и размер скидки', 'error');
        return;
    }

    const val = Number(valInput.value);
    const type = typeInput.value;
    const minOrder = Number(minInput.value) || 0;
    const defaultDesc = type === 'percent'
        ? `Скидка ${val}%${minOrder > 0 ? ` от ${minOrder} сом` : ''}`
        : `Скидка ${val} сом${minOrder > 0 ? ` от ${minOrder} сом` : ''}`;

    const { syncedWithSupabase } = await api.addPromoCode({
        code: codeInput.value.trim(),
        type,
        value: val,
        minOrder,
        description: descInput.value.trim() || defaultDesc
    });

    e.target.reset();
    await renderPromos();
    if (syncedWithSupabase) {
        showToast('Промокод сохранен в таблицу promo_codes в Supabase!', 'success');
    } else {
        showToast('Промокод добавлен (выполните scripts/supabase_promocodes.sql в Supabase для сохранения в БД)', 'info');
    }
}

window.handleDeletePromo = async (code) => {
    const { syncedWithSupabase } = await api.deletePromoCode(code);
    await renderPromos();
    if (syncedWithSupabase) {
        showToast(`Промокод ${code} удален из БД Supabase`, 'info');
    } else {
        showToast(`Промокод ${code} удален`, 'info');
    }
};

initAdmin();
