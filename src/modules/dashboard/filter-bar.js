// 筛选栏：标签过滤功能

export function renderFilters(tags, currentAssets) {
    const container = document.getElementById('filterContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const allBtn = document.createElement('div');
    allBtn.className = 'filter-chip active';
    allBtn.innerText = 'ALL_DATA';
    allBtn.addEventListener('click', () => {
        if (window.eventBus) {
            window.eventBus.emit('FILTER_CHANGE', { tag: null, assets: currentAssets });
        }
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        allBtn.classList.add('active');
    });
    container.appendChild(allBtn);
    
    tags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerText = tag;
        chip.addEventListener('click', () => {
            const filtered = currentAssets.filter(item => item.tag === tag);
            if (window.eventBus) {
                window.eventBus.emit('FILTER_CHANGE', { tag, assets: filtered });
            }
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
        container.appendChild(chip);
    });
}



