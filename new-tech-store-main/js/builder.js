import { api } from './api.js';
import { initialProducts } from './data.js';
import { showToast } from './toast.js';

let allProducts = [];

// State
let currentBuild = {
    cpu: null,
    gpu: null,
    mobo: null,
    ram: null,
    ssd: null,
    psu: null
};

let components = {
    cpu: [],
    gpu: [],
    mobo: [],
    ram: [],
    ssd: [],
    psu: []
};

// DOM Elements
const selects = {
    cpu: document.getElementById('select-cpu'),
    gpu: document.getElementById('select-gpu'),
    mobo: document.getElementById('select-mobo'),
    ram: document.getElementById('select-ram'),
    ssd: document.getElementById('select-ssd'),
    psu: document.getElementById('select-psu')
};

const stats = {
    totalPrice: document.getElementById('build-price'),
    bottleneck: document.getElementById('build-msg'),
    wattageFill: document.getElementById('wattage-fill'),
    wattageText: document.getElementById('wattage-text')
};

// Init
async function initBuilder() {
    try {
        allProducts = await api.getProducts();

        // Распределяем товары по категориям
        components = {
            cpu: allProducts.filter(p => p.category === 'cpu'),
            gpu: allProducts.filter(p => p.category === 'gpu'),
            mobo: allProducts.filter(p => p.category === 'motherboard' || p.category === 'mobo'),
            ram: allProducts.filter(p => p.category === 'ram'),
            ssd: allProducts.filter(p => p.category === 'storage' || p.category === 'ssd'),
            psu: allProducts.filter(p => p.category === 'psu')
        };

        populateSelects();
        attachListeners();
        calculateStats();
    } catch (e) {
        console.error("Ошибка инициализации конструктора:", e);
    }
}

function populateSelects() {
    for (const [key, list] of Object.entries(components)) {
        const select = selects[key];
        if (!select) continue;

        select.innerHTML = `<option value="">Выберите компонент...</option>` +
            list.map(item => `<option value="${item.id}">${item.name} - ${item.price} сом</option>`).join('');
    }
}

const defaultIcons = {
    mobo: 'img/builder-mobo.svg',
    cpu: 'img/builder-cpu.svg',
    gpu: 'img/builder-gpu.svg',
    ram: 'img/builder-ram.svg',
    ssd: 'img/builder-ssd.svg',
    psu: 'img/builder-psu.svg'
};

function updateComponentRowUI(key, product) {
    const row = document.getElementById(`row-${key}`);
    const imgEl = document.getElementById(`img-${key}`);
    const specsEl = document.getElementById(`specs-${key}`);

    if (!product) {
        if (row) row.classList.remove('selected-row');
        if (imgEl) imgEl.src = defaultIcons[key];
        if (specsEl) specsEl.textContent = 'Не выбрано';
        return;
    }

    if (row) row.classList.add('selected-row');

    // Если у товара загружено реальное фото (не placehold.co), ставим его, иначе оставляем четкую SVG-иллюстрацию
    if (imgEl) {
        const hasRealPhoto = product.image && !product.image.includes('placehold.co');
        imgEl.src = hasRealPhoto ? product.image : defaultIcons[key];
    }

    if (specsEl) {
        const parts = [`${product.price} сом`];
        if (product.specs?.socket) parts.push(product.specs.socket);
        if (product.specs?.type) parts.push(product.specs.type);
        if (product.specs?.wattage) parts.push(`${product.specs.wattage}W`);
        specsEl.textContent = parts.join(' • ');
    }
}

function attachListeners() {
    for (const [key, select] of Object.entries(selects)) {
        if (!select) continue;
        select.addEventListener('change', (e) => {
            const id = e.target.value;
            const product = id ? allProducts.find(p => String(p.id) === String(id)) : null;
            currentBuild[key] = product;

            updateComponentRowUI(key, product);

            // Фильтрация совместимых компонентов
            if (key === 'cpu' || key === 'mobo') {
                updateCompatibleOptions();
            }

            calculateStats();
        });
    }
}

function updateCompatibleOptions() {
    const cpu = currentBuild.cpu;
    const mobo = currentBuild.mobo;

    // Фильтруем мат.платы по сокету CPU
    if (cpu && selects.mobo) {
        const cpuSocket = cpu.specs?.socket;
        const moboSelect = selects.mobo;
        const currentMoboId = currentBuild.mobo?.id;

        moboSelect.innerHTML = `<option value="">Выберите компонент...</option>` +
            components.mobo
                .filter(m => !cpuSocket || m.specs?.socket === cpuSocket)
                .map(item => `<option value="${item.id}" ${item.id === currentMoboId ? 'selected' : ''}>${item.name} - ${item.price} сом</option>`)
                .join('');
    }

    // Фильтруем CPU по сокету мат.платы
    if (mobo && selects.cpu) {
        const moboSocket = mobo.specs?.socket;
        const cpuSelect = selects.cpu;
        const currentCpuId = currentBuild.cpu?.id;

        cpuSelect.innerHTML = `<option value="">Выберите компонент...</option>` +
            components.cpu
                .filter(c => !moboSocket || c.specs?.socket === moboSocket)
                .map(item => `<option value="${item.id}" ${item.id === currentCpuId ? 'selected' : ''}>${item.name} - ${item.price} сом</option>`)
                .join('');
    }
}

