// 编辑器媒体调整：图片/视频的调整、对齐、删除等

let activeMedia = null;
let isResizing = false;
let resizeStartX, resizeStartY, startWidth, startHeight;
let activeResizeHandle = null;

export function activateResizer(target) {
    activeMedia = target;
    const resizer = document.getElementById('mediaResizer');
    if (!resizer) return;

    updateResizerPosition();
    resizer.classList.add('active');
}

export function hideResizer() {
    const resizer = document.getElementById('mediaResizer');
    if (resizer) resizer.classList.remove('active');
    activeMedia = null;
}

export function updateResizerPosition() {
    if (!activeMedia) return;
    const resizer = document.getElementById('mediaResizer');
    if (!resizer) return;

    resizer.style.width = activeMedia.offsetWidth + 'px';
    resizer.style.height = activeMedia.offsetHeight + 'px';
    resizer.style.top = activeMedia.offsetTop + 'px';
    resizer.style.left = activeMedia.offsetLeft + 'px';
}

export function deleteSelectedMedia() {
    if (activeMedia) {
        activeMedia.remove();
        hideResizer();
    }
}

export function setMediaAlign(align) {
    if (!activeMedia) return;

    const savedWidth = activeMedia.style.width || activeMedia.offsetWidth + 'px';
    const savedHeight = activeMedia.style.height || activeMedia.offsetHeight + 'px';

    activeMedia.classList.remove('align-left', 'align-right', 'align-center', 'align-inline');
    activeMedia.style.float = '';
    activeMedia.style.display = '';
    activeMedia.style.margin = '';

    if (align === 'left') {
        activeMedia.classList.add('align-left');
    } else if (align === 'right') {
        activeMedia.classList.add('align-right');
    } else if (align === 'center') {
        activeMedia.classList.add('align-center');
    } else if (align === 'inline') {
        activeMedia.classList.add('align-inline');
    }

    activeMedia.style.width = savedWidth;
    activeMedia.style.height = savedHeight;

    setTimeout(updateResizerPosition, 10);
}

function resizeMedia(e) {
    if (!isResizing || !activeMedia) return;

    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    let newW = startWidth;
    let newH = startHeight;

    if (activeResizeHandle.includes('e')) newW = startWidth + dx;
    if (activeResizeHandle.includes('w')) newW = startWidth - dx;
    if (activeResizeHandle.includes('s')) newH = startHeight + dy;
    if (activeResizeHandle.includes('n')) newH = startHeight - dy;

    if (newW > 20) activeMedia.style.width = newW + 'px';
    if (newH > 20) activeMedia.style.height = newH + 'px';

    updateResizerPosition();
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resizeMedia);
    document.removeEventListener('mouseup', stopResize);
    updateResizerPosition();
}

export function initResizer() {
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;

    // Click handler for media elements
    editorContent.addEventListener('click', function (e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
            activateResizer(e.target);
        } else {
            hideResizer();
        }
    });

    // Drag handles
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(h => {
        h.addEventListener('mousedown', function (e) {
            if (!activeMedia) return;
            isResizing = true;
            activeResizeHandle = e.target.getAttribute('data-corner') || e.target.className.replace('resize-handle ', '');
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            startWidth = activeMedia.offsetWidth;
            startHeight = activeMedia.offsetHeight;

            document.addEventListener('mousemove', resizeMedia);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // Bind media toolbar buttons
    const alignLeftBtn = document.querySelector('#mediaResizer .tool-btn[title*="Left"]');
    const alignCenterBtn = document.querySelector('#mediaResizer .tool-btn[title*="Center"]');
    const alignRightBtn = document.querySelector('#mediaResizer .tool-btn[title*="Right"]');
    const alignInlineBtn = document.querySelector('#mediaResizer .tool-btn[title*="Inline"]');
    const deleteBtn = document.querySelector('#mediaResizer .tool-btn[title*="Delete"]');

    if (alignLeftBtn) alignLeftBtn.addEventListener('click', () => setMediaAlign('left'));
    if (alignCenterBtn) alignCenterBtn.addEventListener('click', () => setMediaAlign('center'));
    if (alignRightBtn) alignRightBtn.addEventListener('click', () => setMediaAlign('right'));
    if (alignInlineBtn) alignInlineBtn.addEventListener('click', () => setMediaAlign('inline'));
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedMedia);
}

// Expose activeMedia for use in other modules
export function getActiveMedia() {
    return activeMedia;
}


