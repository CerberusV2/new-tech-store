// Слайдер / Карусель промо-баннеров для главной страницы

let sliderStylesInjected = false;

function injectSliderStyles() {
    if (sliderStylesInjected) return;
    sliderStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .promo-slider-section {
            padding: 1rem 0 3rem;
        }

        .promo-slider {
            position: relative;
            width: 100%;
            height: 380px;
            border-radius: var(--radius-lg, 20px);
            overflow: hidden;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            background: var(--bg-secondary, #161925);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        }

        .promo-slides-track {
            display: flex;
            width: 100%;
            height: 100%;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .promo-slide {
            min-width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 3rem 4.5rem;
            position: relative;
            overflow: hidden;
            gap: 2rem;
        }

        .promo-slide-content {
            max-width: 580px;
            z-index: 2;
        }

        .promo-slide-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: rgba(0, 240, 255, 0.15);
            color: var(--accent-primary, #00f0ff);
            border: 1px solid rgba(0, 240, 255, 0.3);
        }

        .promo-slide h2 {
            font-size: 2.4rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 1rem;
            color: #ffffff;
        }

        .promo-slide p {
            font-size: 1.05rem;
            color: var(--text-secondary, #a0a0a0);
            margin-bottom: 1.75rem;
            line-height: 1.6;
        }

        .promo-slide-visual {
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .promo-slide-visual img {
            max-height: 240px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 0 25px rgba(0, 240, 255, 0.3));
            transition: transform 0.5s ease;
        }

        .promo-slide:hover .promo-slide-visual img {
            transform: scale(1.06) rotate(-2deg);
        }

        .slider-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(11, 13, 20, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            font-size: 1.2rem;
            cursor: pointer;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s ease;
            backdrop-filter: blur(8px);
        }

        .slider-arrow:hover {
            background: var(--accent-primary, #00f0ff);
            color: #000000;
            border-color: var(--accent-primary, #00f0ff);
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }

        .slider-arrow.prev {
            left: 16px;
        }

        .slider-arrow.next {
            right: 16px;
        }

        .slider-dots {
            position: absolute;
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 5;
        }

        .slider-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.25);
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0;
        }

        .slider-dot.active {
            width: 28px;
            border-radius: 10px;
            background: var(--accent-primary, #00f0ff);
            box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }

        @media (max-width: 768px) {
            .promo-slider {
                height: auto;
                min-height: 420px;
            }
            .promo-slide {
                flex-direction: column-reverse;
                text-align: center;
                padding: 2.5rem 1.5rem 3.5rem;
                justify-content: center;
            }
            .promo-slide h2 {
                font-size: 1.65rem;
            }
            .promo-slide-visual img {
                max-height: 130px;
            }
            .slider-arrow {
                width: 36px;
                height: 36px;
                font-size: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
}

const slidesData = [
    {
        badge: '🔥 Новинки сезона',
        title: 'Видеокарты NVIDIA RTX 4000 серии уже в наличии!',
        desc: 'Максимальный FPS в 4K, трассировка лучей и DLSS 3. Обновите свою игровую станцию уже сегодня.',
        btnText: 'Смотреть каталог',
        btnLink: 'catalog.html?category=gpu',
        image: 'img/builder-gpu.svg',
        gradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.16) 0%, rgba(22, 25, 37, 0.95) 60%, rgba(255, 0, 110, 0.12) 100%)'
    },
    {
        badge: '💻 Конструктор ПК',
        title: 'Собери ПК своей мечты с умной проверкой',
        desc: 'Автоматическая проверка совместимости сокетов, памяти и расчет мощности блока питания в реальном времени.',
        btnText: 'Собрать ПК',
        btnLink: 'builds.html',
        image: 'img/builder-mobo.svg',
        gradient: 'linear-gradient(135deg, rgba(255, 0, 110, 0.16) 0%, rgba(22, 25, 37, 0.95) 60%, rgba(0, 240, 255, 0.14) 100%)'
    },
    {
        badge: '🚀 Спецпредложение',
        title: 'Бесплатная экспресс-доставка по Кыргызстану',
        desc: 'При заказе от 10 000 сом мы доставим ваши комплектующие бесплатно прямо до двери в день заказа!',
        btnText: 'Перейти к покупкам',
        btnLink: 'catalog.html',
        image: 'img/feature-delivery.png',
        gradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.18) 0%, rgba(22, 25, 37, 0.95) 60%, rgba(0, 255, 128, 0.14) 100%)'
    }
];

export function initSlider(containerId = 'promo-slider-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    injectSliderStyles();

    let currentIndex = 0;
    let intervalId = null;

    container.innerHTML = `
        <div class="promo-slider" id="promo-slider">
            <div class="promo-slides-track" id="promo-slides-track">
                ${slidesData.map(slide => `
                    <div class="promo-slide" style="background: ${slide.gradient};">
                        <div class="promo-slide-content">
                            <span class="promo-slide-badge">${slide.badge}</span>
                            <h2>${slide.title}</h2>
                            <p>${slide.desc}</p>
                            <a href="${slide.btnLink}" class="btn btn-primary">${slide.btnText}</a>
                        </div>
                        <div class="promo-slide-visual">
                            <img src="${slide.image}" alt="${slide.title}">
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="slider-arrow prev" id="slider-prev" aria-label="Предыдущий слайд">❮</button>
            <button class="slider-arrow next" id="slider-next" aria-label="Следующий слайд">❯</button>
            <div class="slider-dots" id="slider-dots">
                ${slidesData.map((_, idx) => `
                    <button class="slider-dot ${idx === 0 ? 'active' : ''}" data-slide="${idx}" aria-label="Слайд ${idx + 1}"></button>
                `).join('')}
            </div>
        </div>
    `;

    const track = document.getElementById('promo-slides-track');
    const dots = container.querySelectorAll('.slider-dot');
    const sliderEl = document.getElementById('promo-slider');

    function goToSlide(index) {
        currentIndex = (index + slidesData.length) % slidesData.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentIndex);
        });
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    function startAutoPlay() {
        stopAutoPlay();
        intervalId = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    document.getElementById('slider-next').addEventListener('click', () => {
        nextSlide();
        startAutoPlay();
    });

    document.getElementById('slider-prev').addEventListener('click', () => {
        prevSlide();
        startAutoPlay();
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.getAttribute('data-slide'), 10);
            goToSlide(idx);
            startAutoPlay();
        });
    });

    sliderEl.addEventListener('mouseenter', stopAutoPlay);
    sliderEl.addEventListener('mouseleave', startAutoPlay);

    startAutoPlay();
}
