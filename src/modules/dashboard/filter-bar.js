// 筛选栏：标签过滤功能

export function renderFilters(tags, currentAssets) {
    const container = document.getElementById('filterContainer');
    if (!container) return;
    
    container.innerHTML = '';
    const uniqTags = Array.from(new Set(tags || []));
    const limit = 6;
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
        const more = document.createElement('div');
        more.className = 'filter-chip';
        more.innerText = `更多(+${hidden.length})`;
        more.addEventListener('click', () => {
            hidden.forEach(tag => container.appendChild(createChip(tag)));
            more.style.display = 'none';
        });
        container.appendChild(more);
    }
}
