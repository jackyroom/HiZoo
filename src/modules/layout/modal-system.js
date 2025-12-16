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
    if (modalType) modalType.innerText = (item.type === 'download' ? '下载' : item.type === 'model' ? '模型' : item.type === 'audio' ? '音频' : item.type === 'video' ? '视频' : item.type === 'image' ? '图片' : item.type === 'gallery' ? '画廊' : item.type === 'pdf' ? 'PDF' : item.type === 'txt' ? '文本' : '资源');

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
            if (parent && parent.children[0]) parent.children[0].innerText = '顶点数';
            modalSize.innerText = item.vertCount?.toLocaleString() || '0';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = '面数';
            modalVer.innerText = item.vertCount?.toLocaleString() || '0';
        }
    } else if (item.type === 'audio') {
        if (modalSize) {
            const parent = modalSize.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = '时长';
            modalSize.innerText = item.duration ? formatTime(item.duration) : '--:--';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = '格式';
            modalVer.innerText = item.bitrate || 'OGG';
        }
    } else {
        if (modalSize) {
            const parent = modalSize.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = '大小';
        }
        if (modalVer) {
            const parent = modalVer.parentElement;
            if (parent && parent.children[0]) parent.children[0].innerText = '版本';
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

    // Setup Download Panel
    const btnStartDownload = document.getElementById('btnStartDownload');
    if (btnStartDownload) {
        // Use onclick to prevent duplicate listeners
        btnStartDownload.onclick = (e) => {
            e.stopPropagation();
            openDownloadPanel(item);
        };
    }

    modal.classList.add('active');
}

function openDownloadPanel(item) {
    const panels = document.getElementById('downloadPanel');
    const content = document.getElementById('dlContent');
    const closeBtn = document.getElementById('closeDownloadPanel');

    if (!panels || !content) return;

    // Helper to extract url/label
    const getDl = (d) => {
        if (typeof d === 'string') return { url: d, name: '下载数据包' };
        if (typeof d === 'object' && d) {
            return {
                url: d.url || d.link || d.href || '#',
                name: d.name || d.title || d.label || 'DOWNLOAD_PACKET',
                ver: d.ver || d.version
            };
        }
        return { url: '#', name: '无效链接' };
    };

    // Generate Content from downloads array
    let html = '';
    const downloads = item.downloads || [];

    if (downloads.length === 0) {
        html += `<div class="dl-empty-state">// 未检测到数据</div>`;
    } else {
        // Latest Version (First Item)
        const latest = getDl(downloads[0]);
        html += `<div class="dl-section-title">// 最新版本</div>`;
        html += `
            <a href="${latest.url}" class="dl-btn latest" target="_blank">
                <div class="dl-info">
                    <div class="dl-name">${item.title}</div>
                    <div class="dl-ver">
                        ${latest.ver || item.ver || 'v.1.0'} 
                        <span class="dl-tag secure">安全</span>
                        <span class="dl-tag verified">已验证</span>
                    </div>
                </div>
                <div class="dl-action">
                    <span>${latest.name}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                </div>
            </a>
        `;

        // Previous versions
        if (downloads.length > 1) {
            html += `<div class="dl-section-title" style="margin-top:30px;">// 历史版本</div>`;
            html += `<div class="dl-grid">`;
            for (let i = 1; i < downloads.length; i++) {
                const nav = getDl(downloads[i]);
                html += `
                    <a href="${nav.url}" class="dl-btn archive" target="_blank">
                        <div class="dl-info-mini">
                            <span class="dl-name-mini">${item.title}</span>
                            <span class="dl-ver-mini">v.${downloads.length - i}.0</span>
                        </div>
                        <div class="dl-action-mini">获取</div>
                    </a>
                `;
            }
            html += `</div>`;
        }
    }

    content.innerHTML = html;
    panels.classList.add('active');

    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            panels.classList.remove('active');
        };
    }
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

    // Cleanup Download Panel
    const downloadPanel = document.getElementById('downloadPanel');
    if (downloadPanel) downloadPanel.classList.remove('active');


    const modalPanel = document.getElementById('modalPanel');
    if (modalPanel) modalPanel.classList.remove('expanded');
    const expandBtn = document.querySelector('.expand-btn');
    if (expandBtn) expandBtn.innerText = "全屏";

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
        btn.innerText = isExpanded ? "退出全屏" : "全屏";
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
    // 防止短时间内重复触发导致跳两张
    const now = Date.now();
    if (navigateMedia._last && now - navigateMedia._last < 180) {
        return;
    }
    navigateMedia._last = now;

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

