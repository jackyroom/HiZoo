// 上传处理器：处理文件上传逻辑

import { assetsStore } from '../store/assets.store.js';

let uploadedFiles = [];
let uploadedCover = null;

export function getUploadedFiles() {
    return uploadedFiles;
}

export function setUploadedFiles(files) {
    uploadedFiles = files;
}

export function getUploadedCover() {
    return uploadedCover;
}

export function setUploadedCover(cover) {
    uploadedCover = cover;
}

export function clearUpload() {
    uploadedFiles = [];
    uploadedCover = null;
}

export function handleFileSelect(input, onUpdate) {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    uploadedFiles = [...uploadedFiles, ...files];
    if (onUpdate) onUpdate();

    // Auto-set cover from first image if not set
    if (!uploadedCover) {
        const firstImg = uploadedFiles.find(f => f.type.startsWith('image/'));
        if (firstImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (!uploadedCover) {
                    uploadedCover = e.target.result;
                    const preImg = document.getElementById('preImg');
                    if (preImg) preImg.src = e.target.result;
                    if (onUpdate) onUpdate();
                }
            };
            reader.readAsDataURL(firstImg);
        }
    }
}

export function handleCoverSelect(input, onUpdate) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedCover = e.target.result;
        const coverDrop = document.getElementById('coverDrop');
        if (coverDrop) {
            coverDrop.style.backgroundImage = `url(${uploadedCover})`;
            const coverInput = coverDrop.querySelector('#coverInput') || document.getElementById('coverInput');
            coverDrop.innerHTML = '';
            if (coverInput) {
                coverDrop.appendChild(coverInput);
            } else {
                const newInput = document.createElement('input');
                newInput.type = 'file';
                newInput.id = 'coverInput';
                newInput.style.display = 'none';
                newInput.accept = 'image/*';
                newInput.onchange = function () { handleCoverSelect(this, onUpdate); };
                coverDrop.appendChild(newInput);
            }
        }
        if (onUpdate) onUpdate();
    };
    reader.readAsDataURL(file);
}

export function removeFile(index, onUpdate) {
    uploadedFiles.splice(index, 1);
    if (onUpdate) onUpdate();
}

export function detectFileType(fileName, fileType) {
    const name = fileName.toLowerCase();
    const type = fileType.toLowerCase();

    // Model files (3D)
    if (name.endsWith('.glb') || name.endsWith('.gltf') ||
        name.endsWith('.obj') || name.endsWith('.fbx') ||
        name.endsWith('.dae') || name.endsWith('.3ds') ||
        name.endsWith('.ply') || name.endsWith('.stl')) {
        return 'model';
    }
    // Image files
    else if (type.startsWith('image/')) {
        return uploadedFiles.length > 1 ? 'gallery' : 'image';
    }
    // Video files
    else if (type.startsWith('video/')) {
        return 'video';
    }
    // Audio files
    else if (type.startsWith('audio/')) {
        return 'audio';
    }
    // Document files
    else if (name.endsWith('.pdf') || type.includes('pdf')) {
        return 'pdf';
    }
    else if (name.endsWith('.txt') || name.endsWith('.log') ||
        type.includes('text/plain')) {
        return 'txt';
    }
    else if (name.endsWith('.doc') || name.endsWith('.docx') ||
        type.includes('msword') || type.includes('wordprocessingml')) {
        return 'doc';
    }
    else if (name.endsWith('.xls') || name.endsWith('.xlsx') ||
        type.includes('spreadsheet')) {
        return 'doc';
    }
    // Default
    return 'doc';
}

export function submitUpload(structure, onSuccess) {
    if (uploadedFiles.length === 0) {
        alert(">> ACCESS DENIED: NO PAYLOAD DETECTED");
        return;
    }

    const customTitle = document.getElementById('upTitle')?.value || 'UNTITLED_ASSET';
    const catVal = document.getElementById('upCategory')?.value.split('-');
    const subIdx = document.getElementById('upSub')?.value;
    const userTags = document.getElementById('upTags')?.value.split(',').filter(t => t.trim() !== '') || [];
    const userDesc = document.getElementById('upDesc')?.value || '';

    if (!catVal || !structure[catVal[0]]?.children?.[catVal[1]]) {
        alert(">> ERROR: INVALID CATEGORY");
        return;
    }

    const category = structure[catVal[0]].children[catVal[1]];
    const sub = category.subs[subIdx];

    // Create blob URLs for all files
    const blobSources = uploadedFiles.map(file => URL.createObjectURL(file));

    // Determine primary type
    const firstFile = uploadedFiles[0];
    const type = detectFileType(firstFile.name, firstFile.type);

    // Calculate total size
    const totalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);

    // Generate thumbnail
    let thumbnail = uploadedCover || blobSources[0];
    if (type === 'model') {
        thumbnail = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop&q=80';
    } else if (type === 'pdf') {
        thumbnail = 'https://placehold.co/400x300/1a1a1a/FFF?text=PDF+DOC';
    } else if (type === 'txt') {
        thumbnail = 'https://placehold.co/400x300/000/00f3ff?text=TXT+LOG&font=monospace';
    } else if (type === 'audio') {
        thumbnail = 'https://placehold.co/400x300/101015/ff0055?text=AUDIO+WAVE&font=monospace';
    }

    // Create new asset
    const newItem = {
        title: customTitle,
        type: type,
        thumbnail: thumbnail,
        sources: blobSources,
        tag: userTags.length > 0 ? userTags[0].trim().toUpperCase() : 'NEW',
        size: (totalSize / 1024 / 1024).toFixed(1) + ' MB',
        ver: 'v.1.0',
        description: userDesc,
        originalFileName: firstFile.name
    };

    // Store uploaded item using assetsStore
    assetsStore.addUploadedItem(category.id, sub.id, newItem);

    // Clear upload form
    clearUpload();
    const uploadPanel = document.getElementById('uploadPanel');
    if (uploadPanel) uploadPanel.classList.remove('active');

    // Reset form
    const upTitle = document.getElementById('upTitle');
    const upDesc = document.getElementById('upDesc');
    const upTags = document.getElementById('upTags');
    if (upTitle) upTitle.value = '';
    if (upDesc) upDesc.value = '';
    if (upTags) upTags.value = '';

    if (onSuccess) {
        onSuccess(newItem, category, sub);
    }

    // Emit event
    if (window.eventBus) {
        window.eventBus.emit('UPLOAD_SUCCESS', { item: newItem, category, sub });
    }
}


