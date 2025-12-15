// 视频渲染器

export function renderVideo(container, item) {
    const src = item.sources[0];
    const element = document.createElement('video');
    element.src = src;
    element.controls = true;
    element.autoplay = true;
    element.loop = true;
    element.className = 'media-object active';
    container.appendChild(element);
}


