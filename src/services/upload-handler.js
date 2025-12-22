// 上传处理器：处理文件上传逻辑

import { assetsStore } from '../store/assets.store.js';

let uploadedFiles = [];
let uploadedCover = null;
let uploadedCoverFile = null;
let coverIsManual = false;

export function getUploadedFiles() {
    return uploadedFiles;
}

export function setUploadedFiles(files) {
    uploadedFiles = files;
}

export function getUploadedCover() {
    return uploadedCover;
}

export function getUploadedCoverFile() {
    return uploadedCoverFile;
}

export function setUploadedCover(cover) {
    uploadedCover = cover;
}

export function clearUpload() {
    uploadedFiles = [];
    uploadedCover = null;
    uploadedCoverFile = null;
    coverIsManual = false;
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
            uploadedCoverFile = firstImg;
            coverIsManual = false;
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

    uploadedCoverFile = file;
    coverIsManual = true;
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
    if (uploadedFiles.length === 0 && !coverIsManual) {
        uploadedCover = null;
        uploadedCoverFile = null;
    }
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
    if (!window || !window.fetch) {
        alert(">> ERROR: FETCH NOT AVAILABLE");
        return;
    }

    if (uploadedFiles.length === 0) {
        alert(">> ACCESS DENIED: NO PAYLOAD DETECTED");
        return;
    }

    const customTitle = document.getElementById('upTitle')?.value || 'UNTITLED_ASSET';
    const catVal = document.getElementById('upCategory')?.value.split('-');
    const subIdx = document.getElementById('upSub')?.value;
    const userTags = document.getElementById('upTags')?.value.split(',').filter(t => t.trim() !== '') || [];
    const userDesc = document.getElementById('upDesc')?.value || '';
    const link1 = document.getElementById('upLink1')?.value || '';
    const link2 = document.getElementById('upLink2')?.value || '';
    const link3 = document.getElementById('upLink3')?.value || '';

    if (!catVal || !structure[catVal[0]]?.children?.[catVal[1]]) {
        alert(">> ERROR: INVALID CATEGORY");
        return;
    }

    const category = structure[catVal[0]].children[catVal[1]];
    const sub = category.subs[subIdx];

    const coverFile = uploadedCoverFile || uploadedFiles.find(f => f.type.startsWith('image/')) || uploadedFiles[0];

    const formData = new FormData();
    formData.append('title', customTitle);
    formData.append('categoryName', category.name);
    formData.append('categoryId', category.id);
    formData.append('subCategory', sub?.name || '');
    formData.append('subCategory2', '');
    formData.append('tags', userTags.join(','));
    formData.append('description', userDesc);
    formData.append('link1', link1);
    formData.append('link2', link2);
    formData.append('link3', link3);

    uploadedFiles.forEach((file) => {
        formData.append('files', file, file.name);
    });
    if (coverFile) {
        formData.append('cover', coverFile, coverFile.name);
    }

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
        .then(async (resp) => {
            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || 'UPLOAD_FAILED');
            }
            return resp.json();
        })
        .then((data) => {
            if (!data?.success) {
                throw new Error(data?.message || 'UPLOAD_FAILED');
            }

            const attrs = data.card?.attributes || {};
            const gallery = attrs.gallery || [];
            const thumb = attrs.thumbnail || attrs.cover || uploadedCover || '';
            const item = {
                id: data.card?.id,
                title: data.card?.title || customTitle,
                type: attrs.type || detectFileType(uploadedFiles[0].name, uploadedFiles[0].type),
                thumbnail: thumb,
                gallery,
                sources: gallery.length ? [thumb, ...gallery].filter(Boolean) : [thumb].filter(Boolean),
                tag: attrs.tags?.[0] || (userTags[0] ? userTags[0].trim() : 'NEW'),
                tags: attrs.tags || userTags,
                size: attrs.size || (uploadedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1) + ' MB',
                ver: 'v.1.0',
                description: userDesc,
                downloads: attrs.downloads || []
            };

            assetsStore.addUploadedItem(category.id, sub.id, item);

            clearUpload();
            const uploadPanel = document.getElementById('uploadPanel');
            if (uploadPanel) uploadPanel.classList.remove('active');

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

            if (onSuccess) {
                onSuccess(item, category, sub);
            }

            if (window.eventBus) {
                window.eventBus.emit('UPLOAD_SUCCESS', { item, category, sub });
            }

            alert('>> 上传完成，已写入 CSV 并存储资源');
        })
        .catch((err) => {
            console.error(err);
            alert(`>> ERROR: ${err.message || err}`);
        });
}


