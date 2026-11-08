import { api } from './api.js';
import { categories } from './data.js';
import { showToast } from './toast.js';
import { initScrollAnimations, injectAnimationStyles } from './animations.js';
import { validateForm, validateRequired, validateMinLength, clearFieldErrors } from './validation.js';

injectAnimationStyles();

const specLabels = {
    wattage: 'Энергопотребление',
    performance_score: 'Индекс производительности',
    socket: 'Сокет',
    type: 'Тип памяти'
};

let currentProduct = null;
let currentFavorites = [];
let currentReviews = [];
let currentQuestions = [];
let isAdminUser = false;
let currentUser = null;

function formatSpecValue(key, value) {
    if (key === 'wattage') return `${value} Вт`;
    if (key === 'performance_score') return `${value} / 100`;
    return value;
}

function getCategoryName(categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}

function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function getCart() {
    return JSON.parse(localStorage.getItem('tech_store_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('tech_store_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.innerText = count;
    }
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    updateCartBadge();
    showToast(`«${product.name}» добавлен в корзину`, 'success');
}

function renderStarsString(rating) {
    const rounded = Math.round(rating);
    return '★'.repeat(rounded) + '☆'.repeat(Math.max(0, 5 - rounded));
}

function getAverageRating() {
    if (currentReviews.length === 0) return 5.0;
    const sum = currentReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / currentReviews.length);
}

function renderBreadcrumbs(product) {
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (!breadcrumbs) return;

    const categoryName = getCategoryName(product.category);

    breadcrumbs.innerHTML = `
        <a href="index.html">Главная</a>
        <span class="breadcrumb-separator">›</span>
        <a href="catalog.html">Каталог</a>
        <span class="breadcrumb-separator">›</span>
        <a href="catalog.html?category=${product.category}">${categoryName}</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">${product.name}</span>
    `;
}

