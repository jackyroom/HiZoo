// 网格渲染器：负责渲染资源卡片网格

import { assetsStore } from '../../store/assets.store.js';

export function renderGrid(data) {
    const grid = document.getElementById('grid');
    if (!grid) return;

    if (!data || data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; color:#666;">
                <div style="font-size:48px; opacity:0.25;">📂</div>
                <div style="margin-top:10px; font-size:12px; color:var(--accent);">暂无数据</div>
                <div style="font-size:11px;">请先导入 CSV 或上传资源</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animation = `slideDown 0.4s ease-out ${index * 0.05}s backwards`;
        card.draggable = true;
        card.dataset.index = String(index);

        let typeBadge = (item.type || 'FILE').toUpperCase();
        if (item.type === 'gallery' && item.sources && item.sources.length > 0) {
            typeBadge = 'GALLERY (' + item.sources.length + ')';
        }

        const tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : []);
        const visibleTags = tags.slice(0, 4);
        const hiddenCount = tags.length > 4 ? tags.length - 4 : 0;
        const tagHtml = visibleTags.map(t => `<span class="tag-tiny">${t}</span>`).join('');
        const moreHtml = hiddenCount > 0 ? `<span class="tag-tiny tag-more" data-tags="${tags.slice(4).join(',')}">+${hiddenCount}</span>` : '<span class="tag-tiny">SECURE</span>';

        card.innerHTML = `
            <div class="card-type-badge">${typeBadge}</div>
            <div class="card-cover"><div class="card-scan"></div><img src="${item.thumbnail || ''}" class="card-img" loading="lazy"></div>
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="tag-row">${tagHtml}${moreHtml}</div>
                <div class="card-footer"><div>大小<span class="stat-val">${item.size}</span></div><div>版本<span class="stat-val">${item.ver}</span></div></div>
            </div>
        `;

        // 绑定点击事件
        card.addEventListener('click', () => {
            if (window.eventBus) {
                window.eventBus.emit('ASSET_CLICK', { item });
            }
        });

        // 展开更多标签
        card.querySelectorAll('.tag-more').forEach(more => {
            more.addEventListener('click', (e) => {
                e.stopPropagation();
                const extra = more.getAttribute('data-tags') || '';
                if (!extra) return;
                more.outerHTML = extra.split(',').map(t => `<span class="tag-tiny">${t}</span>`).join('');
            });
        });

        // 拖拽排序 & 移动到其他分类用的拖拽数据
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.dropEffect = 'move';
            e.dataTransfer.setData('text/plain', String(index));

            // 创建自定义拖拽图像，缩小尺寸避免触发浏览器默认行为
            const dragImage = card.cloneNode(true);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-9999px';
            dragImage.style.left = '-9999px';
            // 缩小到原来的 50%，占据更小面积
            dragImage.style.width = (card.offsetWidth * 0.5) + 'px';
            dragImage.style.height = (card.offsetHeight * 0.5) + 'px';
            dragImage.style.opacity = '0.9';
            dragImage.style.transform = 'rotate(3deg)';
            dragImage.style.boxShadow = '0 5px 15px rgba(0, 243, 255, 0.5)';
            dragImage.style.pointerEvents = 'none';
            document.body.appendChild(dragImage);
            // 调整拖拽图像的偏移，使其居中显示
            e.dataTransfer.setDragImage(dragImage, e.offsetX * 0.5, e.offsetY * 0.5);

            // 延迟移除拖拽图像
            setTimeout(() => {
                if (dragImage.parentNode) {
                    dragImage.parentNode.removeChild(dragImage);
                }
            }, 0);

            window.__hizooDraggedAsset = {
                item,
                fromIndex: index
            };
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            window.__hizooDraggedAsset = null;
        });

        // 作为排序目标：拖拽到另一张卡片上时，改变顺序
        card.addEventListener('dragover', (e) => {
            if (!window.__hizooDraggedAsset) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', (e) => {
            card.classList.remove('drag-over');
            e.stopPropagation();
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            card.classList.remove('drag-over');
            const fromIndex = window.__hizooDraggedAsset?.fromIndex;
            const toIndex = Number(card.dataset.index);
            if (typeof fromIndex === 'number' && !Number.isNaN(toIndex) && fromIndex !== toIndex) {
                assetsStore.reorderCurrentAssets(fromIndex, toIndex);
                const newAssets = assetsStore.getAssets();
                renderGrid(newAssets);
            }
        });

        grid.appendChild(card);
    });
}



