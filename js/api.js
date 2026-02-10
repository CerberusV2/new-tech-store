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

class ApiService {
    constructor() {
        this.products = [...initialProducts];
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
            // Debug: Log session
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
        if (!supabase) return { error: { message: "Supabase not configured" } };
        // Use 'full_name' which Supabase often uses for display
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

    async signOut() {
        if (supabase) await supabase.auth.signOut();
    }

    // --- Roles ---

    async getUserRole() {
        if (!supabase) return 'user';
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        if (error || !data) return 'user'; // По умолчанию обычный пользователь
        return data.role;
    }

    // --- Data ---

    async getProducts(category = 'all') {
        if (supabase) {
            let query = supabase.from('products').select('*');
            if (category !== 'all') {
                query = query.eq('category', category);
            }
            const { data, error } = await query;
            if (!error && data && data.length > 0) return data;
        }

        // Fallback
        await new Promise(r => setTimeout(r, 300));
        if (category === 'all' || !category) return this.products;
        return this.products.filter(p => p.category === category || this.mapCategoryToGroupId(category) === p.category);
    }

    async getProductById(id) {
        if (supabase) {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (!error && data) return data;
        }
        await new Promise(r => setTimeout(r, 200));
        return this.products.find(p => p.id === id);
    }

    // --- Orders ---

    async createOrder(orderData) {
        // orderData: { items, total, address, name, phone, email }
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
        if (!supabase) return { error: { message: 'Supabase not configured' } };

        const { error } = await supabase.from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        return { error };
    }

    // --- Favorites ---

    async getFavorites() {
        if (!supabase) return [];
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
        if (error) {
            console.warn("Favorites fetch error (maybe table missing):", error);
            return JSON.parse(localStorage.getItem('favorites') || '[]');
        }
        return data.map(f => f.product_id);
    }

    async addFavorite(productId) {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Local storage fallback for guests? Or just deny? 
            // Logic: Guest favorites in local storage
            const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
            if (!favs.includes(productId)) {
                favs.push(productId);
                localStorage.setItem('favorites', JSON.stringify(favs));
            }
            return;
        }

        const { error } = await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
        if (error) console.warn("Add favorite error:", error);
    }

    async removeFavorite(productId) {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
            const newFavs = favs.filter(id => id !== productId);
            localStorage.setItem('favorites', JSON.stringify(newFavs));
            return;
        }

        const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
        if (error) console.warn("Remove favorite error:", error);
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
