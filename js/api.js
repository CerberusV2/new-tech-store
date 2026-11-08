import { initialProducts, categories } from './data.js';

// Настройки Supabase
const SUPABASE_URL = 'https://yeppwqhncmkqfabnfppy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHB3cWhuY21rcWZhYm5mcHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQ4MDMsImV4cCI6MjA4NDk0MDgwM30.cJt26mGSyLDyREuI3QUjXDwQqN6I_bd0lkvRCvHtm5Q';

// Инициализация
let supabase = null;

function initSupabase() {
    if (window.supabase && !supabase) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase Client initialized via initSupabase");
        } catch (e) {
            console.error("Supabase init error:", e);
        }
    }
}

if (window.supabase) {
    initSupabase();
}

// Вспомогательные функции для резервной синхронизации, если RLS в Supabase блокирует запрос
function getLocalCustomProducts() {
    try {
        return JSON.parse(localStorage.getItem('tech_store_custom_products')) || [];
    } catch {
        return [];
    }
}

function saveLocalCustomProducts(list) {
    localStorage.setItem('tech_store_custom_products', JSON.stringify(list));
}

function getDeletedProductIds() {
    try {
        return JSON.parse(localStorage.getItem('tech_store_deleted_products')) || [];
    } catch {
        return [];
    }
}

function saveDeletedProductIds(ids) {
    localStorage.setItem('tech_store_deleted_products', JSON.stringify(ids));
}

function normalizeProductDiscount(p) {
    const prod = { ...p, specs: { ...(p.specs || {}) } };
    const oldPrice = Number(prod.oldPrice || prod.old_price || prod.specs?.old_price || 0);
    if (oldPrice > Number(prod.price)) {
        prod.oldPrice = oldPrice;
        prod.discountPercent = Math.round(((oldPrice - Number(prod.price)) / oldPrice) * 100);
    } else {
        prod.oldPrice = null;
        prod.discountPercent = 0;
    }
    return prod;
}

function mergeWithLocalProducts(baseProducts) {
    const custom = getLocalCustomProducts();
    const deleted = getDeletedProductIds();
    const map = new Map();

    baseProducts.forEach(p => {
        if (!deleted.includes(p.id)) {
            map.set(p.id, normalizeProductDiscount(p));
        }
    });

    custom.forEach(p => {
        if (!deleted.includes(p.id)) {
            map.set(p.id, normalizeProductDiscount(p));
        }
    });

    return Array.from(map.values());
}

class ApiService {
    constructor() {
        this.products = [...initialProducts];
    }

    getClient() {
        if (!supabase) initSupabase();
        return supabase;
    }

    // --- Auth ---

    async getSession() {
        if (!supabase) initSupabase();
        if (!supabase) return { data: { session: null }, error: null };
        return await supabase.auth.getSession();
    }

    async signIn(email, password) {
        if (!supabase) initSupabase();
        if (!supabase) {
            console.error("Supabase lib not found");
            return { error: { message: "Библиотека Supabase не загружена." } };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (data?.session) {
                console.log("Session established:", data.session);
            }
            return { user: data.user, session: data.session, error };
        } catch (err) {
            console.error("SignIn Exception:", err);
            return { error: { message: "Ошибка: " + err.message } };
        }
    }

