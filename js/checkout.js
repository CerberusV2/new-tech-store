import { api } from './api.js';
import { showToast } from './toast.js';
import { validateForm, validateRequired, validateEmail, validatePhone, validateMinLength } from './validation.js';

const cart = JSON.parse(localStorage.getItem('tech_store_cart')) || [];
const rawSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const savedSummary = JSON.parse(localStorage.getItem('tech_store_cart_summary') || 'null');

const subtotal = savedSummary ? savedSummary.subtotal : rawSubtotal;
const totalDiscount = savedSummary ? savedSummary.totalDiscount : 0;
const total = savedSummary ? savedSummary.finalTotal : rawSubtotal;

const subtotalEl = document.getElementById('order-subtotal');
const discountRowEl = document.getElementById('order-discount-row');
const discountLabelEl = document.getElementById('order-discount-label');
const discountEl = document.getElementById('order-discount');
const totalEl = document.getElementById('order-total');

if (subtotalEl) subtotalEl.innerText = `${subtotal.toFixed(2)} сом`;
if (discountRowEl && totalDiscount > 0) {
    discountRowEl.style.display = 'flex';
    const promoPart = savedSummary?.promoCode ? ` (промокод ${savedSummary.promoCode})` : '';
    if (discountLabelEl) discountLabelEl.innerText = `Ваша скидка${promoPart}:`;
    if (discountEl) discountEl.innerText = `-${totalDiscount.toFixed(2)} сом`;
}
if (totalEl) {
    totalEl.innerText = `${total.toFixed(2)} сом`;
}

api.getSession().then(({ data }) => {
    if (!data.session) {
        showToast("Для оформления заказа войдите в аккаунт", "warning");
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1200);
        return;
    }

    const user = data.session.user;
    const savedProfile = JSON.parse(localStorage.getItem(`profile_extra_${user.id}`)) || {};

    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');

    if (emailInput) emailInput.value = user.email || '';
    if (nameInput) nameInput.value = savedProfile.username || user.user_metadata?.full_name || '';
    if (phoneInput) phoneInput.value = savedProfile.phone || user.user_metadata?.phone || '';
    if (addressInput) addressInput.value = savedProfile.address || user.user_metadata?.address || '';
});

const form = document.getElementById('checkout-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            showToast("Ваша корзина пуста!", "error");
            return;
        }

        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const emailInput = document.getElementById('email');
        const addressInput = document.getElementById('address');

        const { valid } = validateForm([
            {
                input: nameInput,
                validators: [
                    (v) => validateRequired(v, 'Имя получателя'),
                    (v) => validateMinLength(v, 2, 'Имя получателя')
                ]
            },
            {
                input: phoneInput,
                validators: [(v) => validatePhone(v)]
            },
            {
                input: emailInput,
                validators: [(v) => validateEmail(v)]
            },
            {
                input: addressInput,
                validators: [
                    (v) => validateRequired(v, 'Адрес доставки'),
                    (v) => validateMinLength(v, 8, 'Адрес доставки')
                ]
            }
        ]);

        if (!valid) {
            showToast("Пожалуйста, исправьте ошибки в форме", "error");
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerText = "Обработка заказа...";
        submitBtn.disabled = true;

        const orderData = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim(),
            address: addressInput.value.trim(),
            items: cart,
            total: total
        };

        const { error } = await api.createOrder(orderData);

        if (error) {
            showToast("Ошибка при создании заказа: " + error.message, "error");
            submitBtn.innerText = "Подтвердить заказ";
            submitBtn.disabled = false;
        } else {
            localStorage.removeItem('tech_store_cart');
            localStorage.removeItem('tech_store_active_promo');
            localStorage.removeItem('tech_store_cart_summary');
            showToast("Заказ успешно оформлен! Спасибо за покупку 🎉", "success");
            setTimeout(() => {
                window.location.href = 'my-orders.html';
            }, 1200);
        }
    });
}
