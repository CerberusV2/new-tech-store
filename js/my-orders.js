import { api } from './api.js';

async function init() {
    const orders = await api.getUserOrders();

    if (orders.length === 0) {
        document.getElementById('orders-list').style.display = 'none';
        document.getElementById('empty-orders').style.display = 'block';
        return;
    }

    renderOrders(orders);
}

function renderOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!container) return;

    container.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const items = order.items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                <span>${item.name} x${item.quantity}</span>
                <span style="font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        return `
            <div class="glass-panel" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">Заказ #${order.id.slice(0, 8)}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${date}</p>
                    </div>
                    <span class="status-badge status-${order.status.replace(/ /g, '-')}">${order.status}</span>
                </div>

                <div style="margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Товары:</h4>
                    ${items}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 2px solid var(--border-color);">
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        <div>Адрес: ${order.address_info.address}</div>
                        <div>Телефон: ${order.address_info.phone}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Итого:</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">$${order.total}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

init();
