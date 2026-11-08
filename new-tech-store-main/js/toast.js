// Система всплывающих уведомлений (Toast / Snackbar)

let stylesInjected = false;

function injectToastStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 380px;
            width: calc(100% - 48px);
            pointer-events: none;
        }

        .toast-item {
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 12px;
            background: rgba(22, 25, 37, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff;
            font-size: 0.95rem;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
            position: relative;
            overflow: hidden;
        }

        .toast-item.show {
            transform: translateX(0);
            opacity: 1;
        }

        .toast-item.hide {
            transform: translateX(120%);
            opacity: 0;
        }

        .toast-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
        }

        .toast-success {
            border-color: rgba(0, 255, 128, 0.3);
            box-shadow: 0 8px 25px rgba(0, 255, 128, 0.12);
        }
        .toast-success::before {
            background: #00ff80;
        }

        .toast-error {
            border-color: rgba(255, 0, 85, 0.35);
            box-shadow: 0 8px 25px rgba(255, 0, 85, 0.15);
        }
        .toast-error::before {
            background: #ff0055;
        }

        .toast-info {
            border-color: rgba(0, 240, 255, 0.3);
            box-shadow: 0 8px 25px rgba(0, 240, 255, 0.12);
        }
        .toast-info::before {
            background: #00f0ff;
        }

        .toast-warning {
            border-color: rgba(255, 166, 0, 0.35);
            box-shadow: 0 8px 25px rgba(255, 166, 0, 0.12);
        }
        .toast-warning::before {
            background: #ffa600;
        }

        .toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
            line-height: 1.4;
        }

        .toast-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
        }

        .toast-close {
            background: transparent;
            border: none;
            color: #a0a0a0;
            cursor: pointer;
            font-size: 1.1rem;
            padding: 4px;
            line-height: 1;
            border-radius: 6px;
            transition: color 0.2s, background 0.2s;
            flex-shrink: 0;
        }

        .toast-close:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
        }
    `;
    document.head.appendChild(style);
}

function getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
};

export function showToast(message, type = 'success', duration = 3200) {
    injectToastStyles();
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span>${message}</span>
        </div>
        <button class="toast-close" aria-label="Закрыть">✕</button>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const removeToast = () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 350);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
}

// Делаем доступным глобально для inline-обработчиков
window.showToast = showToast;
