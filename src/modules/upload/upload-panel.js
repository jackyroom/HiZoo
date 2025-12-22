// 上传面板：文件上传界面管理

import { 
    handleFileSelect, 
    handleCoverSelect, 
    removeFile, 
    submitUpload,
    clearUpload,
    getUploadedFiles,
    getUploadedCover
} from '../../services/upload-handler.js';
// Note: loadSubCategory, generateData, renderGrid are used via window or eventBus
import { renderFileList, updatePreview } from './upload-renderer.js';

export function openUploadPanel() {
    const panel = document.getElementById('uploadPanel');
    const modal = document.getElementById('modal');
    const modalPanel = document.getElementById('modalPanel');
    
    if (panel) panel.classList.add('active');
    if (modal) modal.classList.add('active');
    if (modalPanel) modalPanel.style.display = 'none';
    
    // Reset state
    clearUpload();
    
    const upTitle = document.getElementById('upTitle');
    const upDesc = document.getElementById('upDesc');
    const upTags = document.getElementById('upTags');
    const upLink1 = document.getElementById('upLink1');
    const upLink2 = document.getElementById('upLink2');
    const upLink3 = document.getElementById('upLink3');
    const fileList = document.getElementById('fileList');
    const preImg = document.getElementById('preImg');
    const coverDrop = document.getElementById('coverDrop');
    
    if (upTitle) upTitle.value = '';
    if (upDesc) upDesc.value = '';
    if (upTags) upTags.value = '';
    if (upLink1) upLink1.value = '';
    if (upLink2) upLink2.value = '';
    if (upLink3) upLink3.value = '';
    if (fileList) fileList.innerHTML = '<div style="text-align:center; color:#444; padding:20px; font-size:10px;">未选择文件</div>';
    if (preImg) preImg.src = 'https://placehold.co/600x400/000/00f3ff?text=%E6%9A%82%E6%97%A0%E9%A2%84%E8%A7%88';
    
    if (coverDrop) {
        coverDrop.style.backgroundImage = 'none';
        const coverInput = coverDrop.querySelector('#coverInput') || document.getElementById('coverInput');
        coverDrop.innerHTML = '<span id="coverText">点击设置封面</span>';
        if (coverInput) {
            coverDrop.appendChild(coverInput);
        } else {
            const newInput = document.createElement('input');
            newInput.type = 'file';
            newInput.id = 'coverInput';
            newInput.style.display = 'none';
            newInput.accept = 'image/*';
            coverDrop.appendChild(newInput);
        }
    }
}

export function closeUploadPanel() {
    const panel = document.getElementById('uploadPanel');
    const modal = document.getElementById('modal');
    const modalPanel = document.getElementById('modalPanel');
    
    if (panel) panel.classList.remove('active');
    if (modal) modal.classList.remove('active');
    if (modalPanel) modalPanel.style.display = 'flex';
    
    // Clear upload data
    clearUpload();
    
    // Reset form
    const upTitle = document.getElementById('upTitle');
    const upDesc = document.getElementById('upDesc');
    const upTags = document.getElementById('upTags');
    const upLink1 = document.getElementById('upLink1');
    const upLink2 = document.getElementById('upLink2');
    const upLink3 = document.getElementById('upLink3');
    if (upTitle) upTitle.value = '';
    if (upDesc) upDesc.value = '';
    if (upTags) upTags.value = '';
    if (upLink1) upLink1.value = '';
    if (upLink2) upLink2.value = '';
    if (upLink3) upLink3.value = '';
    
    // Clear preview
    updatePreview();
}

export function initUploadForm(structure) {
    const catSel = document.getElementById('upCategory');
    if (!catSel) return;
    
    catSel.innerHTML = '';
    structure.forEach((group, idx) => {
        group.children.forEach((cat, cIdx) => {
            const opt = document.createElement('option');
            opt.value = `${idx}-${cIdx}`;
            opt.innerText = cat.name;
            catSel.appendChild(opt);
        });
    });
    
    updateSubCats(structure);
    
    // Listen for category changes
    catSel.addEventListener('change', () => {
        updateSubCats(structure);
    });
}

