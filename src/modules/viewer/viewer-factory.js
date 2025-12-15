// 查看器工厂：根据文件类型返回对应的渲染器

import { renderImage } from './renderers/image.js';
import { renderVideo } from './renderers/video.js';
import { renderAudio } from './renderers/audio-visualizer.js';
import { render3DModel } from './renderers/model-3d.js';
import { renderPDF } from './renderers/pdf.js';

export function renderMediaContent(item, index) {
    const container = document.getElementById('mediaContainer');
    if (!container) return;
    
    // Handle article type (has content instead of sources)
    if (item.type === 'article') {
        simulateLoading(() => {
            container.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.className = 'media-object active';
            wrap.style.cssText = 'width: 100%; height: 100%; overflow-y: auto; padding: 40px; background: rgba(0, 0, 0, 0.3);';
            wrap.innerHTML = item.content || '<p>No content available</p>';
            container.appendChild(wrap);
        });
        return;
    }
    
    // For other types, use sources array
    if (!item.sources || !item.sources[index]) {
        container.innerHTML = '<div style="color: #ff0055; padding: 20px; text-align: center;">>> ERROR: SOURCE NOT FOUND</div>';
        return;
    }
    
    const src = item.sources[index];
    simulateLoading(() => {
        container.innerHTML = '';
        const renderItem = { ...item, sources: [src] };
        
        switch (item.type) {
            case 'image':
            case 'gallery':
                renderImage(container, renderItem);
                break;
            case 'video':
                renderVideo(container, renderItem);
                break;
            case 'audio':
                renderAudio(container, renderItem);
                break;
            case 'model':
                render3DModel(container, renderItem);
                break;
            case 'pdf':
                renderPDF(container, renderItem);
                break;
            case 'txt':
                renderTextFile(container, renderItem);
                break;
            case 'doc':
                renderDocument(container, renderItem);
                break;
            default:
                renderImage(container, renderItem);
        }
    });
    
    // Update thumbnail navigation if needed
    if (item.sources && item.sources.length > 1 && 
        (item.type === 'gallery' || (item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio' && item.type !== 'article'))) {
        updateThumbnailActive(index);
    }
}

function simulateLoading(callback) {
    const loader = document.getElementById('mediaLoader');
    const bar = document.getElementById('loadBar');
    const pct = document.getElementById('loadPercent');
    if (loader) loader.classList.add('active');
    if (bar) bar.style.width = '0%';
    if (pct) pct.innerText = '0%';
    
    let progress = 0;
    const loadTimer = setInterval(() => {
        progress += Math.random() * 8;
        if (progress > 100) progress = 100;
        if (bar) bar.style.width = progress + '%';
        if (pct) pct.innerText = Math.floor(progress) + '%';
        if (progress === 100) {
            clearInterval(loadTimer);
            setTimeout(() => {
                if (loader) loader.classList.remove('active');
                if (callback) callback();
            }, 300);
        }
    }, 50);
}

function updateThumbnailActive(index) {
    const thumbs = document.querySelectorAll('.thumb-item');
    thumbs.forEach((t, i) => { t.classList.toggle('active', i === index); });
}

function renderTextFile(container, item) {
    const wrap = document.createElement('div');
    wrap.className = 'text-reader-container active media-object';
    const toc = document.createElement('div');
    toc.className = 'text-toc';
    toc.innerHTML = `<div style="color:var(--accent); font-weight:bold; margin-bottom:10px;">// DIRECTORY</div>`;
    ['0x00_HEADER', '0x01_INIT_SEQ', '0x02_BODY_LOG', '0x03_ERR_DUMP', '0x04_EOF'].forEach(chap => {
        const row = document.createElement('div');
        row.className = 'toc-item';
        row.innerText = chap;
        toc.appendChild(row);
    });
    const content = document.createElement('div');
    content.className = 'text-content';
    content.innerHTML = `<h1>${item.title}</h1><p>DATE: 2077-11-02 <br>ENCRYPTION: AES-256-GCM</p><p>System diagnostics initialized...</p><p>${generateRandomLog()}</p>`;
    wrap.appendChild(toc);
    wrap.appendChild(content);
    container.appendChild(wrap);
}

function renderDocument(container, item) {
    const wrap = document.createElement('div');
    wrap.className = 'media-object active';
    wrap.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 40px; text-align: center;';
    const src = item.sources[0];
    const fileName = src.split('/').pop() || item.title;
    const fileExt = fileName.split('.').pop().toUpperCase();
    wrap.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
        <div style="font-size: 18px; color: var(--accent); margin-bottom: 10px;">DOCUMENT FILE</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">${fileName}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 30px;">Format: ${fileExt}</div>
        <a href="${src}" download="${fileName}" style="
            display: inline-block;
            padding: 12px 24px;
            background: var(--accent);
            color: #000;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 1px;
        ">DOWNLOAD DOCUMENT</a>
    `;
    container.appendChild(wrap);
}

function generateRandomLog() {
    return `>> PACKET_DUMP: ${Math.random().toString(36).substring(7)} ${Math.random().toString(36).substring(7)}... [OK]`;
}

export function renderThumbnails(activeItem, currentMediaIndex, onThumbClick) {
    const strip = document.getElementById('thumbStrip');
    if (!strip) return;
    
    strip.innerHTML = '';
    
    if (!activeItem.sources || activeItem.sources.length === 0) {
        return;
    }
    
    activeItem.sources.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb-item';
        if (idx === currentMediaIndex) thumb.classList.add('active');
        const img = document.createElement('img');
        img.src = src;
        thumb.appendChild(img);
        thumb.addEventListener('click', () => {
            if (onThumbClick) onThumbClick(idx);
        });
        strip.appendChild(thumb);
    });
}


