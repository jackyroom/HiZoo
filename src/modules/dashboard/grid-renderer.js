// 网格渲染器：负责渲染资源卡片网格

export function renderGrid(data) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animation = `slideDown 0.4s ease-out ${index * 0.05}s backwards`;
        
        let typeBadge = item.type.toUpperCase();
        if (item.type === 'gallery' && item.sources && item.sources.length > 0) {
            typeBadge = 'GALLERY (' + item.sources.length + ')';
        }

        card.innerHTML = `
            <div class="card-type-badge">${typeBadge}</div>
            <div class="card-cover"><div class="card-scan"></div><img src="${item.thumbnail}" class="card-img" loading="lazy"></div>
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="tag-row"><span class="tag-tiny">${item.tag}</span><span class="tag-tiny">SECURE</span></div>
                <div class="card-footer"><div>SIZE<span class="stat-val">${item.size}</span></div><div>VER<span class="stat-val">${item.ver}</span></div></div>
            </div>
        `;
        
        // 绑定点击事件
        card.addEventListener('click', () => {
            if (window.eventBus) {
                window.eventBus.emit('ASSET_CLICK', { item });
            }
        });
        
        grid.appendChild(card);
    });
}



