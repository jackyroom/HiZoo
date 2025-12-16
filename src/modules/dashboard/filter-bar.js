// 筛选栏：标签过滤功能

export function renderFilters(tags, currentAssets) {
    const container = document.getElementById('filterContainer');
    if (!container) return;

    container.innerHTML = '';
    container.style.flexWrap = 'nowrap';
    container.style.maxHeight = '';
    container.style.overflowY = 'hidden';
    container.style.position = 'relative'; // 确保绝对定位的面板能正确显示
    const tagCount = new Map();
    (currentAssets || []).forEach(item => {
        const itemTags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : []);
        itemTags.forEach(t => {
            if (!t) return;
            const key = t.trim();
            if (!key) return;
            tagCount.set(key, (tagCount.get(key) || 0) + 1);
        });
    });

    const uniqTags = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name]) => name);

    const limit = 8;
    const visible = uniqTags.slice(0, limit);
    const hidden = uniqTags.slice(limit);

    const allBtn = document.createElement('div');
    allBtn.className = 'filter-chip active';
    allBtn.innerText = '全部';
    allBtn.addEventListener('click', () => {
        if (window.eventBus) {
            window.eventBus.emit('FILTER_CHANGE', { tag: null, assets: currentAssets });
        }
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        allBtn.classList.add('active');
    });
    container.appendChild(allBtn);

    const createChip = (tag) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerText = tag;
        chip.addEventListener('click', () => {
            const filtered = currentAssets.filter(item => {
                const itemTags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : []);
                return itemTags.map(t => t.toLowerCase()).includes(tag.toLowerCase());
            });
            if (window.eventBus) {
                window.eventBus.emit('FILTER_CHANGE', { tag, assets: filtered });
            }
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
        return chip;
    };

    visible.forEach(tag => container.appendChild(createChip(tag)));

    if (hidden.length > 0) {
        // --- More Button ---
        const moreBtn = document.createElement('div');
        moreBtn.className = 'filter-more-btn';
        moreBtn.innerHTML = `<span>MORE_TAGS</span> <span style="opacity:0.6">[${hidden.length}]</span>`;

        // --- Matrix Panel ---
        const matrixPanel = document.createElement('div');
        matrixPanel.className = 'filter-matrix-panel';

        // Header
        const header = document.createElement('div');
        header.className = 'matrix-header';
        header.innerHTML = `<span>// EXTENDED_FILTER_MATRIX</span> <span style="cursor:var(--cursor-pointer); color:var(--c-alert);" id="closeMatrix">[CLOSE]</span>`;
        matrixPanel.appendChild(header);

        // Content
        hidden.forEach(tag => {
            matrixPanel.appendChild(createChip(tag));
        });

        // 先添加到 DOM
        container.appendChild(moreBtn);
        container.appendChild(matrixPanel);

        // 确保按钮可点击
        moreBtn.style.cssText += 'pointer-events: auto !important; z-index: 100 !important; position: relative !important;';

        // 绑定点击事件
        moreBtn.onclick = function (e) {
            e.stopPropagation();
            matrixPanel.classList.toggle('active');
            moreBtn.classList.toggle('active');
            container.style.overflow = matrixPanel.classList.contains('active') ? 'visible' : 'hidden';
        };


        const closeBtn = header.querySelector('#closeMatrix');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                matrixPanel.classList.remove('active');
                moreBtn.classList.remove('active');
                container.style.overflow = 'hidden';
            });
        }

        // Global Close
        const closeHandler = (e) => {
            if (!matrixPanel.contains(e.target) && !moreBtn.contains(e.target)) {
                matrixPanel.classList.remove('active');
                moreBtn.classList.remove('active');
                container.style.overflow = 'hidden';
            }
        };
        document.addEventListener('click', closeHandler);
    }
}
