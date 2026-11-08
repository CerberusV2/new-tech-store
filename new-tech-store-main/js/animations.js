// Анимации загрузки (Skeleton Loaders) и анимации появления при скролле (Intersection Observer)

let animStylesInjected = false;

export function injectAnimationStyles() {
    if (animStylesInjected) return;
    animStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        /* Skeleton Loader Styles */
        @keyframes skeletonPulse {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        .skeleton-card {
            background: var(--bg-secondary, #161925);
            border-radius: var(--radius-md, 12px);
            overflow: hidden;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            display: flex;
            flex-direction: column;
            min-height: 360px;
        }

        .skeleton-shimmer {
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.03) 25%,
                rgba(0, 240, 255, 0.08) 50%,
                rgba(255, 255, 255, 0.03) 75%
            );
            background-size: 200% 100%;
            animation: skeletonPulse 1.6s infinite linear;
        }

        .skeleton-image {
            height: 200px;
            width: 100%;
        }

        .skeleton-info {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex-grow: 1;
        }

        .skeleton-line {
            height: 14px;
            border-radius: 6px;
        }

        .skeleton-line.short {
            width: 35%;
            height: 12px;
        }

        .skeleton-line.medium {
            width: 75%;
            height: 18px;
        }

        .skeleton-line.long {
            width: 95%;
        }

        .skeleton-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: auto;
            padding-top: 12px;
        }

        .skeleton-price {
            width: 80px;
            height: 22px;
            border-radius: 6px;
        }

        .skeleton-btn {
            width: 100px;
            height: 36px;
            border-radius: 10px;
        }

        /* Scroll Appear Animations */
        .scroll-animate {
            opacity: 0;
            transform: translateY(28px);
            transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: opacity, transform;
        }

        .scroll-animate.animate-in {
            opacity: 1;
            transform: translateY(0);
        }

        /* Spinner loader */
        .loading-spinner-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            gap: 1rem;
            color: var(--text-secondary, #a0a0a0);
        }

        .loading-spinner {
            width: 42px;
            height: 42px;
            border: 3px solid rgba(0, 240, 255, 0.15);
            border-top-color: var(--accent-primary, #00f0ff);
            border-radius: 50%;
            animation: spinLoader 0.8s linear infinite;
        }

        @keyframes spinLoader {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

export function createSkeletonCard() {
    return `
        <div class="skeleton-card">
            <div class="skeleton-image skeleton-shimmer"></div>
            <div class="skeleton-info">
                <div class="skeleton-line short skeleton-shimmer"></div>
                <div class="skeleton-line medium skeleton-shimmer"></div>
                <div class="skeleton-line long skeleton-shimmer"></div>
                <div class="skeleton-footer">
                    <div class="skeleton-price skeleton-shimmer"></div>
                    <div class="skeleton-btn skeleton-shimmer"></div>
                </div>
            </div>
        </div>
    `;
}

export function showSkeletons(container, count = 6) {
    if (!container) return;
    injectAnimationStyles();
    container.innerHTML = Array.from({ length: count }, () => createSkeletonCard()).join('');
}

export function removeSkeletons(container) {
    if (!container) return;
    const skeletons = container.querySelectorAll('.skeleton-card');
    skeletons.forEach(el => el.remove());
}

let scrollObserver = null;

export function initScrollAnimations() {
    injectAnimationStyles();

    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.scroll-animate').forEach(el => el.classList.add('animate-in'));
        return;
    }

    if (!scrollObserver) {
        scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });
    }

    const elements = document.querySelectorAll('.scroll-animate:not(.animate-in)');
    elements.forEach((el, index) => {
        const delay = Math.min((index % 8) * 60, 400);
        el.style.transitionDelay = `${delay}ms`;
        scrollObserver.observe(el);
    });
}
