import { api } from './api.js';
import { showToast } from './toast.js';

let allProducts = [];

// Состояние текущей сборки
let currentBuild = {
    mobo: null,
    cpu: null,
    gpu: null,
    ram: null,
    ssd: null,
    psu: null
};

// Сгруппированные компоненты по слотам
let components = {
    mobo: [],
    cpu: [],
    gpu: [],
    ram: [],
    ssd: [],
    psu: []
};

// Настройки калькулятора FPS
let fpsState = {
    resolution: '1080p', // '1080p' | '1440p' | '4k'
    quality: 'high'      // 'high' | 'ultra'
};

// Иконки по умолчанию для слотов
const defaultIcons = {
    mobo: 'img/builder-mobo.svg',
    cpu: 'img/builder-cpu.svg',
    gpu: 'img/builder-gpu.svg',
    ram: 'img/builder-ram.svg',
    ssd: 'img/builder-ssd.svg',
    psu: 'img/builder-psu.svg'
};

// База игр для расчёта FPS
const BENCHMARK_GAMES = [
    {
        id: 'cs2',
        title: 'Counter-Strike 2',
        genre: 'Киберспорт',
        baseFps: 310,      // базовый FPS при 100 баллах в 1080p High
        cpuWeight: 0.55,   // CS2 сильно зависит от процессора
        gpuWeight: 0.45,
        maxBarFps: 400
    },
    {
        id: 'dota2',
        title: 'Dota 2',
        genre: 'MOBA • Киберспорт',
        baseFps: 245,
        cpuWeight: 0.52,
        gpuWeight: 0.48,
        maxBarFps: 300
    },
    {
        id: 'gtav',
        title: 'GTA V / GTA Online',
        genre: 'Открытый мир',
        baseFps: 175,
        cpuWeight: 0.40,
        gpuWeight: 0.60,
        maxBarFps: 220
    },
    {
        id: 'rdr2',
        title: 'Red Dead Redemption 2',
        genre: 'AAA Открытый мир',
        baseFps: 130,
        cpuWeight: 0.28,
        gpuWeight: 0.72,
        maxBarFps: 180
    },
    {
        id: 'cyberpunk',
        title: 'Cyberpunk 2077',
        genre: 'AAA Next-Gen',
        baseFps: 115,
        cpuWeight: 0.25,
        gpuWeight: 0.75,
        maxBarFps: 160
    },
    {
        id: 'alanwake2',
        title: 'Alan Wake 2',
        genre: 'Тяжёлый Next-Gen',
        baseFps: 96,
        cpuWeight: 0.20,
        gpuWeight: 0.80,
        maxBarFps: 140
    }
];

// DOM-элементы селектов
const selects = {
    mobo: document.getElementById('select-mobo'),
    cpu: document.getElementById('select-cpu'),
    gpu: document.getElementById('select-gpu'),
    ram: document.getElementById('select-ram'),
    ssd: document.getElementById('select-ssd'),
    psu: document.getElementById('select-psu')
};

const stats = {
    totalPrice: document.getElementById('build-price'),
    partsCount: document.getElementById('build-parts-count'),
    bottleneck: document.getElementById('build-msg'),
    wattageFill: document.getElementById('wattage-fill'),
    wattageText: document.getElementById('wattage-text'),
    recPsuHint: document.getElementById('rec-psu-hint'),
    pillSocket: document.getElementById('pill-socket'),
    pillRam: document.getElementById('pill-ram'),
    pillPsu: document.getElementById('pill-psu'),
    bnBadge: document.getElementById('bottleneck-percent-badge'),
    bnCpuScore: document.getElementById('bn-cpu-score'),
    bnGpuScore: document.getElementById('bn-gpu-score'),
    bnMeterFill: document.getElementById('bottleneck-meter-fill'),
    bnAdvice: document.getElementById('bottleneck-advice'),
    fpsList: document.getElementById('fps-games-list'),
    fpsRamBadge: document.getElementById('fps-ram-badge')
};

/**
 * Интеллектуальное обогащение характеристик товара (на случай если в БД часть полей specs не заполнена)
 */
