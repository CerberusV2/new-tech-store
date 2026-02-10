import { api } from './api.js';

let allOrders = [];
let currentFilter = 'all';

async function init() {
    // Проверка прав admin
    const role = await api.getUserRole();
    if (role !== 'admin') {
        const container = document.getElementById('orders-container');
        const adminCheck = document.getElementById('admin-check');
        if (container) container.style.display = 'none';
        if (adminCheck) adminCheck.style.display = 'block';
        return;
    }

    // Загрузка заказов
    await loadOrders();

    // Фильтр
    const filterEl = document.getElementById('status-filter');
    if (filterEl) {
        filterEl.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderOrders();
        });
    }
}

async function loadOrders() {
    allOrders = await api.getAllOrders();
    const countEl = document.getElementById('orders-count');
    if (countEl) countEl.textContent = allOrders.filter(o => o.status === 'в обработке').length;
    renderOrders();
}

function renderOrders() {
    const tbody = document.getElementById('orders-table');
    if (!tbody) return;

    let filtered = allOrders;

    if (currentFilter !== 'all') {
        filtered = allOrders.filter(o => o.status === currentFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Заказов не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU');
        const clientName = order.address_info?.name || 'Не указано';

        return `
                <td data-label="№ Заказа" style="padding: 1rem;">#${order.id.slice(0, 8)}</td>
                <td data-label="Дата" style="padding: 1rem;">${date}</td>
                <td data-label="Клиент" style="padding: 1rem;">${clientName}</td>
                <td data-label="Сумма" style="padding: 1rem; font-weight: bold;">${order.total} сом</td>
                <td data-label="Статус" style="padding: 1rem;">
                    <span class="status-badge status-${order.status.replace(/ /g, '-')}">${order.status}</span>
                </td>
                <td data-label="Действия" style="padding: 1rem;">
                    <div class="flex gap-1 justify-end" style="width: 100%; justify-content: flex-end;">
                        <select onchange="window.changeStatus('${order.id}', this.value)" 
                                style="background: var(--bg-secondary); color: white; border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; max-width: 120px;">
                            <option value="">Статус</option>
                            <option value="в обработке">В обработке</option>
                            <option value="отправлен">Отправлен</option>
                            <option value="доставлен">Доставлен</option>
                            <option value="отменен">Отменен</option>
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
        alert('Ошибка при обновлении статуса: ' + error.message);
    } else {
        alert('Статус успешно обновлен!');
        await loadOrders();
    }
};

window.viewOrderDetails = (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const items = order.items.map(item => `${item.name} x${item.quantity} - ${item.price * item.quantity} сом`).join('\n');
    const info = order.address_info;

    alert(`Заказ #${order.id.slice(0, 8)}\n\nТовары:\n${items}\n\nКлиент: ${info.name}\nТелефон: ${info.phone}\nEmail: ${info.email}\nАдрес: ${info.address}`);
};

init();
