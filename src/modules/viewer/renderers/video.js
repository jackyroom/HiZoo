// 视频渲染器

export function renderVideo(container, item, onLoaded) {
    const src = item.sources[0];
    const element = document.createElement('video');
    element.controls = true;
    element.autoplay = true;
    element.loop = true;
    element.className = 'media-object active';
    element.addEventListener('loadeddata', () => {
        if (onLoaded) onLoaded();
    });
    element.addEventListener('error', () => {
        if (onLoaded) onLoaded();
    });
    element.src = src;
    container.appendChild(element);
}


