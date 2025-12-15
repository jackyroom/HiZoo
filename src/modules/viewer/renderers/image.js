// 图片渲染器

export function renderImage(container, item) {
    const src = item.sources[0];
    const element = document.createElement('img');
    element.src = src;
    element.className = 'media-object active';
    container.appendChild(element);
}


