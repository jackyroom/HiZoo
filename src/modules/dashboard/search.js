// 搜索模块：处理搜索建议和执行搜索

import { assetsStore } from '../../store/assets.store.js';

let structure = [];

function normalize(str) {
    return (str || '').toString().toLowerCase();
}

function baseMatchScore(text, query) {
    const t = normalize(text);
    const q = normalize(query);
    if (!t || !q) return 0;
    if (t === q) return 100;
    if (t.startsWith(q)) return 60;
    if (t.includes(q)) return 40;
    return 0;
}

function computeAssetScore(asset, query) {
    const q = normalize(query);
    if (!q) return 0;

    let score = 0;

    // 标题：权重最高
    score += baseMatchScore(asset.title, q) * 2;

    // 标签
    const tags = Array.isArray(asset.tags) ? asset.tags : (asset.tag ? [asset.tag] : []);
    tags.forEach(tag => {
        score += baseMatchScore(tag, q) * 1.5;
    });

    // 分类路径
    if (asset._category) {
        score += baseMatchScore(asset._category.name, q);
    }
    if (asset._sub) {
        score += baseMatchScore(asset._sub.name, q);
    }

    // 描述与类型
    score += baseMatchScore(asset.description, q);
    score += baseMatchScore(asset.type, q) * 0.8;

    return score;
}

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

    const traverse = (node, rootCategory, groupLabel) => {
        if (!node) return;
        const currentRoot = rootCategory || node;

        const storeKey = `${currentRoot.id}-${node.id}`;
        const uploaded = uploadedDataStore[storeKey] || [];
        const backendCards = Array.isArray(node.cards) ? node.cards : [];
        const assets = [...uploaded, ...backendCards];

        assets.forEach(asset => {
            allAssets.push({
                ...asset,
                _category: currentRoot,
                _sub: node,
                _group: groupLabel
            });
        });

        if (Array.isArray(node.subs)) {
            node.subs.forEach(child => traverse(child, currentRoot, groupLabel));
        }
    };

    structure.forEach(group => {
        group.children.forEach(category => traverse(category, category, group.group));
    });

    return allAssets;
}

function performSearch(query) {
    const suggestions = [];

    // Search in categories / subcategories / tags (递归)
    const traverseNodes = (node, rootCategory, groupLabel) => {
        if (!node) return;
        const currentRoot = rootCategory || node;

        const name = normalize(node.name);
        if (name.includes(query)) {
            if (node === currentRoot) {
                suggestions.push({
                    type: 'category',
                    title: node.name,
                    category: node,
                    group: groupLabel,
                    score: baseMatchScore(node.name, query)
                });
            } else {
                suggestions.push({
                    type: 'subcategory',
                    title: node.name,
                    category: currentRoot,
                    sub: node,
                    group: groupLabel,
                    score: baseMatchScore(node.name, query)
                });
            }
        }

        const tags = Array.isArray(node.tags) ? node.tags : [];
        tags.forEach(tag => {
            if (normalize(tag).includes(query)) {
                suggestions.push({
                    type: 'tag',
                    title: tag,
                    category: currentRoot,
                    sub: node,
                    group: groupLabel,
                    score: baseMatchScore(tag, query)
                });
            }
        });

        if (Array.isArray(node.subs)) {
            node.subs.forEach(child => traverseNodes(child, currentRoot, groupLabel));
        }
    };

    structure.forEach(group => {
        group.children.forEach(category => traverseNodes(category, category, group.group));
    });

    // Search in ALL assets
    const allAssets = getAllAssets();
    allAssets.forEach(asset => {
        const score = computeAssetScore(asset, query);
        if (score > 0) {
            suggestions.push({
                type: 'asset',
                title: asset.title,
                asset: asset,
                category: asset._category,
                sub: asset._sub,
                group: asset._group,
                score
            });
        }
    });

    // 统一按相关度排序（先高分）
    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));

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
                    <div class="suggestion-item-text">没有找到与 “${query}” 相关的结果</div>
                </div>
            </div>
        `;
        searchSuggestions.classList.add('active');
        return;
    }

    // Group suggestions by type，并在组内按分数再次排序
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

    Object.keys(grouped).forEach(type => {
        grouped[type].sort((a, b) => (b.score || 0) - (a.score || 0));
    });

    // Display categories
    if (grouped.category.length > 0) {
        const section = document.createElement('div');
        section.className = 'suggestion-section';
        section.innerHTML = '<div class="suggestion-section-title">分类</div>';

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
        section.innerHTML = '<div class="suggestion-section-title">子分类</div>';

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
        section.innerHTML = '<div class="suggestion-section-title">标签</div>';

        const uniqueTags = [...new Set(grouped.tag.map(t => t.title))];
        uniqueTags.slice(0, 5).forEach(tagName => {
            const item = grouped.tag.find(t => t.title === tagName);
            const elem = createSuggestionItem('[TAG]', tagName, `按该标签过滤`, () => {
                if (item.category && item.sub && window.eventBus) {
                    window.eventBus.emit('CATEGORY_SELECT', { 
                        parent: item.category, 
                        sub: item.sub,
                        assets: []
                    });
                    setTimeout(() => {
                        const currentAssets = assetsStore.getAssets();
                        const filtered = currentAssets.filter(a => {
                            const aTags = Array.isArray(a.tags) ? a.tags : (a.tag ? [a.tag] : []);
                            return aTags.map(t => t.toLowerCase()).includes(tagName.toLowerCase());
                        });
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
        section.innerHTML = '<div class="suggestion-section-title">资源</div>';

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
    const q = normalize(query);
    if (!q) return;

    const allAssets = getAllAssets();
    const scored = allAssets
        .map(asset => ({ asset, score: computeAssetScore(asset, q) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.asset);

    if (scored.length > 0) {
        renderSearchResults(scored);
    } else {
        const grid = document.getElementById('grid');
        if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">🔍</div>
                <div style="font-size: 14px; color: var(--accent); margin-bottom: 10px;">未找到结果</div>
                <div style="font-size: 11px;">请尝试搜索分类、标签或资源名称</div>
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
        pageTitle.innerHTML = `搜索结果<span class="page-subtitle">/ ${results.length} 项</span>`;
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
            <div style="font-size: 10px; color: #666;">${group.assets.length} 项资源</div>
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



