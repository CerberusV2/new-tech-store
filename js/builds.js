window.openTab = (tabName) => {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.style.display = 'none');

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    // Note: 'event' is relied upon here from the inline onclick invocation context or global event
    // In strict mode/modules this might be risky, but trying to preserve logic.
    // Ideally pass event as argument.
    const evt = window.event;

    if (tabName === 'prebuilt') {
        document.getElementById('tab-prebuilt').style.display = 'block'; // grid actually
        if (evt && evt.target) evt.target.classList.add('active');
    } else {
        document.getElementById('tab-custom').style.display = 'grid'; // grid
        if (evt && evt.target) evt.target.classList.add('active');
    }
}

// Функция для добавления готовой сборки в корзину
window.addPrebuiltToCart = (buildId, buildName, price) => {
    const cart = JSON.parse(localStorage.getItem('tech_store_cart')) || [];

    // Проверяем, есть ли уже эта сборка в корзине
    const existingItem = cart.find(item => item.id === buildId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: buildId,
            name: buildName,
            price: price,
            category: 'Готовая сборка',
            image: `https://placehold.co/300x200/1a1d2e/FFFFFF?text=${encodeURIComponent(buildName)}`,
            quantity: 1
        });
    }

    localStorage.setItem('tech_store_cart', JSON.stringify(cart));

    // Обновляем счетчик корзины
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.innerText = totalItems;
    }

    alert(`Сборка "${buildName}" добавлена в корзину!`);
};

// Init default
document.addEventListener('DOMContentLoaded', () => {
    openTab('custom');
});
