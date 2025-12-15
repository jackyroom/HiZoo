// 3D 模型渲染器

let currentModelViewer = null;

export function render3DModel(container, item) {
    container.innerHTML = '';

    const modelUrl = item.sources && item.sources.length > 0 ? item.sources[0] : null;

    if (!modelUrl) {
        container.innerHTML = '<div style="color: #ff0055; padding: 20px; text-align: center;">>> ERROR: MODEL SOURCE NOT FOUND</div>';
        return;
    }

    // Check if model-viewer supports this format (GLB/GLTF work best)
    let fileName = '';
    if (item.originalFileName) {
        fileName = item.originalFileName.toLowerCase();
    } else if (item.title && (item.title.includes('.glb') || item.title.includes('.gltf') ||
        item.title.includes('.obj') || item.title.includes('.fbx'))) {
        fileName = item.title.toLowerCase();
    } else if (typeof modelUrl === 'string') {
        fileName = modelUrl.toLowerCase();
    }
    const isGLB = fileName.endsWith('.glb') || fileName.endsWith('.gltf');

    let modelViewer = null;

    if (isGLB) {
        // Use model-viewer for GLB/GLTF files
        modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', modelUrl);
        modelViewer.setAttribute('alt', item.title);
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.setAttribute('shadow-intensity', '1');
        modelViewer.setAttribute('shadow-softness', '0.5');
        modelViewer.setAttribute('exposure', '1');
        modelViewer.setAttribute('environment-image', 'neutral');
        modelViewer.setAttribute('camera-orbit', '45deg 55deg 4.5m');
        modelViewer.setAttribute('min-camera-orbit', 'auto auto auto');
        modelViewer.setAttribute('max-camera-orbit', 'auto auto auto');
        modelViewer.setAttribute('loading', 'eager');
        modelViewer.style.width = '100%';
        modelViewer.style.height = '100%';
        modelViewer.style.background = 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a15 100%)';

        container.appendChild(modelViewer);
        currentModelViewer = modelViewer;
    } else {
        // For other formats, show download option
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 40px; text-align: center;';
        wrapper.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
            <div style="font-size: 18px; color: var(--accent); margin-bottom: 10px;">3D MODEL DETECTED</div>
            <div style="font-size: 12px; color: #888; margin-bottom: 30px;">Format: ${fileName ? fileName.split('.').pop().toUpperCase() : 'UNKNOWN'}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 20px;">Model viewer supports GLB/GLTF formats.<br>For other formats, please download the file.</div>
            <a href="${modelUrl}" download="${item.title}" style="
                display: inline-block;
                padding: 12px 24px;
                background: var(--accent);
                color: #000;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                font-size: 11px;
                letter-spacing: 1px;
            ">DOWNLOAD MODEL</a>
        `;
        container.appendChild(wrapper);
        currentModelViewer = null;
        return;
    }

    // Handle Resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
        if (!modelViewer || !container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width > 0 && height > 0) {
            modelViewer.style.width = width + 'px';
            modelViewer.style.height = height + 'px';
        }
    });
    resizeObserver.observe(container);

    // Store for cleanup
    container._resizeObserver = resizeObserver;
    container._modelViewer = modelViewer;
}

export function cleanup3DModel(container) {
    if (container._resizeObserver) {
        container._resizeObserver.disconnect();
        container._resizeObserver = null;
    }
    if (container._modelViewer) {
        container._modelViewer = null;
    }
    currentModelViewer = null;
}


