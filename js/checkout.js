import { api } from './api.js';

const cart = JSON.parse(localStorage.getItem('tech_store_cart')) || [];
const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

const totalEl = document.getElementById('order-total');
if (totalEl) {
    totalEl.innerText = `$${total.toFixed(2)}`;
}

// Check Auth immediately
api.getSession().then(({ data }) => {
    if (!data.session) {
        alert("Время сессии истекло. Пожалуйста, войдите снова.");
        window.location.href = 'auth.html';
        return;
    }
    // Pre-fill email if available
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = data.session.user.email;
    }
});

const form = document.getElementById('checkout-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerText = "Обработка...";
        submitBtn.disabled = true;

        const orderData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            items: cart,
            total: total
        };

        const { error } = await api.createOrder(orderData);

        if (error) {
            alert("Ошибка при создании заказа: " + error.message);
            submitBtn.innerText = "Подтвердить заказ";
            submitBtn.disabled = false;
        } else {
            localStorage.removeItem('tech_store_cart');
            alert("Заказ успешно оформлен! Спасибо за покупку.");
            window.location.href = 'index.html';
        }
    });
}
