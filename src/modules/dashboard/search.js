// 搜索模块：处理搜索建议和执行搜索

import { generateData } from '../../services/mock-factory.js';
import { assetsStore } from '../../store/assets.store.js';

let structure = [];

export function initSearch(taxonomyStructure) {
    structure = taxonomyStructure;
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    if (!searchInput || !searchSuggestions) return;

    let searchTimeout = null;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            searchSuggestions.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 200);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            searchSuggestions.classList.add('active');
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchBox')) {
            searchSuggestions.classList.remove('active');
        }
    });

    // Handle Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                executeSearch(query);
                searchSuggestions.classList.remove('active');
            }
        } else if (e.key === 'Escape') {
            searchSuggestions.classList.remove('active');
        }
    });
}

// Get all assets from all categories and subcategories
function getAllAssets() {
    const allAssets = [];
    const uploadedDataStore = assetsStore.getUploadedDataStore();

    structure.forEach(group => {
        group.children.forEach(category => {
            category.subs.forEach(sub => {
                const assets = generateData(category, sub, uploadedDataStore);
                assets.forEach(asset => {
                    allAssets.push({
                        ...asset,
                        _category: category,
                        _sub: sub,
                        _group: group.group
                    });
                });
            });
        });
    });

    return allAssets;
}

function performSearch(query) {
    const suggestions = [];

    // Search in categories
    structure.forEach(group => {
        group.children.forEach(category => {
            if (category.name.toLowerCase().includes(query)) {
                suggestions.push({
                    type: 'category',
                    title: category.name,
                    category: category,
                    group: group.group
                });
            }

            category.subs.forEach(sub => {
                if (sub.name.toLowerCase().includes(query)) {
                    suggestions.push({
                        type: 'subcategory',
                        title: sub.name,
                        category: category,
                        sub: sub,
                        group: group.group
                    });
                }

                // Search in tags
                sub.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(query)) {
                        suggestions.push({
                            type: 'tag',
                            title: tag,
                            category: category,
                            sub: sub,
                            group: group.group
                        });
                    }
                });
            });
        });
    });

    // Search in ALL assets
    const allAssets = getAllAssets();
    allAssets.forEach(asset => {
        if (asset.title.toLowerCase().includes(query) ||
            asset.tag.toLowerCase().includes(query) ||
            (asset.description && asset.description.toLowerCase().includes(query)) ||
            asset.type.toLowerCase().includes(query)) {
            suggestions.push({
                type: 'asset',
                title: asset.title,
                asset: asset,
                category: asset._category,
                sub: asset._sub,
                group: asset._group
            });
        }
    });

    displaySearchSuggestions(suggestions, query);
}

