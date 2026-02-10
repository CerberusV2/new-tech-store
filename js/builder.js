import { api } from './api.js';
import { initialProducts } from './data.js';

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

function attachListeners() {
    for (const [key, select] of Object.entries(selects)) {
        if (!select) continue;
        select.addEventListener('change', (e) => {
            const id = e.target.value;
            const product = id ? allProducts.find(p => p.id === id) : null;
            currentBuild[key] = product;



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

window.selectTab = (tabId) => {
    // Simple tab implementation needs HTML matching logic
    // For now we just focus on the Custom Build part as requested
    alert('Переключение табов в разработке. Сейчас доступен "Свой билд".');
};