function enrichProductSpecs(rawProduct, slotKey) {
    const p = { ...rawProduct, specs: { ...(rawProduct.specs || {}) } };
    const text = `${p.name || ''} ${p.description || ''}`.toUpperCase();

    // 1. Определение сокета (для CPU и Материнских плат)
    if (slotKey === 'cpu' || slotKey === 'mobo') {
        if (!p.specs.socket) {
            if (text.includes('AM5') || text.includes('X670') || text.includes('B650') || text.includes('A620') || /RYZEN\s*[579]\s*7\d{3}/.test(text) || /RYZEN\s*[579]\s*9\d{3}/.test(text)) {
                p.specs.socket = 'AM5';
            } else if (text.includes('AM4') || text.includes('B550') || text.includes('B450') || text.includes('X570') || /RYZEN\s*[3579]\s*[35]\d{3}/.test(text)) {
                p.specs.socket = 'AM4';
            } else if (text.includes('LGA1700') || text.includes('Z790') || text.includes('Z690') || text.includes('B760') || text.includes('B660') || text.includes('H610') || /I[3579]-1[234]\d{3}/.test(text)) {
                p.specs.socket = 'LGA1700';
            }
        }
    }

    // 2. Определение типа оперативной памяти (DDR4 / DDR5)
    if (slotKey === 'ram' || slotKey === 'mobo') {
        const specType = String(p.specs.type || '').toUpperCase();
        if (specType.includes('DDR5') || text.includes('DDR5')) {
            p.specs.type = 'DDR5';
        } else if (specType.includes('DDR4') || text.includes('DDR4')) {
            p.specs.type = 'DDR4';
        } else if (slotKey === 'mobo') {
            // Если на плате явно не написано в названии, определяем по чипсету/сокету
            if (p.specs.socket === 'AM5' || text.includes('Z790') || text.includes('X670') || text.includes('B650')) {
                p.specs.type = 'DDR5';
            } else if (p.specs.socket === 'AM4' || text.includes('B660') || text.includes('B550') || text.includes('B450')) {
                p.specs.type = 'DDR4';
            }
        } else if (slotKey === 'ram') {
            p.specs.type = Number(p.price) >= 120 ? 'DDR5' : 'DDR4';
        }
    }

    // 3. Какие типы памяти поддерживает процессор
    if (slotKey === 'cpu') {
        if (p.specs.socket === 'AM5') {
            p.specs.supportedRam = ['DDR5'];
        } else if (p.specs.socket === 'AM4') {
            p.specs.supportedRam = ['DDR4'];
        } else {
            // LGA1700 (Intel 12/13/14 Gen) поддерживает и DDR4, и DDR5 (зависит от материнской платы)
            p.specs.supportedRam = ['DDR4', 'DDR5'];
        }
    }

    // 4. Определение мощности (wattage)
    if (!p.specs.wattage || Number(p.specs.wattage) <= 0) {
        const wattMatch = text.match(/(\d{3,4})\s*W/);
        if (slotKey === 'psu') {
            p.specs.wattage = wattMatch ? Number(wattMatch[1]) : 650;
        } else if (slotKey === 'gpu') {
            p.specs.wattage = Number(p.price) > 800 ? 320 : (Number(p.price) > 350 ? 180 : 150);
        } else if (slotKey === 'cpu') {
            p.specs.wattage = Number(p.price) > 500 ? 185 : 105;
        } else if (slotKey === 'mobo') {
            p.specs.wattage = 40;
        } else if (slotKey === 'ram') {
            p.specs.wattage = 10;
        } else if (slotKey === 'ssd') {
            p.specs.wattage = 5;
        }
    } else {
        p.specs.wattage = Number(p.specs.wattage);
    }

    // 5. Определение индекса производительности (performance_score от 25 до 100)
    if ((slotKey === 'cpu' || slotKey === 'gpu') && (!p.specs.performance_score || Number(p.specs.performance_score) <= 0)) {
        if (slotKey === 'gpu') {
            if (text.includes('4090')) p.specs.performance_score = 100;
            else if (text.includes('4080') || text.includes('7900 XTX')) p.specs.performance_score = 90;
            else if (text.includes('4070') || text.includes('7800 XT')) p.specs.performance_score = 72;
            else if (text.includes('4060 TI') || text.includes('6700 XT')) p.specs.performance_score = 55;
            else if (text.includes('4060') || text.includes('7600') || text.includes('3060')) p.specs.performance_score = 46;
            else p.specs.performance_score = Math.min(98, Math.max(35, Math.round(Number(p.price) / 13)));
        } else {
            if (text.includes('13900') || text.includes('14900') || text.includes('7950')) p.specs.performance_score = 96;
            else if (text.includes('13700') || text.includes('7800X3D') || text.includes('7900')) p.specs.performance_score = 84;
            else if (text.includes('13600') || text.includes('7700')) p.specs.performance_score = 68;
            else if (text.includes('7600') || text.includes('12400') || text.includes('13400') || text.includes('5600')) p.specs.performance_score = 55;
            else p.specs.performance_score = Math.min(98, Math.max(35, Math.round(Number(p.price) / 7)));
        }
    } else if (p.specs.performance_score) {
        p.specs.performance_score = Number(p.specs.performance_score);
    }

    return p;
}

// Инициализация конструктора
async function initBuilder() {
    try {
        // Если пользователь — администратор, скрываем кнопку покупки сборки
        const role = await api.getUserRole();
        if (role === 'admin') {
            const addBtn = document.getElementById('add-build-cart-btn');
            if (addBtn) addBtn.style.display = 'none';
            document.querySelectorAll('#tab-prebuilt .btn-primary').forEach(b => {
                b.style.display = 'none';
            });
        }

        const rawProducts = await api.getProducts();

        components = {
            mobo: rawProducts.filter(p => p.category === 'motherboard' || p.category === 'mobo').map(p => enrichProductSpecs(p, 'mobo')),
            cpu: rawProducts.filter(p => p.category === 'cpu').map(p => enrichProductSpecs(p, 'cpu')),
            gpu: rawProducts.filter(p => p.category === 'gpu').map(p => enrichProductSpecs(p, 'gpu')),
            ram: rawProducts.filter(p => p.category === 'ram').map(p => enrichProductSpecs(p, 'ram')),
            ssd: rawProducts.filter(p => p.category === 'storage' || p.category === 'ssd').map(p => enrichProductSpecs(p, 'ssd')),
            psu: rawProducts.filter(p => p.category === 'psu').map(p => enrichProductSpecs(p, 'psu'))
        };

        allProducts = [
            ...components.mobo,
            ...components.cpu,
            ...components.gpu,
            ...components.ram,
            ...components.ssd,
            ...components.psu
        ];

        updateCompatibleOptions();
        attachListeners();
        calculateStats();
    } catch (e) {
        console.error('Ошибка инициализации конструктора:', e);
    }
}

