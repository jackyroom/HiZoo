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
    const fileList = document.getElementById('fileList');
    const preImg = document.getElementById('preImg');
    const coverDrop = document.getElementById('coverDrop');
    
    if (upTitle) upTitle.value = '';
    if (upDesc) upDesc.value = '';
    if (upTags) upTags.value = '';
    if (fileList) fileList.innerHTML = '<div style="text-align:center; color:#444; padding:20px; font-size:10px;">NO FILES SELECTED</div>';
    if (preImg) preImg.src = 'https://placehold.co/600x400/000/00f3ff?text=NO+PREVIEW';
    
    if (coverDrop) {
        coverDrop.style.backgroundImage = 'none';
        const coverInput = coverDrop.querySelector('#coverInput') || document.getElementById('coverInput');
        coverDrop.innerHTML = '<span id="coverText">CLICK TO SET COVER</span>';
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
    if (upTitle) upTitle.value = '';
    if (upDesc) upDesc.value = '';
    if (upTags) upTags.value = '';
    
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
        .find(btn => btn.textContent && btn.textContent.includes('CANCEL_OP'));
    const submitBtn = Array.from(document.querySelectorAll('.cyber-btn'))
        .find(btn => btn.textContent && btn.textContent.includes('UPLOAD'));
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
                        
                        alert(`>> UPLOAD COMPLETE: ${getUploadedFiles().length} FILE(S) -> 1 ASSET CREATED`);
                    }
                });
            }
        });
    });
    
    if (coverDrop && coverInput) {
        coverDrop.addEventListener('click', () => coverInput.click());
        coverInput.addEventListener('change', (e) => {
            handleCoverSelect(e.target, () => {
                updatePreview(structure);
            });
        });
    }
    
        if (coverRemove) {
            coverRemove.addEventListener('click', () => {
                clearCover();
                updatePreview(structure);
            });
        }
    
    if (fileDrop && fileInput) {
        fileDrop.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target, () => {
                renderFileList();
                updatePreview(structure);
            });
        });
        
        // Drag and drop
        fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = 'var(--accent)';
        });
        
        fileDrop.addEventListener('dragleave', () => {
            fileDrop.style.borderColor = '';
        });
        
        fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(fileInput, () => {
                    renderFileList();
                    updatePreview(structure);
                });
            }
        });
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
            textEl.innerText = 'CLICK TO UPLOAD COVER';
            coverDrop.appendChild(textEl);
        }
        if (coverInput) {
            coverInput.value = '';
            coverDrop.appendChild(coverInput);
        }
    }
    if (coverPreview) coverPreview.style.display = 'none';
}