function displaySearchSuggestions(suggestions, query) {
    const searchSuggestions = document.getElementById('searchSuggestions');
    if (!searchSuggestions) return;
    
    searchSuggestions.innerHTML = '';

    if (suggestions.length === 0) {
        searchSuggestions.innerHTML = `
            <div class="suggestion-section">
                <div class="suggestion-item" style="cursor: default; opacity: 0.5;">
                    <div class="suggestion-item-text">No results found for "${query}"</div>
                </div>
            </div>
        `;
        searchSuggestions.classList.add('active');
        return;
    }

    // Group suggestions by type
    const grouped = {
        category: [],
        subcategory: [],
        tag: [],
        asset: []
    };

    suggestions.forEach(s => {
        if (grouped[s.type]) {
            grouped[s.type].push(s);
        }
    });

    // Display categories
    if (grouped.category.length > 0) {
        const section = document.createElement('div');
        section.className = 'suggestion-section';
        section.innerHTML = '<div class="suggestion-section-title">CATEGORIES</div>';

        grouped.category.slice(0, 3).forEach(item => {
            const elem = createSuggestionItem('[CAT]', item.title, item.group, () => {
                if (window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: item.category, 
                        sub: item.category.subs[0],
                        assets: []
                    });
                }
                document.getElementById('searchInput').value = '';
                searchSuggestions.classList.remove('active');
            });
            section.appendChild(elem);
        });

        searchSuggestions.appendChild(section);
    }

    // Display subcategories
    if (grouped.subcategory.length > 0) {
        const section = document.createElement('div');
        section.className = 'suggestion-section';
        section.innerHTML = '<div class="suggestion-section-title">SUBCATEGORIES</div>';

        grouped.subcategory.slice(0, 3).forEach(item => {
            const elem = createSuggestionItem('[SUB]', item.title, `${item.category.name} / ${item.sub.name}`, () => {
                if (window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: item.category, 
                        sub: item.sub,
                        assets: []
                    });
                }
                document.getElementById('searchInput').value = '';
                searchSuggestions.classList.remove('active');
            });
            section.appendChild(elem);
        });

        searchSuggestions.appendChild(section);
    }

    // Display tags
    if (grouped.tag.length > 0) {
        const section = document.createElement('div');
        section.className = 'suggestion-section';
        section.innerHTML = '<div class="suggestion-section-title">TAGS</div>';

        const uniqueTags = [...new Set(grouped.tag.map(t => t.title))];
        uniqueTags.slice(0, 5).forEach(tagName => {
            const item = grouped.tag.find(t => t.title === tagName);
            const elem = createSuggestionItem('[TAG]', tagName, `Filter by tag`, () => {
                if (item.category && item.sub && window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: item.category, 
                        sub: item.sub,
                        assets: []
                    });
                    setTimeout(() => {
                        const currentAssets = assetsStore.getAssets();
                        const filtered = currentAssets.filter(a => a.tag === tagName.toUpperCase());
                        if (window.eventBus) {
                            window.eventBus.emit('FILTER_CHANGE', { tag: tagName, assets: filtered });
                        }
                    }, 100);
                }
                document.getElementById('searchInput').value = '';
                searchSuggestions.classList.remove('active');
            });
            section.appendChild(elem);
        });

        searchSuggestions.appendChild(section);
    }

    // Display assets
    if (grouped.asset.length > 0) {
        const section = document.createElement('div');
        section.className = 'suggestion-section';
        section.innerHTML = '<div class="suggestion-section-title">ASSETS</div>';

        grouped.asset.slice(0, 5).forEach(item => {
            const typeIcon = item.asset.type === 'image' ? '[IMG]' :
                item.asset.type === 'video' ? '[VID]' :
                    item.asset.type === 'audio' ? '[AUD]' :
                        item.asset.type === 'model' ? '[3D]' :
                            item.asset.type === 'pdf' ? '[PDF]' : '[FILE]';
            const categoryInfo = item.category && item.sub ? `${item.category.name} / ${item.sub.name}` : '';
            const meta = categoryInfo ? `${item.asset.type.toUpperCase()} • ${categoryInfo}` : `${item.asset.type.toUpperCase()} • ${item.asset.size}`;
            const elem = createSuggestionItem(typeIcon, item.title, meta, () => {
                if (item.category && item.sub && window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: item.category, 
                        sub: item.sub,
                        assets: []
                    });
                    setTimeout(() => {
                        if (window.eventBus) {
                            window.eventBus.emit('ASSET_CLICK', { item: item.asset });
                        }
                    }, 200);
                }
                document.getElementById('searchInput').value = '';
                searchSuggestions.classList.remove('active');
            });
            section.appendChild(elem);
        });

        searchSuggestions.appendChild(section);
    }

    searchSuggestions.classList.add('active');
}

function createSuggestionItem(icon, title, meta, onClick) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
        <div class="suggestion-item-icon">${icon}</div>
        <div class="suggestion-item-text">${title}</div>
        <div class="suggestion-item-meta">${meta}</div>
    `;
    item.addEventListener('click', onClick);
    return item;
}

export function executeSearch(query) {
    const allAssets = getAllAssets();
    const filtered = allAssets.filter(asset => {
        return asset.title.toLowerCase().includes(query) ||
            asset.tag.toLowerCase().includes(query) ||
            (asset.description && asset.description.toLowerCase().includes(query)) ||
            asset.type.toLowerCase().includes(query);
    });

    if (filtered.length > 0) {
        renderSearchResults(filtered);
    } else {
        const grid = document.getElementById('grid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">🔍</div>
                    <div style="font-size: 14px; color: var(--accent); margin-bottom: 10px;">NO RESULTS FOUND</div>
                    <div style="font-size: 11px;">Try searching for categories, tags, or asset names</div>
                </div>
            `;
        }
    }
}

function renderSearchResults(results) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '';

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.innerHTML = `SEARCH RESULTS<span class="page-subtitle">/ ${results.length} ITEMS</span>`;
    }

    // Group results by category
    const grouped = {};
    results.forEach(asset => {
        const key = `${asset._category.name} / ${asset._sub.name}`;
        if (!grouped[key]) {
            grouped[key] = {
                category: asset._category,
                sub: asset._sub,
                assets: []
            };
        }
        grouped[key].assets.push(asset);
    });

    // Render each group
    Object.keys(grouped).forEach(groupKey => {
        const group = grouped[groupKey];

        const header = document.createElement('div');
        header.style.cssText = 'grid-column: 1 / -1; padding: 20px 0 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 20px;';
        header.innerHTML = `
            <div style="font-size: 12px; color: var(--accent); letter-spacing: 2px; margin-bottom: 5px;">${group.category.name} / ${group.sub.name}</div>
            <div style="font-size: 10px; color: #666;">${group.assets.length} item(s)</div>
        `;
        grid.appendChild(header);

        // Render assets
        group.assets.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animation = `slideDown 0.4s ease-out ${index * 0.05}s backwards`;
            card.addEventListener('click', () => {
                if (window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: group.category, 
                        sub: group.sub,
                        assets: []
                    });
                    setTimeout(() => {
                        window.eventBus.emit('ASSET_CLICK', { item });
                    }, 300);
                }
            });

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
            grid.appendChild(card);
        });
    });
}