/**
 * Формирование краткой подписи характеристик в option
 */
function formatOptionSpecsTag(key, item) {
    const tags = [];
    if (key === 'mobo') {
        if (item.specs?.socket) tags.push(item.specs.socket);
        if (item.specs?.type) tags.push(item.specs.type);
    } else if (key === 'cpu') {
        if (item.specs?.socket) tags.push(item.specs.socket);
        if (item.specs?.wattage) tags.push(`${item.specs.wattage}W`);
    } else if (key === 'gpu') {
        if (item.specs?.type) tags.push(item.specs.type);
        if (item.specs?.wattage) tags.push(`${item.specs.wattage}W`);
    } else if (key === 'ram') {
        if (item.specs?.type) tags.push(item.specs.type);
    } else if (key === 'psu') {
        if (item.specs?.wattage) tags.push(`${item.specs.wattage}W`);
    }
    return tags.length ? ` [${tags.join(' • ')}]` : '';
}

/**
 * Проверка совместимости конкретного кандидата слота с текущими выбранными деталями
 * Возвращает { compatible: boolean, reason: string }
 */
function checkCandidateCompatibility(slotKey, candidate) {
    const mobo = currentBuild.mobo;
    const cpu = currentBuild.cpu;
    const ram = currentBuild.ram;

    // 1. Проверка для ОПЕРАТИВНОЙ ПАМЯТИ (RAM)
    if (slotKey === 'ram') {
        const ramType = candidate.specs?.type; // 'DDR4' | 'DDR5'
        // Если выбрана материнская плата — проверяем её стандарт памяти (DDR4 vs DDR5)
        if (mobo && mobo.specs?.type && ramType && mobo.specs.type !== ramType) {
            return {
                compatible: false,
                reason: `Несовместимо: плата ${mobo.name} поддерживает только ${mobo.specs.type}`
            };
        }
        // Если выбран процессор, который поддерживает только определённый тип памяти (например AM5 -> только DDR5)
        if (cpu && cpu.specs?.supportedRam && ramType && !cpu.specs.supportedRam.includes(ramType)) {
            return {
                compatible: false,
                reason: `Несовместимо: процессор (${cpu.specs.socket}) требует память ${cpu.specs.supportedRam.join('/')}`
            };
        }
    }

    // 2. Проверка для МАТЕРИНСКОЙ ПЛАТЫ (MOBO)
    if (slotKey === 'mobo') {
        const moboSocket = candidate.specs?.socket;
        const moboRamType = candidate.specs?.type;

        if (cpu && cpu.specs?.socket && moboSocket && cpu.specs.socket !== moboSocket) {
            return {
                compatible: false,
                reason: `Несовместимо: выбран процессор под сокет ${cpu.specs.socket}`
            };
        }

        if (ram && ram.specs?.type && moboRamType && ram.specs.type !== moboRamType) {
            return {
                compatible: false,
                reason: `Несовместимо: уже выбрана память ${ram.specs.type}`
            };
        }
    }

    // 3. Проверка для ПРОЦЕССОРА (CPU)
    if (slotKey === 'cpu') {
        const cpuSocket = candidate.specs?.socket;
        const cpuSupportedRam = candidate.specs?.supportedRam || ['DDR4', 'DDR5'];

        if (mobo && mobo.specs?.socket && cpuSocket && mobo.specs.socket !== cpuSocket) {
            return {
                compatible: false,
                reason: `Несовместимо: плата имеет сокет ${mobo.specs.socket}`
            };
        }

        if (ram && ram.specs?.type && !cpuSupportedRam.includes(ram.specs.type)) {
            return {
                compatible: false,
                reason: `Несовместимо: выбранная память ${ram.specs.type} не работает с ${cpuSocket}`
            };
        }

        if (mobo && mobo.specs?.type && !cpuSupportedRam.includes(mobo.specs.type)) {
            return {
                compatible: false,
                reason: `Несовместимо: плата ${mobo.specs.type} не подходит к ${cpuSocket}`
            };
        }
    }

    // 4. Проверка для БЛОКА ПИТАНИЯ (PSU)
    if (slotKey === 'psu') {
        const usedWatts = getSystemUsedWatts();
        const psuWatts = candidate.specs?.wattage || 0;
        if (usedWatts > 0 && psuWatts < usedWatts) {
            return {
                compatible: false,
                reason: `Слабый БП: сборка потребляет ${usedWatts}W`
            };
        }
    }

    return { compatible: true, reason: '' };
}

function getSystemUsedWatts() {
    let watts = 0;
    for (const [key, item] of Object.entries(currentBuild)) {
        if (item && key !== 'psu') {
            watts += (item.specs?.wattage || 0);
        }
    }
    return watts;
}

/**
 * Обновление всех выпадающих списков с блокировкой (disabled) несовместимых комплектующих
 * и автоматическим сбросом конфликтующих деталей
 */