    async signUp(email, password, username) {
        if (!supabase) initSupabase();
        if (!supabase) return { error: { message: "Supabase not configured" } };
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    full_name: username
                }
            }
        });
        return { user: data.user, error };
    }

    async updateProfile(profileData) {
        if (!supabase) initSupabase();
        if (!supabase) return { error: { message: "Supabase не инициализирован" } };

        const { data, error } = await supabase.auth.updateUser({
            data: profileData
        });

        if (!error && data?.user) {
            localStorage.setItem('cached_user', JSON.stringify(data.user));
        }
        return { user: data?.user, error };
    }

    async signOut() {
        if (supabase) await supabase.auth.signOut();
    }

    // --- Roles ---

    async getUserRole() {
        if (!supabase) initSupabase();
        if (!supabase) return 'user';
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        if (error || !data) return 'user';
        return data.role;
    }

    // --- Загрузка изображения в Supabase Storage (бакет 'image') ---

    async uploadProductImage(file) {
        if (!supabase) initSupabase();
        if (!supabase || !file) return { url: null, error: { message: 'Файл не выбран' } };

        const ext = file.name.split('.').pop();
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('image')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
            console.warn('Ошибка загрузки в Supabase Storage:', uploadError.message);
            // Резервный вариант: DataURL, если политика бакета закрыта
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ url: reader.result, error: null, isLocalFallback: true });
                reader.onerror = () => resolve({ url: null, error: uploadError });
                reader.readAsDataURL(file);
            });
        }

        const { data } = supabase.storage.from('image').getPublicUrl(fileName);
        return { url: data?.publicUrl || null, error: null };
    }

    // --- Data (Products) ---

    async getProducts(category = 'all') {
        if (!supabase) initSupabase();
        let resultProducts = [...this.products];

        if (supabase) {
            const { data, error } = await supabase.from('products').select('*');
            if (!error && data && data.length > 0) {
                resultProducts = data;
            }
        }

        const merged = mergeWithLocalProducts(resultProducts);

        if (category === 'all' || !category) return merged;
        return merged.filter(p => p.category === category || this.mapCategoryToGroupId(category) === p.category);
    }

    async getProductById(id) {
        if (!supabase) initSupabase();

        if (supabase) {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (!error && data) {
                const custom = getLocalCustomProducts().find(p => String(p.id) === String(id));
                return normalizeProductDiscount(custom || data);
            }
        }

        const all = await this.getProducts('all');
        const found = all.find(p => String(p.id) === String(id));
        if (found) return found;

        return normalizeProductDiscount(this.products.find(p => String(p.id) === String(id)) || {});
    }

    // --- Admin Product Management (Прямая привязка к Supabase + резервный кеш) ---

    async addProduct(productData) {
        if (!supabase) initSupabase();
        const specs = { ...(productData.specs || {}) };
        const oldPriceNum = Number(productData.oldPrice || 0);
        if (oldPriceNum > Number(productData.price)) {
            specs.old_price = oldPriceNum;
        } else {
            delete specs.old_price;
        }

        const generatedId = productData.id || `${productData.category}-${Date.now()}`;
        const dbPayload = {
            id: generatedId,
            name: productData.name,
            category: productData.category,
            price: Number(productData.price),
            image: productData.image || `https://placehold.co/400x300/1a1d2e/00f0ff?text=${encodeURIComponent(productData.name)}`,
            description: productData.description || '',
            specs
        };

        let syncedWithSupabase = false;
        let dbError = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('products')
                .insert([dbPayload])
                .select();

            if (!error && data && data.length > 0) {
                syncedWithSupabase = true;
                // Если успешно сохранено в Supabase, удаляем из локального буфера, чтобы не дублировать
                const custom = getLocalCustomProducts().filter(p => p.id !== generatedId);
                saveLocalCustomProducts(custom);
            } else {
                dbError = error || { message: 'RLS ограничение на INSERT в таблице products' };
                console.warn("Supabase INSERT error:", dbError);
            }
        }

        const newProduct = normalizeProductDiscount({
            ...dbPayload,
            oldPrice: oldPriceNum > Number(productData.price) ? oldPriceNum : null
        });

        if (!syncedWithSupabase) {
            const custom = getLocalCustomProducts().filter(p => p.id !== newProduct.id);
            custom.unshift(newProduct);
            saveLocalCustomProducts(custom);
        }

        return { product: newProduct, syncedWithSupabase, error: dbError };
    }

    async updateProduct(productId, productData) {
        if (!supabase) initSupabase();
        const specs = { ...(productData.specs || {}) };
        const oldPriceNum = Number(productData.oldPrice || 0);
        if (oldPriceNum > Number(productData.price)) {
            specs.old_price = oldPriceNum;
        } else {
            delete specs.old_price;
        }

        const dbPayload = {
            name: productData.name,
            category: productData.category,
            price: Number(productData.price),
            image: productData.image || `https://placehold.co/400x300/1a1d2e/00f0ff?text=${encodeURIComponent(productData.name)}`,
            description: productData.description || '',
            specs
        };

        let syncedWithSupabase = false;
        let dbError = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('products')
                .update(dbPayload)
                .eq('id', productId)
                .select();

            if (!error && data && data.length > 0) {
                syncedWithSupabase = true;
                const custom = getLocalCustomProducts().filter(p => p.id !== productId);
                saveLocalCustomProducts(custom);
            } else {
                dbError = error || { message: 'RLS ограничение на UPDATE в таблице products' };
                console.warn("Supabase UPDATE error:", dbError);
            }
        }

        const updatedProduct = normalizeProductDiscount({
            id: productId,
            ...dbPayload,
            oldPrice: oldPriceNum > Number(productData.price) ? oldPriceNum : null
        });

        if (!syncedWithSupabase) {
            const custom = getLocalCustomProducts().filter(p => p.id !== productId);
            custom.unshift(updatedProduct);
            saveLocalCustomProducts(custom);
        }

        return { product: updatedProduct, syncedWithSupabase, error: dbError };
    }

    async deleteProduct(productId) {
        if (!supabase) initSupabase();
        let syncedWithSupabase = false;
        let dbError = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId)
                .select();

            if (!error && data && data.length > 0) {
                syncedWithSupabase = true;
            } else if (error) {
                dbError = error;
                console.warn("Supabase DELETE error:", error.message);
            }
        }

        // Всегда очищаем из локального кеша и помечаем удаленным, если RLS еще не настроен
        const custom = getLocalCustomProducts().filter(p => p.id !== productId);
        saveLocalCustomProducts(custom);

        if (!syncedWithSupabase) {
            const deleted = getDeletedProductIds();
            if (!deleted.includes(productId)) {
                deleted.push(productId);
                saveDeletedProductIds(deleted);
            }
        }

        return { syncedWithSupabase, error: dbError };
    }

    // --- Orders ---

    async createOrder(orderData) {
        if (!supabase) initSupabase();
        if (!supabase) {
            console.log("Simulating order:", orderData);
            return { error: null };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: { message: "Пожалуйста, войдите в систему" } };

        const { error } = await supabase.from('orders').insert({
            user_id: user.id,
            total: orderData.total,
            items: orderData.items,
            address_info: {
                name: orderData.name,
                address: orderData.address,
                phone: orderData.phone,
                email: orderData.email
            },
            status: 'в обработке'
        });

        return { error };
    }

    async getUserOrders() {
        if (!supabase) initSupabase();
        if (!supabase) return [];
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase.from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user orders:', error);
            return [];
        }
        return data || [];
    }

    async getAllOrders() {
        if (!supabase) initSupabase();
        if (!supabase) return [];

        const { data, error } = await supabase.from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all orders:', error);
            return [];
        }
        return data || [];
    }

    async updateOrderStatus(orderId, newStatus) {
        if (!supabase) initSupabase();
        if (!supabase) return { error: { message: 'Supabase not configured' } };

        const { error } = await supabase.from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        return { error };
    }

    // --- Favorites ---

    async getFavorites() {
        if (!supabase) initSupabase();
        if (!supabase) return JSON.parse(localStorage.getItem('favorites') || '[]');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return JSON.parse(localStorage.getItem('favorites') || '[]');

        const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
        if (error) {
            console.warn("Favorites fetch error (maybe table missing):", error);
            return JSON.parse(localStorage.getItem('favorites') || '[]');
        }
        return data.map(f => f.product_id);
    }

    async addFavorite(productId) {
        if (!supabase) initSupabase();
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (!favs.includes(productId)) {
            favs.push(productId);
            localStorage.setItem('favorites', JSON.stringify(favs));
        }

        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
        if (error) console.warn("Add favorite error:", error);
    }

    async removeFavorite(productId) {
        if (!supabase) initSupabase();
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        const newFavs = favs.filter(id => id !== productId);
        localStorage.setItem('favorites', JSON.stringify(newFavs));

        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
        if (error) console.warn("Remove favorite error:", error);
    }

    // --- Reviews & Questions ---

    getDefaultReviews(productId) {
        const seedReviews = {
            'gpu-1': [
                { id: 'rev-1', author: 'Алексей К.', rating: 5, pros: 'Тихая, холодная, тянет все в 4K на ультрах', cons: 'Большой размер, нужен просторный корпус', text: 'Карта просто пушка! В Cyberpunk 2077 с трассировкой и DLSS 3 выдает стабильные 100+ FPS.', date: '15.10.2026' },
                { id: 'rev-2', author: 'Данияр М.', rating: 5, pros: 'Отличное охлаждение, качественная сборка', cons: 'Не обнаружил', text: 'Перешел с RTX 3070, разница колоссальная. Доставили по Бишкеку за 2 часа!', date: '02.11.2026' }
            ],
            'cpu-1': [
                { id: 'rev-3', author: 'Тимур Б.', rating: 5, pros: '16 ядер, невероятная скорость рендера и компиляции', cons: 'Нужна хорошая водянка (СЖО 360мм)', text: 'Лучший процессор для работы и игр одновременно. В паре с DDR5 6000MHz летает.', date: '20.10.2026' }
            ]
        };

        return seedReviews[productId] || [
            { id: `seed-${productId}-1`, author: 'Бекзат А.', rating: 5, pros: 'Отличное соотношение цены и качества, оригинал с гарантией', cons: 'Нет', text: 'Заказывал в Volt Tech для новой сборки ПК. Работает стабильно, температуры в норме, покупкой полностью доволен!', date: '28.10.2026' },
            { id: `seed-${productId}-2`, author: 'Дмитрий В.', rating: 4, pros: 'Быстрая доставка, высокая производительность', cons: 'Коробка была слегка помята сбоку', text: 'Комплектующее отличное, завелось с пол-оборота без танцев с бубном. Рекомендую магазин.', date: '04.11.2026' }
        ];
    }

    async getProductReviews(productId) {
        const allSaved = JSON.parse(localStorage.getItem('tech_store_reviews') || '{}');
        if (!allSaved[productId]) {
            allSaved[productId] = this.getDefaultReviews(productId);
            localStorage.setItem('tech_store_reviews', JSON.stringify(allSaved));
        }
        return allSaved[productId];
    }

    async addProductReview(productId, reviewData) {
        const allSaved = JSON.parse(localStorage.getItem('tech_store_reviews') || '{}');
        const list = allSaved[productId] || this.getDefaultReviews(productId);

        const newReview = {
            id: `rev-${Date.now()}`,
            author: reviewData.author || 'Покупатель',
            rating: Number(reviewData.rating) || 5,
            pros: reviewData.pros || 'Отличный товар',
            cons: reviewData.cons || 'Не обнаружено',
            text: reviewData.text || '',
            date: new Date().toLocaleDateString('ru-RU')
        };

        list.unshift(newReview);
        allSaved[productId] = list;
        localStorage.setItem('tech_store_reviews', JSON.stringify(allSaved));
        return newReview;
    }

    async deleteProductReview(productId, reviewId) {
        const allSaved = JSON.parse(localStorage.getItem('tech_store_reviews') || '{}');
        if (allSaved[productId]) {
            allSaved[productId] = allSaved[productId].filter(r => r.id !== reviewId);
            localStorage.setItem('tech_store_reviews', JSON.stringify(allSaved));
        }
    }

    getDefaultQuestions(productId) {
        return [
            {
                id: `q-seed-${productId}-1`,
                author: 'Эрмек',
                question: 'Подскажите, официальная ли гарантия и есть ли товар в наличии в Бишкеке?',
                answer: 'Здравствуйте! Да, товар в наличии на нашем складе в Бишкеке. Предоставляется официальная гарантия 12 месяцев по чеку.',
                date: '25.10.2026'
            },
            {
                id: `q-seed-${productId}-2`,
                author: 'Максим',
                question: 'Поможете подобрать совместимые комплектующие к этой модели?',
                answer: 'Конечно! Вы можете воспользоваться нашим умным Конструктором ПК в разделе «Сборки» — он автоматически проверит совместимость по сокету и питанию.',
                date: '01.11.2026'
            }
        ];
    }

    async getProductQuestions(productId) {
        const allQ = JSON.parse(localStorage.getItem('tech_store_questions') || '{}');
        if (!allQ[productId]) {
            allQ[productId] = this.getDefaultQuestions(productId);
            localStorage.setItem('tech_store_questions', JSON.stringify(allQ));
        }
        return allQ[productId];
    }

    async addProductQuestion(productId, author, questionText) {
        const allQ = JSON.parse(localStorage.getItem('tech_store_questions') || '{}');
        const list = allQ[productId] || this.getDefaultQuestions(productId);

        const newQ = {
            id: `q-${Date.now()}`,
            author: author || 'Гость',
            question: questionText,
            answer: null,
            date: new Date().toLocaleDateString('ru-RU')
        };

        list.unshift(newQ);
        allQ[productId] = list;
        localStorage.setItem('tech_store_questions', JSON.stringify(allQ));
        return newQ;
    }

    async answerProductQuestion(productId, questionId, answerText) {
        const allQ = JSON.parse(localStorage.getItem('tech_store_questions') || '{}');
        const list = allQ[productId] || [];
        const item = list.find(q => q.id === questionId);
        if (item) {
            item.answer = answerText;
            localStorage.setItem('tech_store_questions', JSON.stringify(allQ));
        }
        return item;
    }

    // --- Promo Codes & Discounts (Supabase таблица promo_codes + резервный кеш) ---

    getDefaultPromoCodes() {
        return [
            { code: 'VOLT10', type: 'percent', value: 10, minOrder: 0, description: 'Скидка 10% на любой заказ' },
            { code: 'GAMER15', type: 'percent', value: 15, minOrder: 1000, description: 'Скидка 15% при заказе от 1000 сом' },
            { code: 'CYBER20', type: 'percent', value: 20, minOrder: 2500, description: 'Кибер-скидка 20% от 2500 сом' },
            { code: 'START200', type: 'fixed', value: 200, minOrder: 500, description: 'Скидка 200 сом на первую покупку' }
        ];
    }

    getLocalPromoCodes() {
        const saved = localStorage.getItem('tech_store_promocodes');
        if (!saved) {
            const defaults = this.getDefaultPromoCodes();
            localStorage.setItem('tech_store_promocodes', JSON.stringify(defaults));
            return defaults;
        }
        try {
            return JSON.parse(saved);
        } catch {
            return this.getDefaultPromoCodes();
        }
    }

    async getPromoCodes() {
        if (!supabase) initSupabase();
        if (supabase) {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map(row => ({
                    code: row.code,
                    type: row.type,
                    value: Number(row.value),
                    minOrder: Number(row.min_order || 0),
                    description: row.description || ''
                }));
                localStorage.setItem('tech_store_promocodes', JSON.stringify(mapped));
                return mapped;
            }
        }
        return this.getLocalPromoCodes();
    }

    async addPromoCode(promo) {
        if (!supabase) initSupabase();
        const newPromo = {
            code: promo.code.trim().toUpperCase(),
            type: promo.type || 'percent',
            value: Number(promo.value),
            minOrder: Number(promo.minOrder) || 0,
            description: promo.description || ''
        };

        let syncedWithSupabase = false;
        if (supabase) {
            const { data, error } = await supabase
                .from('promo_codes')
                .upsert({
                    code: newPromo.code,
                    type: newPromo.type,
                    value: newPromo.value,
                    min_order: newPromo.minOrder,
                    description: newPromo.description
                })
                .select();

            if (!error && data && data.length > 0) {
                syncedWithSupabase = true;
            } else if (error) {
                console.warn('Supabase promo_codes insert warning:', error.message);
            }
        }

        const list = this.getLocalPromoCodes().filter(p => p.code.toUpperCase() !== newPromo.code);
        list.unshift(newPromo);
        localStorage.setItem('tech_store_promocodes', JSON.stringify(list));

        return { promo: newPromo, syncedWithSupabase };
    }

    async deletePromoCode(code) {
        if (!supabase) initSupabase();
        const normalized = code.trim().toUpperCase();
        let syncedWithSupabase = false;

        if (supabase) {
            const { data, error } = await supabase
                .from('promo_codes')
                .delete()
                .eq('code', normalized)
                .select();

            if (!error && data && data.length > 0) {
                syncedWithSupabase = true;
            } else if (error) {
                console.warn('Supabase promo_codes delete warning:', error.message);
            }
        }

        const list = this.getLocalPromoCodes().filter(p => p.code.toUpperCase() !== normalized);
        localStorage.setItem('tech_store_promocodes', JSON.stringify(list));
        return { syncedWithSupabase };
    }

    async validatePromoCode(code, subtotal) {
        if (!code || !code.trim()) {
            return { valid: false, message: 'Введите промокод' };
        }
        const normalized = code.trim().toUpperCase();
        const promos = await this.getPromoCodes();
        const found = promos.find(p => p.code.toUpperCase() === normalized);

        if (!found) {
            return { valid: false, message: 'Промокод не найден или истёк' };
        }

        if (subtotal < found.minOrder) {
            return {
                valid: false,
                message: `Для промокода ${found.code} минимальная сумма заказа — ${found.minOrder} сом`
            };
        }

        let discountAmount = 0;
        if (found.type === 'percent') {
            discountAmount = (subtotal * found.value) / 100;
        } else {
            discountAmount = Math.min(found.value, subtotal);
        }

        return {
            valid: true,
            promo: found,
            discountAmount: Number(discountAmount.toFixed(2)),
            message: `Промокод ${found.code} применён! (${found.description})`
        };
    }

    mapCategoryToGroupId(id) {
        const map = {
            'gpu': 'Видеокарты',
            'cpu': 'Процессоры',
            'mobo': 'Материнские платы',
            'ram': 'Память',
            'storage': 'Накопители',
            'psu': 'Блоки питания'
        };
        return map[id] || id;
    }
}

export const api = new ApiService();
