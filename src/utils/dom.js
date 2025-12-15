// DOM 工具函数

export function $(selector, context = document) {
    return context.querySelector(selector);
}

export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

export function createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

export function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = $(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = $(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}