function updateCompatibleOptions(changedKey = null) {
    // Сначала проверяем, не конфликтуют ли уже выбранные компоненты с только что изменённым слотом
    if (changedKey) {
        const checkOrder = ['ram', 'cpu', 'mobo', 'psu'].filter(k => k !== changedKey);
        checkOrder.forEach(slotKey => {
            const selectedItem = currentBuild[slotKey];
            if (selectedItem) {
                const check = checkCandidateCompatibility(slotKey, selectedItem);
                if (!check.compatible) {
                    const removedName = selectedItem.name;
                    currentBuild[slotKey] = null;
                    updateComponentRowUI(slotKey, null);
                    showToast(`Компонент «${removedName}» снят: ${check.reason.replace('Несовместимо: ', '')}`, 'warning');
                }
            }
        });
    }

    // Перерисовываем все селекты: совместимые сверху, несовместимые — заблокированы (disabled) с объяснением причины
    for (const [key, list] of Object.entries(components)) {
        const select = selects[key];
        if (!select) continue;

        const selectedId = currentBuild[key]?.id;
        const compatibleOptions = [];
        const incompatibleOptions = [];

        list.forEach(item => {
            const specTag = formatOptionSpecsTag(key, item);
            const isSelected = String(item.id) === String(selectedId);
            const check = checkCandidateCompatibility(key, item);

            if (check.compatible) {
                compatibleOptions.push(
                    `<option value="${item.id}" ${isSelected ? 'selected' : ''}>${item.name}${specTag} — ${item.price} сом</option>`
                );
            } else {
                incompatibleOptions.push(
                    `<option value="${item.id}" disabled>🔒 ${item.name}${specTag} — [${check.reason}]</option>`
                );
            }
        });

        let html = `<option value="">Выберите компонент (${compatibleOptions.length} доступно)...</option>`;
        if (compatibleOptions.length > 0) {
            html += `<optgroup label="✅ Совместимые компоненты">${compatibleOptions.join('')}</optgroup>`;
        }
        if (incompatibleOptions.length > 0) {
            html += `<optgroup label="🔒 Несовместимые с текущим выбором">${incompatibleOptions.join('')}</optgroup>`;
        }

        select.innerHTML = html;
        select.value = selectedId ? String(selectedId) : '';
    }

    updateActiveConstraintPills();
}

/**
 * Обновление верхней панели активных ограничений (Сокет / Память DDR / Мин. БП)
 */
function updateActiveConstraintPills() {
    const activeSocket = currentBuild.mobo?.specs?.socket || currentBuild.cpu?.specs?.socket || null;
    let activeRam = currentBuild.mobo?.specs?.type || currentBuild.ram?.specs?.type || null;
    if (!activeRam && currentBuild.cpu?.specs?.supportedRam?.length === 1) {
        activeRam = currentBuild.cpu.specs.supportedRam[0];
    }

    const usedWatts = getSystemUsedWatts();
    const recPsuWatts = usedWatts > 0 ? Math.ceil((usedWatts * 1.25) / 50) * 50 : 0;

    if (stats.pillSocket) {
        stats.pillSocket.textContent = activeSocket ? `🔌 Сокет: ${activeSocket}` : '🔌 Сокет: Любой';
        stats.pillSocket.classList.toggle('active-pill', Boolean(activeSocket));
    }

    if (stats.pillRam) {
        stats.pillRam.textContent = activeRam ? `⚡ Память: Только ${activeRam}` : '⚡ Память: DDR4 / DDR5';
        stats.pillRam.classList.toggle('active-pill', Boolean(activeRam));
    }

    if (stats.pillPsu) {
        stats.pillPsu.textContent = recPsuWatts > 0 ? `🔋 Реком. БП: от ${recPsuWatts}W` : '🔋 Мин. БП: —';
        stats.pillPsu.classList.toggle('active-pill', recPsuWatts > 0);
    }
}

