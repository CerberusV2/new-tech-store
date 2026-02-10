// Начальные данные для магазина (будут загружены в базу данных Supabase)
export const initialProducts = [
    // === ВИДЕОКАРТЫ (4 шт) ===
    {
        id: "gpu-1",
        name: "NVIDIA GeForce RTX 4080",
        category: "gpu",
        price: 1199.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=RTX+4080",
        description: "Высокопроизводительная видеокарта для 4K гейминга.",
        specs: { wattage: 320, performance_score: 90, type: "GDDR6X" }
    },
    {
        id: "gpu-2",
        name: "NVIDIA GeForce RTX 4060 Ti",
        category: "gpu",
        price: 399.00,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=RTX+4060+Ti",
        description: "Отличный выбор для 1080p гейминга.",
        specs: { wattage: 160, performance_score: 50, type: "GDDR6" }
    },
    {
        id: "gpu-3",
        name: "AMD Radeon RX 7900 XTX",
        category: "gpu",
        price: 999.00,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=RX+7900+XTX",
        description: "Топовая видеокарта AMD с 24GB памяти.",
        specs: { wattage: 355, performance_score: 88, type: "GDDR6" }
    },
    {
        id: "gpu-4",
        name: "AMD Radeon RX 7600",
        category: "gpu",
        price: 269.00,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=RX+7600",
        description: "Бюджетная карта для Full HD игр.",
        specs: { wattage: 165, performance_score: 45, type: "GDDR6" }
    },

    // === ПРОЦЕССОРЫ (4 шт) ===
    {
        id: "cpu-1",
        name: "AMD Ryzen 9 7950X",
        category: "cpu",
        price: 699,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=Ryzen+9+7950X",
        description: "16-ядерный монстр для рабочих задач.",
        specs: { wattage: 170, performance_score: 95, socket: "AM5" }
    },
    {
        id: "cpu-2",
        name: "AMD Ryzen 5 7600X",
        category: "cpu",
        price: 299,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=Ryzen+5+7600X",
        description: "Народный 6-ядерный процессор.",
        specs: { wattage: 105, performance_score: 55, socket: "AM5" }
    },
    {
        id: "cpu-3",
        name: "Intel Core i9-13900K",
        category: "cpu",
        price: 589,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=i9-13900K",
        description: "24-ядерный флагман Intel с гибридной архитектурой.",
        specs: { wattage: 253, performance_score: 98, socket: "LGA1700" }
    },
    {
        id: "cpu-4",
        name: "Intel Core i5-13600K",
        category: "cpu",
        price: 319,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=i5-13600K",
        description: "14-ядерный процессор для игр и работы.",
        specs: { wattage: 181, performance_score: 65, socket: "LGA1700" }
    },

    // === МАТЕРИНСКИЕ ПЛАТЫ (4 шт) ===
    {
        id: "mobo-1",
        name: "ASUS ROG MAXIMUS Z790",
        category: "motherboard",
        price: 450,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=Z790+ROG",
        description: "Топовая плата под Intel с поддержкой DDR5.",
        specs: { socket: "LGA1700", type: "DDR5", wattage: 50 }
    },
    {
        id: "mobo-2",
        name: "GIGABYTE X670 AORUS ELITE",
        category: "motherboard",
        price: 280,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=X670+AORUS",
        description: "Платформа AM5 с поддержкой PCIe 5.0.",
        specs: { socket: "AM5", type: "DDR5", wattage: 40 }
    },
    {
        id: "mobo-3",
        name: "MSI B660M MORTAR",
        category: "motherboard",
        price: 189,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=B660M+MORTAR",
        description: "Надежная плата формата mATX для Intel.",
        specs: { socket: "LGA1700", type: "DDR4", wattage: 35 }
    },
    {
        id: "mobo-4",
        name: "ASRock B650M PRO RS",
        category: "motherboard",
        price: 159,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=B650M+PRO",
        description: "Бюджетная плата для Ryzen 7000 с поддержкой DDR5.",
        specs: { socket: "AM5", type: "DDR5", wattage: 30 }
    },

    // === ПАМЯТЬ (4 шт) ===
    {
        id: "ram-1",
        name: "Corsair Vengeance DDR5 32GB",
        category: "ram",
        price: 159.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=DDR5+32GB",
        description: "Быстрая DDR5 память 6000MHz.",
        specs: { type: "DDR5", wattage: 10 }
    },
    {
        id: "ram-2",
        name: "G.Skill Trident Z5 RGB 32GB",
        category: "ram",
        price: 179.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=Trident+Z5",
        description: "Премиум DDR5 память 6400MHz с RGB подсветкой.",
        specs: { type: "DDR5", wattage: 12 }
    },
    {
        id: "ram-3",
        name: "Crucial DDR4 16GB",
        category: "ram",
        price: 49.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=DDR4+16GB",
        description: "Бюджетная DDR4 память 3200MHz.",
        specs: { type: "DDR4", wattage: 5 }
    },
    {
        id: "ram-4",
        name: "Kingston Fury Beast 32GB",
        category: "ram",
        price: 89.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=Fury+32GB",
        description: "DDR4 память 3600MHz для игровых систем.",
        specs: { type: "DDR4", wattage: 8 }
    },

    // === НАКОПИТЕЛИ (4 шт) ===
    {
        id: "ssd-1",
        name: "Samsung 990 PRO 2TB",
        category: "storage",
        price: 179.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=990+PRO+2TB",
        description: "Сверхбыстрый NVMe Gen4 накопитель.",
        specs: { wattage: 5 }
    },
    {
        id: "ssd-2",
        name: "WD Black SN850X 1TB",
        category: "storage",
        price: 119.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=SN850X+1TB",
        description: "Игровой NVMe SSD с высокой скоростью.",
        specs: { wattage: 4 }
    },
    {
        id: "ssd-3",
        name: "Kingston NV2 500GB",
        category: "storage",
        price: 39.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=NV2+500GB",
        description: "Бюджетный NVMe SSD для системного диска.",
        specs: { wattage: 3 }
    },
    {
        id: "ssd-4",
        name: "Crucial P3 Plus 2TB",
        category: "storage",
        price: 149.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=P3+Plus+2TB",
        description: "Доступный NVMe Gen4 накопитель большого объема.",
        specs: { wattage: 4 }
    },

    // === БЛОКИ ПИТАНИЯ (4 шт) ===
    {
        id: "psu-1",
        name: "Corsair RM850x",
        category: "psu",
        price: 139.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=RM850x",
        description: "Золотой стандарт надежности 850W 80+ Gold.",
        specs: { wattage: 850 }
    },
    {
        id: "psu-2",
        name: "Cooler Master V750",
        category: "psu",
        price: 99.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=V750",
        description: "Модульный блок питания 750W 80+ Gold.",
        specs: { wattage: 750 }
    },
    {
        id: "psu-3",
        name: "EVGA SuperNOVA 1000W",
        category: "psu",
        price: 189.99,
        image: "https://placehold.co/400x300/1a1d2e/00f0ff?text=1000W+PSU",
        description: "Мощный блок питания 1000W 80+ Platinum для топовых систем.",
        specs: { wattage: 1000 }
    },
    {
        id: "psu-4",
        name: "Be Quiet! Pure Power 11 600W",
        category: "psu",
        price: 79.99,
        image: "https://placehold.co/400x300/1a1d2e/ff0055?text=600W+PSU",
        description: "Тихий и надежный блок питания 600W 80+ Gold.",
        specs: { wattage: 600 }
    }
];

export const categories = [
    { id: "all", name: "Все" },
    { id: "gpu", name: "Видеокарты" },
    { id: "cpu", name: "Процессоры" },
    { id: "motherboard", name: "Материнские платы" },
    { id: "ram", name: "Память" },
    { id: "storage", name: "Накопители" },
    { id: "psu", name: "Блоки питания" },
    { id: "accessories", name: "Аксессуары" }
];
