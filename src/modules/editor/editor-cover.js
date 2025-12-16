// 编辑器封面处理

let articleCoverData = null;

export function handleArticleCoverSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        articleCoverData = e.target.result;
        const preview = document.getElementById('artCoverPreview');
        const previewImg = document.getElementById('artCoverPreviewImg');
        const coverText = document.getElementById('artCoverText');
        const coverDrop = document.getElementById('artCoverDrop');
        
        if (previewImg) previewImg.src = articleCoverData;
        if (preview) preview.style.display = 'block';
        if (coverText) coverText.innerText = '封面已上传';
        if (coverDrop) {
            coverDrop.style.backgroundImage = `url(${articleCoverData})`;
            coverDrop.style.backgroundSize = 'cover';
            coverDrop.style.backgroundPosition = 'center';
        }
    };
    reader.readAsDataURL(file);
}

export function clearArticleCover() {
    articleCoverData = null;
    const preview = document.getElementById('artCoverPreview');
    const coverText = document.getElementById('artCoverText');
    const coverDrop = document.getElementById('artCoverDrop');
    const coverInput = document.getElementById('artCoverInput');
    
    if (preview) preview.style.display = 'none';
    if (coverText) coverText.innerText = '点击上传封面';
    if (coverDrop) coverDrop.style.backgroundImage = 'none';
    if (coverInput) coverInput.value = '';
}

export function getArticleCover() {
    return articleCoverData;
}