function calculateStats() {
    let price = 0;
    let wattage = 0;
    let psuWattage = 0;

    // Sum basic stats
    for (const [key, item] of Object.entries(currentBuild)) {
        if (item) {
            price += item.price;
            if (key !== 'psu') {
                wattage += (item.specs?.wattage || 0);
            } else {
                psuWattage = item.specs?.wattage || 0;
            }
        }
    }

    // Update Price
    if (stats.totalPrice) stats.totalPrice.innerText = `${price.toFixed(2)} сом`;

    // Update Wattage Bar
    if (stats.wattageText) stats.wattageText.innerText = `${wattage}W / ${psuWattage}W`;

    if (stats.wattageFill) {
        if (psuWattage > 0) {
            const percent = Math.min((wattage / psuWattage) * 100, 100);
            stats.wattageFill.style.width = `${percent}%`;

            if (percent <= 70) {
                // До 70% - сплошной голубой цвет
                stats.wattageFill.style.background = '#00f0ff';
            } else {
                // Выше 70% - сплошной красный цвет
                stats.wattageFill.style.background = '#ff0055';
            }

            // Убираем округление если не заполнено
            if (percent < 100) {
                stats.wattageFill.style.borderRadius = '12px 0 0 12px';
            } else {
                stats.wattageFill.style.borderRadius = '12px';
            }

        } else {
            stats.wattageFill.style.width = '0%';
            stats.wattageText.innerText = `${wattage}W`;
        }
    }

    // Check Compatibility / Bottleneck
    checkCompatibility(wattage, psuWattage);
}

function checkCompatibility(usedWatts, psuWatts) {
    if (!stats.bottleneck) return;

    const msg = { text: "Все отлично! Компоненты совместимы.", class: "status-ok" };

    const cpu = currentBuild.cpu;
    const gpu = currentBuild.gpu;
    const mobo = currentBuild.mobo;
    const psu = currentBuild.psu;
    const ram = currentBuild.ram;

    // 1. Socket Check
    if (cpu && mobo) {
        if (cpu.specs.socket !== mobo.specs.socket) {
            msg.text = `Ошибка: Несовместимый сокет! процессор ${cpu.specs.socket}, плата ${mobo.specs.socket}.`;
            msg.class = "status-error";
            updateStatus(msg);
            return;
        }
    }

    // 2. RAM Type Check
    if (mobo && ram) {
        if (mobo.specs.type !== ram.specs.type) {
            msg.text = `Ошибка: Несовместимая память! Плата ${mobo.specs.type}, память ${ram.specs.type}.`;
            msg.class = "status-error";
            updateStatus(msg);
            return;
        }
    }

    // 3. PSU Check
    if (psu) {
        if (usedWatts > psuWatts) {
            msg.text = `Критично: Блок питания слишком слаб! Потребление ${usedWatts}W, БП ${psuWatts}W.`;
            msg.class = "status-error";
            updateStatus(msg);
            return;
        } else if (usedWatts > psuWatts * 0.9) {
            msg.text = "Внимание: Блок питания работает на пределе. Рекомендуется запас.";
            msg.class = "status-warn";
        }
    }

    // 4. Bottleneck Check (Heuristic)
    if (cpu && gpu) {
        const scoreDiff = Math.abs(cpu.specs.performance_score - gpu.specs.performance_score);
        if (scoreDiff > 30) {
            if (cpu.specs.performance_score < gpu.specs.performance_score) {
                msg.text = "Совет: Процессор может не раскрыть эту видеокарту.";
                msg.class = "status-warn";
            } else {
                msg.text = "Совет: Видеокарта слабовата для этого процессора.";
                msg.class = "status-warn";
            }
        }
    }

    updateStatus(msg);
}

function updateStatus({ text, class: className }) {
    stats.bottleneck.innerText = text;
    stats.bottleneck.className = `compatibility-status ${className}`;
}

// Run if on builder page
if (document.getElementById('select-cpu')) {
    initBuilder();
}

window.addCustomBuildToCart = () => {
    const selectedItems = Object.values(currentBuild).filter(Boolean);
    if (selectedItems.length === 0) {
        showToast('Выберите хотя бы один компонент для сборки!', 'warning');
        return;
    }

    const cart = JSON.parse(localStorage.getItem('tech_store_cart')) || [];
    selectedItems.forEach(product => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
    });

    localStorage.setItem('tech_store_cart', JSON.stringify(cart));

    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    showToast(`В корзину добавлено компонентов: ${selectedItems.length} шт.`, 'success');
};
