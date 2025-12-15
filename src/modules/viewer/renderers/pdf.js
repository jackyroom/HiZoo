// PDF 渲染器

export function renderPDF(container, item) {
    const src = item.sources[0];
    const element = document.createElement('iframe');
    element.className = 'pdf-frame media-object active';
    element.src = src + '#toolbar=0&navpanes=0';
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.border = 'none';
    container.appendChild(element);
}