function renderSpecsTable(specs) {
    if (!specs || Object.keys(specs).length === 0) return '';

    // Начитка полей хар-к кроме служебного old_price
    const entries = Object.entries(specs).filter(([k]) => k !== 'old_price');
    if (entries.length === 0) return '';

    const rows = entries.map(([key, value]) => {
        const label = specLabels[key] || key;
        const formattedValue = formatSpecValue(key, value);
        return `
            <tr>
                <td>${label}</td>
                <td>${formattedValue}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="product-detail-specs-title">Технические характеристики</div>
        <table class="product-detail-specs">
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function renderProductDetail(product, isFavorite, isAdmin = false) {
    const container = document.getElementById('product-detail');
    if (!container) return;

    const categoryName = getCategoryName(product.category);
    const specsHtml = renderSpecsTable(product.specs);
    const favClass = isFavorite ? 'active' : '';
    const favIcon = isFavorite ? '❤️' : '♡';
    const favText = isFavorite ? 'В избранном' : 'В избранное';

    const avgRating = getAverageRating();
    const hasDiscount = product.oldPrice && product.discountPercent > 0;

    const actionsHtml = isAdmin
        ? `<div class="product-detail-actions">
               <a href="orders.html" class="btn btn-outline">🛠️ Управление в панели админа</a>
           </div>`
        : `<div class="product-detail-actions">
               <button class="btn btn-primary" id="add-to-cart-btn">В корзину</button>
               <button class="btn-favorite ${favClass}" id="toggle-favorite-btn">
                   <span id="fav-icon">${favIcon}</span> <span id="fav-text">${favText}</span>
               </button>
           </div>`;

    container.innerHTML = `
        <div class="product-detail-container">
            <div class="product-detail-image-wrapper">
                ${hasDiscount ? `<span class="discount-badge" style="font-size: 0.9rem; padding: 6px 14px; top: 16px; left: 16px;">-${product.discountPercent}% СКИДКА</span>` : ''}
                <img
                    src="${product.image}"
                    alt="${product.name}"
                    class="product-detail-image"
                    onerror="this.src='https://placehold.co/400x400?text=No+Image'"
                >
            </div>
            <div class="product-detail-info">
                <div class="product-detail-category">${categoryName}</div>
                <h1 class="product-detail-title">${product.name}</h1>

                <div class="product-inline-rating" onclick="document.getElementById('product-feedback-section').scrollIntoView({behavior: 'smooth'})">
                    <span class="inline-stars">${renderStarsString(avgRating)}</span>
                    <span class="inline-rating-val">${avgRating.toFixed(1)}</span>
                    <span class="inline-rating-count" id="inline-reviews-count">(${currentReviews.length} отзывов • ${currentQuestions.length} вопр.)</span>
                </div>

                <p class="product-detail-desc">${product.description}</p>
                ${specsHtml}
                <div style="margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap;">
                    <div class="product-detail-price" style="margin-bottom: 0; ${hasDiscount ? 'color: #00ff80;' : ''}">${product.price} сом</div>
                    ${hasDiscount ? `<div style="font-size: 1.3rem; color: var(--text-muted); text-decoration: line-through; font-weight: 600;">${product.oldPrice} сом</div>` : ''}
                </div>
                ${actionsHtml}
            </div>
        </div>
    `;

    document.title = `Volt Tech - ${product.name}`;

    if (!isAdmin) {
        document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
            addToCart(product);
        });

        document.getElementById('toggle-favorite-btn')?.addEventListener('click', async () => {
            await handleToggleFavorite(product.id);
        });
    }
}

async function loadFavorites() {
    try {
        currentFavorites = await api.getFavorites();
    } catch {
        currentFavorites = [];
    }
}

function isFavorite(productId) {
    return currentFavorites.includes(productId);
}

async function handleToggleFavorite(productId) {
    const btn = document.getElementById('toggle-favorite-btn');
    const icon = document.getElementById('fav-icon');
    const text = document.getElementById('fav-text');

    if (isFavorite(productId)) {
        await api.removeFavorite(productId);
        currentFavorites = currentFavorites.filter(id => id !== productId);
        btn.classList.remove('active');
        icon.textContent = '♡';
        text.textContent = 'В избранное';
        showToast('Удалено из избранного', 'info');
    } else {
        await api.addFavorite(productId);
        currentFavorites.push(productId);
        btn.classList.add('active');
        icon.textContent = '❤️';
        text.textContent = 'В избранном';
        showToast('Добавлено в избранное ❤️', 'success');
    }
}

// ================= ОТЗЫВЫ И ВОПРОСЫ =================

window.switchFeedbackTab = (tab) => {
    const revTab = document.getElementById('feedback-tab-reviews');
    const qTab = document.getElementById('feedback-tab-questions');
    const revBtn = document.getElementById('tab-btn-reviews');
    const qBtn = document.getElementById('tab-btn-questions');

    if (tab === 'questions') {
        revTab.style.display = 'none';
        qTab.style.display = 'block';
        revBtn.classList.remove('active');
        qBtn.classList.add('active');
    } else {
        revTab.style.display = 'block';
        qTab.style.display = 'none';
        revBtn.classList.add('active');
        qBtn.classList.remove('active');
    }
};

function renderFeedbackSection() {
    const section = document.getElementById('product-feedback-section');
    if (!section) return;
    section.style.display = 'block';

    // Скрываем покупательские формы добавления отзыва/вопроса для админа
    if (isAdminUser) {
        const addRevBox = document.getElementById('add-review-box');
        const askQBox = document.getElementById('ask-question-box');
        if (addRevBox) addRevBox.style.display = 'none';
        if (askQBox) {
            askQBox.innerHTML = `
                <h3 style="margin-bottom: 0.5rem;">🛠️ Режим модерации</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    Вы вошли как администратор. Вы можете удалять некорректные отзывы и публиковать официальные ответы на вопросы покупателей справа.
                </p>
            `;
        }
    } else if (currentUser) {
        const userName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.username || currentUser.email.split('@')[0];
        const revAuthor = document.getElementById('review-author');
        const qAuthor = document.getElementById('question-author');
        if (revAuthor && !revAuthor.value) revAuthor.value = userName;
        if (qAuthor && !qAuthor.value) qAuthor.value = userName;
    }

    renderReviews();
    renderQuestions();
}

function renderReviews() {
    const countBadge = document.getElementById('reviews-count-badge');
    const summaryBox = document.getElementById('rating-summary-box');
    const listEl = document.getElementById('reviews-list');
    const inlineCount = document.getElementById('inline-reviews-count');

    if (countBadge) countBadge.textContent = currentReviews.length;
    if (inlineCount) inlineCount.textContent = `(${currentReviews.length} отзывов • ${currentQuestions.length} вопр.)`;

    const avg = getAverageRating();
    const total = currentReviews.length || 1;

    // Распределение оценок 5..1
    const dist = [5, 4, 3, 2, 1].map(star => {
        const count = currentReviews.filter(r => Math.round(r.rating) === star).length;
        const pct = Math.round((count / total) * 100);
        return { star, count, pct };
    });

    if (summaryBox) {
        summaryBox.innerHTML = `
            <div class="rating-big-row">
                <div class="rating-big-number">${avg.toFixed(1)}</div>
                <div>
                    <div class="rating-big-stars">${renderStarsString(avg)}</div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px;">На основе ${currentReviews.length} оценок</div>
                </div>
            </div>
            <div>
                ${dist.map(d => `
                    <div class="rating-bar-row">
                        <span style="width: 28px;">${d.star} ★</span>
                        <div class="rating-bar-track">
                            <div class="rating-bar-fill" style="width: ${d.pct}%;"></div>
                        </div>
                        <span style="width: 24px; text-align: right;">${d.count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (!listEl) return;

    if (currentReviews.length === 0) {
        listEl.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3>Пока нет отзывов</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">Станьте первым, кто поделится мнением об этом товаре!</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = currentReviews.map(rev => {
        const initial = (rev.author || 'П').charAt(0).toUpperCase();
        return `
            <div class="glass-panel review-card">
                <div class="review-card-header">
                    <div class="review-author-wrap">
                        <div class="review-avatar">${initial}</div>
                        <div>
                            <div style="font-weight: 700;">${rev.author}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${rev.date} • Реальный покупатель</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="review-stars">${renderStarsString(rev.rating)}</div>
                        ${isAdminUser ? `<button class="btn btn-sm btn-outline" style="padding: 4px 10px; color: #ff4d88; border-color: rgba(255,0,85,0.3);" onclick="window.deleteReview('${rev.id}')">🗑️ Удалить</button>` : ''}
                    </div>
                </div>

                <div class="review-pros-cons">
                    <div class="pros-box">
                        <div style="font-weight: 700; color: #00ff80; margin-bottom: 3px;">➕ Достоинства</div>
                        <div>${rev.pros || 'Отличное качество'}</div>
                    </div>
                    <div class="cons-box">
                        <div style="font-weight: 700; color: #ff4d88; margin-bottom: 3px;">➖ Недостатки</div>
                        <div>${rev.cons || 'Не обнаружено'}</div>
                    </div>
                </div>

                <p style="color: var(--text-primary); line-height: 1.6;">${rev.text}</p>
            </div>
        `;
    }).join('');
}

window.deleteReview = async (reviewId) => {
    await api.deleteProductReview(currentProduct.id, reviewId);
    currentReviews = await api.getProductReviews(currentProduct.id);
    renderReviews();
    showToast('Отзыв удален модератором', 'info');
};

function renderQuestions() {
    const countBadge = document.getElementById('questions-count-badge');
    const listEl = document.getElementById('questions-list');

    if (countBadge) countBadge.textContent = currentQuestions.length;
    if (!listEl) return;

    if (currentQuestions.length === 0) {
        listEl.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3>Вопросов пока нет</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">Задайте свой вопрос первым — мы быстро ответим!</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = currentQuestions.map(q => {
        const initial = (q.author || 'Г').charAt(0).toUpperCase();
        let answerBlock = '';

        if (q.answer) {
            answerBlock = `
                <div class="question-answer-box">
                    <div style="font-weight: 700; color: var(--accent-primary); margin-bottom: 4px; font-size: 0.9rem;">
                        ⚡ Официальный ответ Volt Tech
                    </div>
                    <div style="color: var(--text-primary); font-size: 0.95rem;">${q.answer}</div>
                </div>
            `;
        } else if (isAdminUser) {
            answerBlock = `
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <input type="text" id="ans-input-${q.id}" class="form-input" placeholder="Напишите официальный ответ магазина..." style="padding: 8px 12px;">
                    <button class="btn btn-primary btn-sm" onclick="window.submitQuestionAnswer('${q.id}')">Ответить</button>
                </div>
            `;
        } else {
            answerBlock = `
                <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">
                    ⏳ Ожидает ответа специалиста Volt Tech...
                </div>
            `;
        }

        return `
            <div class="glass-panel question-card">
                <div class="review-card-header" style="margin-bottom: 0.75rem;">
                    <div class="review-author-wrap">
                        <div class="review-avatar">${initial}</div>
                        <div>
                            <div style="font-weight: 700;">${q.author}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${q.date}</div>
                        </div>
                    </div>
                </div>
                <div style="font-weight: 600; font-size: 1.05rem;">❓ ${q.question}</div>
                ${answerBlock}
            </div>
        `;
    }).join('');
}

window.submitQuestionAnswer = async (questionId) => {
    const input = document.getElementById(`ans-input-${questionId}`);
    if (!input || !input.value.trim()) {
        showToast('Введите текст ответа', 'warning');
        return;
    }
    await api.answerProductQuestion(currentProduct.id, questionId, input.value.trim());
    currentQuestions = await api.getProductQuestions(currentProduct.id);
    renderQuestions();
    showToast('Ответ опубликован!', 'success');
};

function setupFeedbackForms() {
    // Интерактивный выбор звезд
    const starBtns = document.querySelectorAll('.star-pick-btn');
    const ratingInput = document.getElementById('review-rating');
    const starLabel = document.getElementById('star-pick-label');

    starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = Number(btn.getAttribute('data-val'));
            ratingInput.value = val;
            if (starLabel) starLabel.textContent = `${val} из 5`;
            starBtns.forEach(b => {
                b.classList.toggle('active', Number(b.getAttribute('data-val')) <= val);
            });
        });
    });

    // Форма отзыва
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const authorInput = document.getElementById('review-author');
            const prosInput = document.getElementById('review-pros');
            const consInput = document.getElementById('review-cons');
            const textInput = document.getElementById('review-text');

            const { valid } = validateForm([
                { input: authorInput, validators: [(v) => validateRequired(v, 'Ваше имя')] },
                { input: textInput, validators: [(v) => validateRequired(v, 'Комментарий'), (v) => validateMinLength(v, 5, 'Комментарий')] }
            ]);

            if (!valid) {
                showToast('Пожалуйста, заполните обязательные поля отзыва', 'error');
                return;
            }

            await api.addProductReview(currentProduct.id, {
                author: authorInput.value.trim(),
                rating: Number(ratingInput.value),
                pros: prosInput.value.trim() || 'Отличное качество',
                cons: consInput.value.trim() || 'Не обнаружено',
                text: textInput.value.trim()
            });

            currentReviews = await api.getProductReviews(currentProduct.id);
            clearFieldErrors(reviewForm);
            prosInput.value = '';
            consInput.value = '';
            textInput.value = '';
            renderProductDetail(currentProduct, isFavorite(currentProduct.id), isAdminUser);
            renderReviews();
            showToast('Спасибо! Ваш отзыв опубликован ⭐', 'success');
        });
    }

    // Форма вопроса
    const questionForm = document.getElementById('question-form');
    if (questionForm) {
        questionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const authorInput = document.getElementById('question-author');
            const textInput = document.getElementById('question-text');

            const { valid } = validateForm([
                { input: authorInput, validators: [(v) => validateRequired(v, 'Ваше имя')] },
                { input: textInput, validators: [(v) => validateRequired(v, 'Текст вопроса'), (v) => validateMinLength(v, 5, 'Текст вопроса')] }
            ]);

            if (!valid) {
                showToast('Заполните имя и текст вопроса', 'error');
                return;
            }

            await api.addProductQuestion(currentProduct.id, authorInput.value.trim(), textInput.value.trim());
            currentQuestions = await api.getProductQuestions(currentProduct.id);
            clearFieldErrors(questionForm);
            textInput.value = '';
            renderQuestions();
            showToast('Ваш вопрос отправлен!', 'success');
        });
    }
}

function renderRelatedProducts(products, currentProductId) {
    const related = products
        .filter(p => p.id !== currentProductId)
        .slice(0, 4);

    if (related.length === 0) return;

    const section = document.getElementById('related-products');
    const grid = document.getElementById('related-grid');
    if (!section || !grid) return;

    section.style.display = 'block';

    grid.innerHTML = related.map(product => {
        const categoryName = getCategoryName(product.category);
        const hasDiscount = product.oldPrice && product.discountPercent > 0;
        return `
            <div class="product-card scroll-animate" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">
                <div class="product-image-container">
                    ${hasDiscount ? `<span class="discount-badge">-${product.discountPercent}% СКИДКА</span>` : ''}
                    <img
                        src="${product.image}"
                        alt="${product.name}"
                        class="product-image"
                        onerror="this.src='https://placehold.co/300x200?text=No+Image'"
                    >
                </div>
                <div class="product-info">
                    <div class="product-category">${categoryName}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-footer">
                        <div class="product-price-block">
                            ${hasDiscount ? `<span class="old-price">${product.oldPrice} сом</span>` : ''}
                            <div class="product-price ${hasDiscount ? 'discounted' : ''}">${product.price} сом</div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.location.href='product.html?id=${product.id}'">Подробнее</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showNotFound() {
    const container = document.getElementById('product-detail');
    if (!container) return;

    container.innerHTML = `
        <div class="product-not-found">
            <h2>Товар не найден</h2>
            <p>К сожалению, запрашиваемый товар не найден. Возможно, он был удалён или ссылка некорректна.</p>
            <a href="catalog.html" class="btn btn-primary">Перейти в каталог</a>
        </div>
    `;

    document.title = 'Volt Tech - Товар не найден';
    const related = document.getElementById('related-products');
    if (related) related.style.display = 'none';
}

async function initProductPage() {
    const productId = getProductId();

    if (!productId) {
        showNotFound();
        return;
    }

    try {
        const [product, role, sessionRes, reviews, questions] = await Promise.all([
            api.getProductById(productId),
            api.getUserRole(),
            api.getSession(),
            api.getProductReviews(productId),
            api.getProductQuestions(productId),
            loadFavorites()
        ]);

        if (!product) {
            showNotFound();
            return;
        }

        currentProduct = product;
        currentUser = sessionRes?.data?.session?.user || JSON.parse(localStorage.getItem('cached_user'));
        isAdminUser = role === 'admin' || localStorage.getItem('cached_role') === 'admin';
        currentReviews = reviews || [];
        currentQuestions = questions || [];

        renderBreadcrumbs(product);
        renderProductDetail(product, isFavorite(product.id), isAdminUser);
        renderFeedbackSection();
        setupFeedbackForms();

        const relatedProducts = await api.getProducts(product.category);
        renderRelatedProducts(relatedProducts, product.id);
        initScrollAnimations();

    } catch (error) {
        console.error('Error loading product:', error);
        showNotFound();
    }
}

initProductPage();
