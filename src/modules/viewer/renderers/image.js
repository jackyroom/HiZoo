// 图片渲染器

export function renderImage(container, item, onLoaded) {
    const src = item.sources[0];
    const element = document.createElement('img');
    element.className = 'media-object active';
    element.style.opacity = '0';
    element.addEventListener('load', () => {
        element.style.opacity = '1';
        if (onLoaded) onLoaded();
    });
    element.addEventListener('error', () => {
        element.style.opacity = '1';
        if (onLoaded) onLoaded();
    });
    element.src = src;
    container.appendChild(element);
}