function updateComponentRowUI(key, product) {
    const row = document.getElementById(`row-${key}`);
    const imgEl = document.getElementById(`img-${key}`);
    const specsEl = document.getElementById(`specs-${key}`);
    const clearBtn = document.getElementById(`clear-${key}`);

    if (!product) {
        if (row) row.classList.remove('selected-row');
        if (imgEl) imgEl.src = defaultIcons[key];
        if (specsEl) specsEl.innerHTML = 'Не выбрано';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (row) row.classList.add('selected-row');
    if (clearBtn) clearBtn.style.display = 'flex';

    if (imgEl) {
        const hasRealPhoto = product.image && !product.image.includes('placehold.co');
        imgEl.src = hasRealPhoto ? product.image : defaultIcons[key];
    }

    if (specsEl) {
        const badges = [`<span class="slot-spec-price">${product.price} сом</span>`];
        if (product.specs?.socket) badges.push(`<span class="slot-spec-tag">${product.specs.socket}</span>`);
        if (product.specs?.type) badges.push(`<span class="slot-spec-tag">${product.specs.type}</span>`);
        if (product.specs?.wattage) badges.push(`<span class="slot-spec-tag">${product.specs.wattage}W</span>`);
        if (product.specs?.performance_score) badges.push(`<span class="slot-spec-tag">⚡ ${product.specs.performance_score} pts</span>`);
        specsEl.innerHTML = badges.join(' ');
    }
}

function attachListeners() {
    for (const [key, select] of Object.entries(selects)) {
        if (!select) continue;
        select.addEventListener('change', (e) => {
            const id = e.target.value;
            const product = id ? allProducts.find(p => String(p.id) === String(id)) : null;

            // Дополнительная защита: проверяем совместимость перед установкой
            if (product) {
                const check = checkCandidateCompatibility(key, product);
                if (!check.compatible) {
                    showToast(check.reason, 'error');
                    e.target.value = currentBuild[key]?.id || '';
                    return;
                }
            }

            currentBuild[key] = product;
            updateComponentRowUI(key, product);
            updateCompatibleOptions(key);
            calculateStats();
        });
    }
}

// Сброс одного слота
window.clearBuilderSlot = (slotKey) => {
    if (!currentBuild[slotKey]) return;
    currentBuild[slotKey] = null;
    updateComponentRowUI(slotKey, null);
    updateCompatibleOptions(slotKey);
    calculateStats();
};

// Полный сброс сборки
window.resetCustomBuild = () => {
    for (const key of Object.keys(currentBuild)) {
        currentBuild[key] = null;
        updateComponentRowUI(key, null);
    }
    updateCompatibleOptions();
    calculateStats();
    showToast('Конструктор очищен', 'info');
};

// Быстрые пресеты автоподбора совместимой сборки из реальных товаров
window.applyBuilderPreset = (presetType) => {
    for (const key of Object.keys(currentBuild)) {
        currentBuild[key] = null;
    }

    const pickByPrice = (list, mode) => {
        if (!list || list.length === 0) return null;
        const sorted = [...list].sort((a, b) => Number(a.price) - Number(b.price));
        if (mode === 'min') return sorted[0];
        if (mode === 'max') return sorted[sorted.length - 1];
        return sorted[Math.floor(sorted.length / 2)];
    };

    if (presetType === 'budget') {
        // Ищем плату с DDR4
        const ddr4Mobo = components.mobo.find(m => m.specs?.type === 'DDR4') || pickByPrice(components.mobo, 'min');
        currentBuild.mobo = ddr4Mobo;

        const compatCpus = components.cpu.filter(c => checkCandidateCompatibility('cpu', c).compatible);
        currentBuild.cpu = pickByPrice(compatCpus, 'min');

        const compatRam = components.ram.filter(r => checkCandidateCompatibility('ram', r).compatible);
        currentBuild.ram = pickByPrice(compatRam, 'min');

        currentBuild.gpu = pickByPrice(components.gpu, 'min');
        currentBuild.ssd = pickByPrice(components.ssd, 'min');

        const compatPsu = components.psu.filter(p => checkCandidateCompatibility('psu', p).compatible);
        currentBuild.psu = pickByPrice(compatPsu, 'min');

        showToast('Собрана стартовая совместимая конфигурация для Full HD (DDR4)!', 'success');
    } else if (presetType === 'optimal') {
        // Оптимальная сборка на DDR5 (AM5 или LGA1700)
        const ddr5Mobo = components.mobo.find(m => m.specs?.type === 'DDR5' && m.specs?.socket === 'AM5') ||
            components.mobo.find(m => m.specs?.type === 'DDR5') ||
            pickByPrice(components.mobo, 'mid');
        currentBuild.mobo = ddr5Mobo;

        const compatCpus = components.cpu.filter(c => checkCandidateCompatibility('cpu', c).compatible);
        currentBuild.cpu = pickByPrice(compatCpus, 'mid');

        const compatRam = components.ram.filter(r => checkCandidateCompatibility('ram', r).compatible);
        currentBuild.ram = pickByPrice(compatRam, 'min');

        currentBuild.gpu = pickByPrice(components.gpu, 'mid');
        currentBuild.ssd = pickByPrice(components.ssd, 'mid');

        const compatPsu = components.psu.filter(p => checkCandidateCompatibility('psu', p).compatible);
        currentBuild.psu = pickByPrice(compatPsu, 'mid');

        showToast('Собрана оптимальная игровая сборка для 2K (DDR5)!', 'success');
    } else if (presetType === 'ultra') {
        const topGpu = pickByPrice(components.gpu, 'max');
        currentBuild.gpu = topGpu;

        const topCpu = pickByPrice(components.cpu, 'max');
        currentBuild.cpu = topCpu;

        const compatMobos = components.mobo.filter(m => checkCandidateCompatibility('mobo', m).compatible);
        currentBuild.mobo = pickByPrice(compatMobos, 'max');

        const compatRam = components.ram.filter(r => checkCandidateCompatibility('ram', r).compatible);
        currentBuild.ram = pickByPrice(compatRam, 'max');

        currentBuild.ssd = pickByPrice(components.ssd, 'max');

        const compatPsu = components.psu.filter(p => checkCandidateCompatibility('psu', p).compatible);
        currentBuild.psu = pickByPrice(compatPsu, 'max');

        showToast('Собрана флагманская сборка Ультра 4K!', 'success');
    }

    for (const [key, item] of Object.entries(currentBuild)) {
        updateComponentRowUI(key, item);
    }
    updateCompatibleOptions();
    calculateStats();
};

function calculateStats() {
    let price = 0;
    let wattage = 0;
    let psuWattage = 0;
    let selectedCount = 0;

    for (const [key, item] of Object.entries(currentBuild)) {
        if (item) {
            selectedCount++;
            price += Number(item.price || 0);
            if (key !== 'psu') {
                wattage += (item.specs?.wattage || 0);
            } else {
                psuWattage = item.specs?.wattage || 0;
            }
        }
    }

    if (stats.totalPrice) {
        stats.totalPrice.innerText = `${price.toFixed(2)} сом`;
    }

    if (stats.partsCount) {
        stats.partsCount.innerText = `${selectedCount} / 6 деталей`;
    }

    const recommendedPsu = wattage > 0 ? Math.ceil((wattage * 1.25) / 50) * 50 : 0;
    if (stats.recPsuHint) {
        stats.recPsuHint.innerText = recommendedPsu > 0 ? `Реком. БП: от ${recommendedPsu}W` : 'Реком. БП: —';
    }

    if (stats.wattageFill && stats.wattageText) {
        if (psuWattage > 0) {
            const percent = Math.min((wattage / psuWattage) * 100, 100);
            stats.wattageFill.style.width = `${percent}%`;
            stats.wattageText.innerText = `${wattage}W / ${psuWattage}W (${Math.round(percent)}%)`;

            if (percent <= 75) {
                stats.wattageFill.style.background = 'linear-gradient(90deg, #00f0ff, #00ff80)';
            } else if (percent <= 90) {
                stats.wattageFill.style.background = 'linear-gradient(90deg, #ffa600, #ff5e00)';
            } else {
                stats.wattageFill.style.background = '#ff0055';
            }

            stats.wattageFill.style.borderRadius = percent < 100 ? '12px 0 0 12px' : '12px';
        } else {
            const previewPct = wattage > 0 ? Math.min((wattage / 850) * 100, 100) : 0;
            stats.wattageFill.style.width = `${previewPct}%`;
            stats.wattageFill.style.background = 'rgba(0, 240, 255, 0.45)';
            stats.wattageText.innerText = wattage > 0 ? `Потребление: ${wattage}W (выберите БП)` : '0 W';
        }
    }

    checkCompatibility(wattage, psuWattage);
    updateBottleneckAnalyzer();
    renderFpsBenchmarks();
}

function checkCompatibility(usedWatts, psuWatts) {
    if (!stats.bottleneck) return;

    const cpu = currentBuild.cpu;
    const gpu = currentBuild.gpu;
    const mobo = currentBuild.mobo;
    const psu = currentBuild.psu;
    const ram = currentBuild.ram;

    const selectedItems = Object.values(currentBuild).filter(Boolean);
    if (selectedItems.length === 0) {
        updateStatus({
            text: 'Выберите компоненты слева, чтобы проверить их совместимость и увидеть FPS в играх.',
            class: 'status-ok'
        });
        return;
    }

    // 1. Проверка сокета
    if (cpu && mobo && cpu.specs?.socket !== mobo.specs?.socket) {
        updateStatus({
            text: `❌ Ошибка: Несовместимый сокет! Процессор ${cpu.specs.socket}, а плата ${mobo.specs.socket}.`,
            class: 'status-error'
        });
        return;
    }

    // 2. Проверка стандарта ОЗУ (DDR4 vs DDR5)
    if (mobo && ram && mobo.specs?.type !== ram.specs?.type) {
        updateStatus({
            text: `❌ Ошибка: Несовместимая память! Плата поддерживает ${mobo.specs.type}, а выбрана ${ram.specs.type}.`,
            class: 'status-error'
        });
        return;
    }

    if (cpu && ram && cpu.specs?.supportedRam && !cpu.specs.supportedRam.includes(ram.specs?.type)) {
        updateStatus({
            text: `❌ Ошибка: Процессор (${cpu.specs.socket}) поддерживает только ${cpu.specs.supportedRam.join('/')}.`,
            class: 'status-error'
        });
        return;
    }

    // 3. Проверка блока питания
    if (psu) {
        if (usedWatts > psuWatts) {
            updateStatus({
                text: `❌ Критично: Блок питания слаб! Потребление ${usedWatts}W превышает ${psuWatts}W.`,
                class: 'status-error'
            });
            return;
        } else if (usedWatts > psuWatts * 0.85) {
            updateStatus({
                text: `⚠️ Внимание: Нагрузка на БП составляет ${Math.round((usedWatts / psuWatts) * 100)}%. Рекомендуется запас 20%.`,
                class: 'status-warn'
            });
            return;
        }
    }

    if (selectedItems.length === 6) {
        updateStatus({
            text: `✅ Сборка полностью укомплектована (6/6)! Все компоненты на 100% совместимы.`,
            class: 'status-ok'
        });
    } else {
        const activeStandard = mobo?.specs?.type || ram?.specs?.type || '';
        const activeSocket = mobo?.specs?.socket || cpu?.specs?.socket || '';
        const meta = [activeSocket, activeStandard].filter(Boolean).join(' • ');
        updateStatus({
            text: `✅ Выбранные детали совместимы${meta ? ` (${meta})` : ''}. Осталось выбрать: ${6 - selectedItems.length} шт.`,
            class: 'status-ok'
        });
    }
}

function updateStatus({ text, class: className }) {
    stats.bottleneck.innerText = text;
    stats.bottleneck.className = `compatibility-status ${className}`;
}

/**
 * Расчёт и визуализация «Бутылочного горлышка» (Bottleneck Analyzer)
 */
function updateBottleneckAnalyzer() {
    const cpu = currentBuild.cpu;
    const gpu = currentBuild.gpu;

    if (!stats.bnBadge || !stats.bnMeterFill || !stats.bnAdvice) return;

    const cpuScore = cpu?.specs?.performance_score || 0;
    const gpuScore = gpu?.specs?.performance_score || 0;

    if (stats.bnCpuScore) stats.bnCpuScore.textContent = cpu ? `${cpuScore} pts` : 'Не выбран';
    if (stats.bnGpuScore) stats.bnGpuScore.textContent = gpu ? `${gpuScore} pts` : 'Не выбрана';

    if (!cpu || !gpu) {
        stats.bnBadge.textContent = 'Ожидание CPU + GPU';
        stats.bnBadge.className = 'bottleneck-badge neutral';
        stats.bnMeterFill.style.width = '50%';
        stats.bnMeterFill.style.background = 'linear-gradient(90deg, #00f0ff, #00ff80)';
        stats.bnAdvice.textContent = 'Выберите процессор и видеокарту, чтобы проанализировать баланс мощности и раскрытие потенциала в выбранном разрешении.';
        return;
    }

    // В 1080p нагрузка на CPU выше, а в 1440p и 4K упор смещается на видеокарту
    const resMultipliers = {
        '1080p': { cpuDemand: 1.0, gpuDemand: 0.92, label: '1080p Full HD' },
        '1440p': { cpuDemand: 0.85, gpuDemand: 1.05, label: '1440p 2K QHD' },
        '4k':    { cpuDemand: 0.70, gpuDemand: 1.22, label: '4K Ultra HD' }
    };

    const resCfg = resMultipliers[fpsState.resolution] || resMultipliers['1080p'];
    const effectiveCpu = cpuScore / resCfg.cpuDemand;
    const effectiveGpu = gpuScore / resCfg.gpuDemand;

    // Процент бутылочного горлышка
    const rawDiff = effectiveGpu - effectiveCpu; // > 0 означает, что GPU мощнее CPU (упор в процессор)
    const maxScore = Math.max(effectiveCpu, effectiveGpu, 1);
    const bottleneckPct = Math.min(48, Math.round((Math.abs(rawDiff) / maxScore) * 100));

    // Положение индикатора от 10% (сильный упор в CPU) до 90% (сильный упор в GPU), 50% — идеал
    const meterPos = Math.max(8, Math.min(92, Math.round(50 - (rawDiff / maxScore) * 45)));
    stats.bnMeterFill.style.width = `${meterPos}%`;

    if (bottleneckPct <= 12) {
        stats.bnBadge.textContent = `${bottleneckPct}% • Идеальный баланс`;
        stats.bnBadge.className = 'bottleneck-badge good';
        stats.bnMeterFill.style.background = 'linear-gradient(90deg, #00f0ff, #00ff80)';
        stats.bnAdvice.innerHTML = `В разрешении <strong>${resCfg.label}</strong> процессор <strong>${cpu.name}</strong> и видеокарта <strong>${gpu.name}</strong> работают в идеальном балансе. Видеокарта раскрывается на <strong>${100 - Math.round(bottleneckPct / 2)}%</strong>!`;
    } else if (bottleneckPct <= 24) {
        stats.bnBadge.textContent = `${bottleneckPct}% • Небольшой дисбаланс`;
        stats.bnBadge.className = 'bottleneck-badge warn';
        stats.bnMeterFill.style.background = 'linear-gradient(90deg, #00f0ff, #ffa600)';
        if (rawDiff > 0) {
            stats.bnAdvice.innerHTML = `В <strong>${resCfg.label}</strong> видеокарта немного мощнее процессора (упор в CPU <strong>${bottleneckPct}%</strong>). Переход в 1440p/4K или более мощный CPU даст до +15% FPS.`;
        } else {
            stats.bnAdvice.innerHTML = `В <strong>${resCfg.label}</strong> у процессора <strong>${cpu.name}</strong> большой запас мощности (упор в видеокарту <strong>${bottleneckPct}%</strong>). Отличный задел под будущий апгрейд GPU!`;
        }
    } else {
        stats.bnBadge.textContent = `${bottleneckPct}% • Бутылочное горлышко`;
        stats.bnBadge.className = 'bottleneck-badge bad';
        stats.bnMeterFill.style.background = 'linear-gradient(90deg, #ff0055, #ffa600)';
        if (rawDiff > 0) {
            stats.bnAdvice.innerHTML = `⚠️ Внимание: в <strong>${resCfg.label}</strong> процессор <strong>${cpu.name}</strong> ограничивает потенциал <strong>${gpu.name}</strong> примерно на <strong>${bottleneckPct}%</strong>. Рекомендуем выбрать более мощный процессор.`;
        } else {
            stats.bnAdvice.innerHTML = `ℹ️ Процессор <strong>${cpu.name}</strong> избыточен для видеокарты <strong>${gpu.name}</strong> в играх (дисбаланс <strong>${bottleneckPct}%</strong>). Для игр выгоднее перераспределить бюджет в пользу более мощной видеокарты.`;
        }
    }
}

/**
 * Переключение разрешения и качества графики в калькуляторе FPS
 */
window.setFpsResolution = (res) => {
    fpsState.resolution = res;
    document.querySelectorAll('#fps-res-tabs .fps-res-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.res === res);
    });
    updateBottleneckAnalyzer();
    renderFpsBenchmarks();
};

