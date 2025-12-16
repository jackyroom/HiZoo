// 上传渲染器：文件列表和预览渲染

import { getUploadedFiles, getUploadedCover } from '../../services/upload-handler.js';

export function renderFileList() {
    const list = document.getElementById('fileList');
    if (!list) return;
    
    list.innerHTML = '';
    const files = getUploadedFiles();
    
    if (files.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#444; padding:20px; font-size:10px;">未选择文件</div>';
        return;
    }

    files.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                <i class="ph ph-file-text" style="color:var(--accent)"></i>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</span>
            </div>
            <div style="color:#666; font-size:9px;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        `;
        
        const removeBtn = document.createElement('span');
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText = "cursor:pointer; color:var(--c-alert); font-size:14px; margin-left:10px;";
        removeBtn.addEventListener('click', () => {
            removeFile(idx, () => {
                renderFileList();
                // updatePreview will be called with structure from the caller
            });
        });
        item.appendChild(removeBtn);
        list.appendChild(item);
    });
}

export function updatePreview(structure) {
    const files = getUploadedFiles();
    const cover = getUploadedCover();
    
    const title = document.getElementById('upTitle')?.value || (files.length > 0 ? files[0].name : '未命名资源');
    const catVal = document.getElementById('upCategory')?.value;
    const desc = document.getElementById('upDesc')?.value || '';
    const tags = (document.getElementById('upTags')?.value || '').split(',').filter(t => t.trim());
    
    // Update preview title
    const preTitle = document.getElementById('preTitle');
    if (preTitle) preTitle.innerText = title;
    
    // Update preview type
    if (catVal && structure) {
        const val = catVal.split('-');
        if (structure[val[0]]?.children?.[val[1]]) {
            const category = structure[val[0]].children[val[1]];
            const preType = document.getElementById('preType');
            if (preType) preType.innerText = category.name;
        }
    }
    
    // Update size
    let totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const preSize = document.getElementById('preSize');
    if (preSize) preSize.innerText = (totalSize / 1024 / 1024).toFixed(1) + ' MB';
    
    // Update tags
    const tagContainer = document.getElementById('preTags');
    if (tagContainer) {
        tagContainer.innerHTML = '';
        const defTag = document.createElement('span');
        defTag.className = 'tag-pill';
        defTag.innerText = '新建';
        tagContainer.appendChild(defTag);
        
        tags.forEach(t => {
            if (t.trim()) {
                const span = document.createElement('span');
                span.className = 'tag-pill';
                span.innerText = t.trim();
                tagContainer.appendChild(span);
            }
        });
    }
    
    // Update cover preview
    const preImg = document.getElementById('preImg');
    if (preImg) {
        if (cover) {
            preImg.src = cover;
        } else if (files.length === 0) {
            preImg.src = 'https://placehold.co/600x400/000/00f3ff?text=%E6%9A%82%E6%97%A0%E9%A2%84%E8%A7%88';
        }
    }
}

