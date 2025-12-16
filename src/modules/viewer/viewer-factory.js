// 查看器工厂：根据文件类型返回对应的渲染器

import { renderImage } from './renderers/image.js';
import { renderVideo } from './renderers/video.js';
import { renderAudio } from './renderers/audio-visualizer.js';
import { render3DModel } from './renderers/model-3d.js';
import { renderPDF } from './renderers/pdf.js';

export function renderMediaContent(item, index) {
    const container = document.getElementById('mediaContainer');
    if (!container) return;
    
    startLoadingIndicator();

    // Handle article type (has content instead of sources)
    if (item.type === 'article') {
        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'media-object active';
        wrap.style.cssText = 'width: 100%; height: 100%; overflow-y: auto; padding: 40px; background: rgba(0, 0, 0, 0.3);';
        wrap.innerHTML = item.content || '<p>暂无内容</p>';
        container.appendChild(wrap);
        finishLoadingIndicator();
        return;
    }
    
    // For other types, use sources array
    if (!item.sources || !item.sources[index]) {
        container.innerHTML = '<div style="color: #ff0055; padding: 20px; text-align: center;">>> 错误：未找到资源</div>';
        finishLoadingIndicator();
        return;
    }
    
    const src = item.sources[index];
    container.innerHTML = '';
    const renderItem = { ...item, sources: [src] };
    const finish = () => finishLoadingIndicator();
    
    switch (item.type) {
        case 'image':
        case 'gallery':
            renderImage(container, renderItem, finish);
            break;
        case 'video':
            renderVideo(container, renderItem, finish);
            break;
        case 'audio':
            renderAudio(container, renderItem);
            finish();
            break;
        case 'model':
            render3DModel(container, renderItem, finish);
            break;
        case 'pdf':
            renderPDF(container, renderItem);
            finish();
            break;
        case 'txt':
            renderTextFile(container, renderItem);
            finish();
            break;
        case 'doc':
            renderDocument(container, renderItem);
            finish();
            break;
        default:
            renderImage(container, renderItem, finish);
    }
    
    // Update thumbnail navigation if needed
    if (item.sources && item.sources.length > 1 && 
        (item.type === 'gallery' || (item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio' && item.type !== 'article'))) {
        updateThumbnailActive(index);
    }
}

let loaderTimer = null;
let loaderVisible = false;

function startLoadingIndicator() {
    const loader = document.getElementById('mediaLoader');
    const bar = document.getElementById('loadBar');
    const pct = document.getElementById('loadPercent');
    // 先重置，不立刻显示，避免闪烁
    if (bar) bar.style.width = '0%';
    if (pct) pct.innerText = '0%';
    loaderVisible = false;
    if (loaderTimer) clearTimeout(loaderTimer);
    loaderTimer = setTimeout(() => {
        loaderVisible = true;
        if (loader) loader.classList.add('active');
    }, 120); // 延时显示，若加载很快则不展示
}

function finishLoadingIndicator() {
    const loader = document.getElementById('mediaLoader');
    const bar = document.getElementById('loadBar');
    const pct = document.getElementById('loadPercent');
    if (loaderTimer) {
        clearTimeout(loaderTimer);
        loaderTimer = null;
    }
    if (!loaderVisible) {
        // 加载很快，直接返回
        return;
    }
    if (bar) bar.style.width = '100%';
    if (pct) pct.innerText = '100%';
    setTimeout(() => {
        if (loader) loader.classList.remove('active');
        loaderVisible = false;
    }, 120);
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
    toc.innerHTML = `<div style="color:var(--accent); font-weight:bold; margin-bottom:10px;">// 目录</div>`;
    ['0x00_封面', '0x01_初始化', '0x02_正文日志', '0x03_错误转储', '0x04_结束'].forEach(chap => {
        const row = document.createElement('div');
        row.className = 'toc-item';
        row.innerText = chap;
        toc.appendChild(row);
    });
    const content = document.createElement('div');
    content.className = 'text-content';
    content.innerHTML = `<h1>${item.title}</h1><p>日期: 2077-11-02 <br>加密: AES-256-GCM</p><p>系统诊断已启动...</p><p>${generateRandomLog()}</p>`;
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
        <div style="font-size: 18px; color: var(--accent); margin-bottom: 10px;">文档文件</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">${fileName}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 30px;">格式: ${fileExt}</div>
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
        ">下载文档</a>
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


