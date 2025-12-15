// 侧边栏模块：渲染导航菜单

import { assetsStore } from '../../store/assets.store.js';
import { generateData } from '../../services/mock-factory.js';
import { renderGrid } from '../dashboard/grid-renderer.js';
import { renderFilters } from '../dashboard/filter-bar.js';

let onCategorySelectCallback = null;

export function initSidebar(structure, onCategorySelect) {
    onCategorySelectCallback = onCategorySelect;
    renderSidebar(structure);
}

export function renderSidebar(structure) {
    const nav = document.getElementById('navList');
    if (!nav) return;
    
    nav.innerHTML = '';
    structure.forEach(group => {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'nav-group-header';
        groupHeader.innerText = group.group;
        nav.appendChild(groupHeader);
        
        group.children.forEach(parent => {
            const parentEl = document.createElement('div');
            parentEl.className = 'nav-parent';
            const header = document.createElement('div');
            header.className = 'nav-parent-header';
            header.innerHTML = `<span>${parent.name}</span><span>+</span>`;
            header.addEventListener('click', () => {
                const isExpanded = parentEl.classList.contains('expanded');
                document.querySelectorAll('.nav-parent').forEach(p => p.classList.remove('expanded', 'active-parent'));
                if (!isExpanded) {
                    parentEl.classList.add('expanded', 'active-parent');
                    if (parent.subs.length > 0 && onCategorySelectCallback) {
                        onCategorySelectCallback(parent, parent.subs[0]);
                    }
                }
            });
            
            const subList = document.createElement('div');
            subList.className = 'nav-sub-list';
            parent.subs.forEach(sub => {
                const item = document.createElement('div');
                item.className = 'nav-sub-item';
                item.innerText = sub.name;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (onCategorySelectCallback) {
                        onCategorySelectCallback(parent, sub);
                    }
                });
                subList.appendChild(item);
            });
            
            parentEl.appendChild(header);
            parentEl.appendChild(subList);
            nav.appendChild(parentEl);
        });
    });
}

export function loadSubCategory(parent, sub) {
    const root = document.documentElement;
    assetsStore.setCurrentCategory(parent, sub);
    
    root.style.setProperty('--accent', parent.color);
    root.style.setProperty('--border-glow', parent.color + '66');
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.innerHTML = `${parent.name}<span class="page-subtitle">/ ${sub.name}</span>`;
    }

    // Expand the parent category in sidebar
    document.querySelectorAll('.nav-parent').forEach(p => {
        const headerText = p.querySelector('.nav-parent-header span')?.innerText;
        if (headerText === parent.name) {
            p.classList.add('expanded', 'active-parent');
        } else {
            p.classList.remove('expanded', 'active-parent');
        }
    });

    document.querySelectorAll('.nav-sub-item').forEach(el => {
        el.classList.remove('active');
        if (el.innerText === sub.name) el.classList.add('active');
    });
    
    // Generate and set assets
    const uploadedDataStore = assetsStore.getUploadedDataStore();
    const assets = generateData(parent, sub, uploadedDataStore);
    assetsStore.setAssets(assets);
    renderGrid(assets);
    renderFilters(sub.tags, assets);
    
    // Emit event for other modules to react
    if (window.eventBus) {
        window.eventBus.emit('CATEGORY_SELECT', { parent, sub, assets });
    }
}