window.setFpsQuality = (quality) => {
    fpsState.quality = quality;
    document.querySelectorAll('#fps-quality-tabs .fps-quality-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.quality === quality);
    });
    renderFpsBenchmarks();
};

/**
 * Расчёт и отрисовка FPS для 6 игр
 */
function renderFpsBenchmarks() {
    if (!stats.fpsList) return;

    const cpu = currentBuild.cpu;
    const gpu = currentBuild.gpu;
    const ram = currentBuild.ram;
    const mobo = currentBuild.mobo;
    const ssd = currentBuild.ssd;

    const isDdr5 = (ram?.specs?.type === 'DDR5') || (!ram && mobo?.specs?.type === 'DDR5');
    if (stats.fpsRamBadge) {
        stats.fpsRamBadge.style.display = isDdr5 ? 'inline-flex' : 'none';
    }

    if (!cpu && !gpu) {
        stats.fpsList.innerHTML = `
            <div class="fps-empty-state">
                <div style="font-size: 1.8rem; margin-bottom: 6px;">🎮</div>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Выберите Процессор и Видеокарту</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary);">Калькулятор покажет точный прогноз FPS в 6 популярных играх для 1080p, 1440p и 4K.</div>
            </div>
        `;
        return;
    }

    // Если выбран только один из двух (CPU или GPU), берём второй как базовый (50 баллов) с пометкой
    const cpuScore = cpu?.specs?.performance_score || 50;
    const gpuScore = gpu?.specs?.performance_score || 45;

    // Множители разрешения
    const resScale = {
        '1080p': 1.0,
        '1440p': 0.74,
        '4k': 0.48
    }[fpsState.resolution] || 1.0;

    // Множители пресета качества
    const qualityScale = fpsState.quality === 'ultra' ? 0.84 : 1.0;

    // Бонус от DDR5 (+8%) и быстрого SSD (+2%)
    const ramMultiplier = isDdr5 ? 1.08 : 1.0;
    const ssdMultiplier = ssd ? 1.02 : 1.0;

    // Штраф при сильном упоре в процессор
    const bottleneckPenalty = (gpuScore - cpuScore > 25)
        ? Math.max(0.78, 1 - ((gpuScore - cpuScore - 20) * 0.005))
        : 1.0;

    const gamesHtml = BENCHMARK_GAMES.map(game => {
        // В высоких разрешениях вес GPU растёт
        let effectiveGpuWeight = game.gpuWeight;
        let effectiveCpuWeight = game.cpuWeight;
        if (fpsState.resolution === '1440p') {
            effectiveGpuWeight = Math.min(0.88, game.gpuWeight + 0.10);
            effectiveCpuWeight = 1 - effectiveGpuWeight;
        } else if (fpsState.resolution === '4k') {
            effectiveGpuWeight = Math.min(0.94, game.gpuWeight + 0.18);
            effectiveCpuWeight = 1 - effectiveGpuWeight;
        }

        const weightedScore = (gpuScore * effectiveGpuWeight + cpuScore * effectiveCpuWeight) / 100;
        const avgFps = Math.max(
            18,
            Math.round(game.baseFps * weightedScore * resScale * qualityScale * ramMultiplier * ssdMultiplier * bottleneckPenalty)
        );
        const low1PctFps = Math.max(12, Math.round(avgFps * (isDdr5 ? 0.81 : 0.75)));

        const barPercent = Math.min(100, Math.round((avgFps / game.maxBarFps) * 100));

        let tierColor = '#00ff80';
        let tierLabel = 'Ультра плавно';
        if (avgFps < 45) {
            tierColor = '#ff0055';
            tierLabel = 'Тяжело';
        } else if (avgFps < 60) {
            tierColor = '#ffa600';
            tierLabel = 'Играбельно';
        } else if (avgFps < 120) {
            tierColor = '#00f0ff';
            tierLabel = 'Комфортно 60+';
        }

        return `
            <div class="fps-game-item">
                <div class="fps-game-header">
                    <div>
                        <div class="fps-game-title">${game.title}</div>
                        <div class="fps-game-genre">${game.genre} • 1% Low: ${low1PctFps} FPS</div>
                    </div>
                    <div class="fps-game-numbers">
                        <span class="fps-main-val" style="color: ${tierColor};">~${avgFps} <small>FPS</small></span>
                        <span class="fps-tier-tag" style="border-color: ${tierColor}44; color: ${tierColor};">${tierLabel}</span>
                    </div>
                </div>
                <div class="fps-bar-track">
                    <div class="fps-bar-fill" style="width: ${barPercent}%; background: ${tierColor}; box-shadow: 0 0 10px ${tierColor}66;"></div>
                </div>
            </div>
        `;
    }).join('');

    const partialNote = (!cpu || !gpu)
        ? `<div class="fps-partial-note">ℹ️ Выберите ${!cpu ? 'процессор' : 'видеокарту'} для 100% точного расчёта (сейчас используется базовый ориентир).</div>`
        : '';

    stats.fpsList.innerHTML = partialNote + gamesHtml;
}

// Запуск на странице конструктора
if (document.getElementById('select-cpu')) {
    initBuilder();
}

window.addCustomBuildToCart = () => {
    const selectedItems = Object.values(currentBuild).filter(Boolean);
    if (selectedItems.length === 0) {
        showToast('Выберите хотя бы один компонент для сборки!', 'warning');
        return;
    }

    // Проверяем, нет ли критических ошибок совместимости перед добавлением в корзину
    const usedWatts = getSystemUsedWatts();
    const psuWatts = currentBuild.psu?.specs?.wattage || 0;
    if (currentBuild.psu && usedWatts > psuWatts) {
        showToast('Блок питания слишком слаб для выбранной сборки! Выберите более мощный БП.', 'error');
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
