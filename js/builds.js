import { showToast } from './toast.js';

window.openTab = (tabName) => {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.style.display = 'none');

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    const evt = window.event;

    if (tabName === 'prebuilt') {
        document.getElementById('tab-prebuilt').style.display = 'block';
        if (evt && evt.target) evt.target.classList.add('active');
    } else {
        document.getElementById('tab-custom').style.display = 'grid';
        if (evt && evt.target) evt.target.classList.add('active');
    }
};

window.addPrebuiltToCart = (buildId, buildName, price) => {
    const cart = JSON.parse(localStorage.getItem('tech_store_cart')) || [];
    const existingItem = cart.find(item => item.id === buildId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: buildId,
            name: `Сборка «${buildName}»`,
            price: price,
            category: 'Готовая сборка',
            image: `https://placehold.co/300x200/1a1d2e/00f0ff?text=${encodeURIComponent(buildName)}`,
            quantity: 1
        });
    }

    localStorage.setItem('tech_store_cart', JSON.stringify(cart));

    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.innerText = totalItems;
    }

    showToast(`Сборка «${buildName}» добавлена в корзину!`, 'success');
};

document.addEventListener('DOMContentLoaded', () => {
    openTab('custom');
});
