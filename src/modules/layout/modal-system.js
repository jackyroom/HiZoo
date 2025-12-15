// 模态系统：管理查看器模态窗口

import { uiStore } from '../../store/ui.store.js';
import { formatTime } from '../../utils/format.js';
import { renderMediaContent, renderThumbnails } from '../viewer/viewer-factory.js';
import { cleanup3DModel } from '../viewer/renderers/model-3d.js';
import { cleanupAudio } from '../viewer/renderers/audio-visualizer.js';

export function openModal(item) {
    uiStore.setActiveItem(item, 0);
    const modal = document.getElementById('modal');
    const container = document.getElementById('mediaContainer');
    if (!modal || !container) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalSize = document.getElementById('modalSize');
    const modalVer = document.getElementById('modalVer');
    const modalType = document.getElementById('modalType');

    if (modalTitle) modalTitle.innerText = item.title;
    if (modalSize) modalSize.innerText = item.size;
    if (modalVer) modalVer.innerText = item.ver;
    if (modalType) modalType.innerText = item.type.toUpperCase();

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const thumbStrip = document.getElementById('thumbStrip');

    if (btnPrev) btnPrev.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
    if (thumbStrip) thumbStrip.classList.remove('active');
    
    container.innerHTML = '';

    // Show/Hide Thumbnail Navigation
    if (item.type === 'article') {
        if (thumbStrip) thumbStrip.classList.remove('active');
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
    } else if (item.sources && (item.type === 'gallery' || (item.sources.length > 1 && item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio'))) {
        if (thumbStrip) thumbStrip.classList.add('active');
        if (btnPrev) btnPrev.style.display = 'flex';
        if (btnNext) btnNext.style.display = 'flex';
    } else {
        if (thumbStrip) thumbStrip.classList.remove('active');
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
    }

    // Update Stats Display
    if (item.type === 'model') {
        if (modalSize) {
            const parent = modalSize.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'VERTICES';
            modalSize.innerText = item.vertCount?.toLocaleString() || '0';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'FACES';
            modalVer.innerText = item.vertCount?.toLocaleString() || '0';
        }
    } else if (item.type === 'audio') {
        if (modalSize) {
            const parent = modalSize.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'DURATION';
            modalSize.innerText = item.duration ? formatTime(item.duration) : '--:--';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'FORMAT';
            modalVer.innerText = item.bitrate || 'OGG';
        }
    } else {
        if (modalSize) {
            const parent = modalSize.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'SIZE';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = 'VERSION';
        }
    }

    // Render media content
    uiStore.setActiveItem(item, 0);
    renderMediaContent(item, 0);
    
    // Render thumbnails if needed
    if (item.sources && item.sources.length > 1 && 
        (item.type === 'gallery' || (item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio' && item.type !== 'article'))) {
        renderThumbnails(item, 0, (index) => {
            uiStore.currentMediaIndex = index;
            renderMediaContent(item, index);
        });
    }

    // Emit event
    if (window.eventBus) {
        window.eventBus.emit('MODAL_OPEN', { item, index: 0 });
    }

    modal.classList.add('active');
}

export function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
    
    // Cleanup
    const container = document.getElementById('mediaContainer');
    if (container) {
        cleanup3DModel(container);
        cleanupAudio(container);
        container.innerHTML = '';
    }
    
    const modalPanel = document.getElementById('modalPanel');
    if (modalPanel) modalPanel.classList.remove('expanded');
    const expandBtn = document.querySelector('.expand-btn');
    if (expandBtn) expandBtn.innerText = "EXPAND";
    
    uiStore.setActiveItem(null, 0);
    
    if (window.eventBus) {
        window.eventBus.emit('MODAL_CLOSE');
    }
}

export function toggleFullscreen() {
    const modalPanel = document.getElementById('modalPanel');
    const btn = document.querySelector('.expand-btn');
    
    if (!modalPanel) {
        console.error('[toggleFullscreen] modalPanel not found');
        return;
    }

    modalPanel.classList.toggle('expanded');
    
    if (btn) {
        const isExpanded = modalPanel.classList.contains('expanded');
        btn.innerText = isExpanded ? "SHRINK" : "EXPAND";
    }
}

export function initModalKeyboard() {
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('modal');
        if (!modal || !modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            navigateMedia(-1);
        } else if (e.key === 'ArrowRight') {
            navigateMedia(1);
        }
    });
}

export function navigateMedia(direction) {
    const activeItem = uiStore.getActiveItem();
    if (!activeItem || !activeItem.sources) return;
    if (activeItem.type === 'article') return;

    let currentIndex = uiStore.currentMediaIndex || 0;
    currentIndex += direction;

    if (currentIndex < 0) currentIndex = activeItem.sources.length - 1;
    if (currentIndex >= activeItem.sources.length) currentIndex = 0;

    uiStore.currentMediaIndex = currentIndex;
    renderMediaContent(activeItem, currentIndex);

    if (window.eventBus) {
        window.eventBus.emit('MEDIA_NAVIGATE', { item: activeItem, index: currentIndex });
    }
}