function updateSubCats(structure) {
    const catSel = document.getElementById('upCategory');
    const subSel = document.getElementById('upSub');
    if (!catSel || !subSel) return;
    
    const val = catSel.value.split('-');
    if (!structure[val[0]]?.children?.[val[1]]) return;
    
    const cat = structure[val[0]].children[val[1]];
    subSel.innerHTML = '';
    cat.subs.forEach((sub, sIdx) => {
        const opt = document.createElement('option');
        opt.value = sIdx;
        opt.innerText = sub.name;
        subSel.appendChild(opt);
    });
}

export function bindUploadPanel(structure) {
    // Initialize upload form
    initUploadForm(structure);
    
    // 查找关闭按钮 - HTML中使用的是 <span> 标签，在 up-header 中
    const upHeader = document.querySelector('#uploadPanel .up-header');
    const closeBtn = upHeader ? upHeader.querySelector('span[onclick*="closeUploadPanel"]') : null;
    const cancelBtn = Array.from(document.querySelectorAll('.cyber-btn'))
        .find(btn => btn.textContent && btn.textContent.includes('取消'));
    const submitBtn = document.getElementById('uploadSubmitBtn') || Array.from(document.querySelectorAll('.cyber-btn'))
        .find(btn => btn.textContent && btn.textContent.includes('上传'));
    const coverDrop = document.getElementById('coverDrop');
    const coverInput = document.getElementById('coverInput');
    const coverRemove = document.querySelector('#coverPreview button');
    const fileDrop = document.getElementById('fileDrop');
    const fileInput = document.getElementById('fileInput');

    // 绑定关闭按钮事件（如果找到的话，但HTML中已经有onclick，所以这里主要是确保）
    if (closeBtn) closeBtn.addEventListener('click', closeUploadPanel);
    if (cancelBtn) cancelBtn.addEventListener('click', closeUploadPanel);
    if (submitBtn) submitBtn.addEventListener('click', () => {
            submitUpload(structure, (newItem, category, sub) => {
            // Success callback - emit event for navigation
            if (window.eventBus) {
                window.eventBus.emit('UPLOAD_SUCCESS', { 
                    item: newItem, 
                    category, 
                    sub,
                    callback: () => {
                        // Navigate to category
                        if (window.loadSubCategory) {
                            window.loadSubCategory(category, sub);
                        }
                        
                        // Scroll to top and highlight
                        setTimeout(() => {
                            const grid = document.getElementById('grid');
                            if (grid && grid.firstChild) {
                                grid.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                grid.firstChild.style.outline = '2px solid var(--accent)';
                                grid.firstChild.style.outlineOffset = '4px';
                                setTimeout(() => {
                                    if (grid.firstChild) {
                                        grid.firstChild.style.outline = '';
                                        grid.firstChild.style.outlineOffset = '';
                                    }
                                }, 2000);
                            }
                        }, 100);
                        
                        alert(`>> 上传完成：${getUploadedFiles().length} 个文件 -> 已创建 1 条资源`);
                    }
                });
            }
        });
    });
    
    if (coverDrop && coverInput) {
        coverDrop.onclick = () => coverInput.click();
        coverInput.onchange = (e) => {
            handleCoverSelect(e.target, () => {
                updatePreview(structure);
            });
        };
    }
    
        if (coverRemove) {
            coverRemove.addEventListener('click', () => {
                clearCover();
                updatePreview(structure);
            });
        }
    
    if (fileDrop && fileInput) {
        fileDrop.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            handleFileSelect(e.target, () => {
                renderFileList(structure);
                updatePreview(structure);
            });
        };
        
        // Drag and drop
        fileDrop.ondragover = (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = 'var(--accent)';
        };
        
        fileDrop.ondragleave = () => {
            fileDrop.style.borderColor = '';
        };
        
        fileDrop.ondrop = (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(fileInput, () => {
                    renderFileList(structure);
                    updatePreview(structure);
                });
            }
        };
    }
}

function clearCover() {
    const coverDrop = document.getElementById('coverDrop');
    const coverPreview = document.getElementById('coverPreview');
    const coverText = document.getElementById('coverText');
    const coverInput = document.getElementById('coverInput');
    
    if (coverDrop) {
        coverDrop.style.backgroundImage = 'none';
        coverDrop.innerHTML = '';
        if (coverText) {
            const textEl = document.createElement('span');
            textEl.id = 'coverText';
            textEl.innerText = '点击上传封面';
            coverDrop.appendChild(textEl);
        }
        if (coverInput) {
            coverInput.value = '';
            coverDrop.appendChild(coverInput);
        }
    }
    if (coverPreview) coverPreview.style.display = 'none';
}

