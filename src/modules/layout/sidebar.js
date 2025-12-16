import { assetsStore } from '../../store/assets.store.js';
import { renderGrid } from '../dashboard/grid-renderer.js';
import { renderFilters } from '../dashboard/filter-bar.js';
// import { moveCardToCategory } from '../../services/card-sync.js'; // Unused
// import { createCategory } from '../../services/category-sync.js'; // Unused

let onCategorySelectCallback = null;
let sidebarStructureRef = null;
let dragCategoryInfo = null;

export function initSidebar(structure, onCategorySelect) {
    onCategorySelectCallback = onCategorySelect;
    sidebarStructureRef = structure;
    createSidebarContextMenu();
    renderSidebar(structure);

    // Global click to close context menu
    document.addEventListener('click', () => hideContextMenu());
}

export function renderSidebar(structure) {
    const nav = document.getElementById('navList');
    if (!nav) return;

    nav.innerHTML = '';
    if (!structure || structure.length === 0) {
        nav.innerHTML = `<div style="padding:16px; color:#666; font-size:12px;">无分类数据，请导入 CSV 后重启服务器</div>`;
        return;
    }
    const currentParent = assetsStore.currentParent;
    const currentSub = assetsStore.currentSub;

    structure.forEach((group, groupIndex) => {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'nav-group-header';
        const groupTitle = document.createElement('span');
        groupTitle.textContent = group.group;

        // Right click on group header
        groupHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Add Category',
                    icon: 'ph ph-folder-plus',
                    action: () => startAddCategory(groupIndex, null)
                }
            ]);
        });

        groupHeader.appendChild(groupTitle);
        nav.appendChild(groupHeader);

        if (group.children) {
            group.children.forEach((child, childIndex) => {
                // Determine if this tree contains the active item to auto-expand
                const isActive = isNodeActiveOrChildActive(child, currentSub);
                const nodeEl = renderNode(child, groupIndex, [childIndex], 0, child, isActive);
                nav.appendChild(nodeEl);
            });
        }
    });
}

/**
 * Recursive function to render a sidebar node
 * @param {Object} node - The category node data
 * @param {number} groupIndex - Index of the top-level group
 * @param {Array<number>} pathIndices - Array of indices describing the path to this node
 * @param {number} depth - Current depth level
 * @param {Object} rootParent - The top-level parent of this tree (for context)
 * @param {boolean} forceExpand - Whether to force expand this node (because child is active)
 */
function renderNode(node, groupIndex, pathIndices, depth, rootParent, forceExpand = false) {
    const isLeaf = !node.subs || node.subs.length === 0;
    const isRoot = depth === 0;

    // Container for this node and its children
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'nav-tree-node';
    // Top level nodes get the 'nav-parent' class for legacy styling hooks if needed
    if (isRoot) nodeContainer.classList.add('nav-parent');

    // Header (The clickable row)
    const header = document.createElement('div');
    // Use 'nav-parent-header' for top level, 'nav-item-content' for nested (or standardizing)
    header.className = isRoot ? 'nav-parent-header' : 'nav-item-content';
    if (!isRoot) {
        header.classList.add('nav-sub-item'); // Legacy class
        header.style.paddingLeft = '12px'; // Reset padding, handled by tree line container
    }

    // Determine active state
    // Use assetsStore to check ID match
    const currentSub = assetsStore.currentSub;
    const isActive = currentSub && currentSub.id === node.id;
    if (isActive) {
        if (isRoot) nodeContainer.classList.add('active-parent');
        header.classList.add('active');
    }

    if (forceExpand || (isRoot && isActive)) {
        nodeContainer.classList.add('expanded');
    }

    // Content
    const nameSpan = document.createElement('span');
    nameSpan.textContent = node.name;
    nameSpan.className = 'category-name';

    // Expand Icon (caret)
    // Always show if it has children. For roots, maybe always show to indicate it CAN have children?
    // Let's standardise: Show if has children.
    const hasChildren = node.subs && node.subs.length > 0;
    let expandIcon = null;

    if (hasChildren || isRoot) { // Roots allow adding children easily, so keeping icon is good UI
        expandIcon = document.createElement('span');
        expandIcon.innerHTML = hasChildren ? '<i class="ph ph-caret-right"></i>' : '';
        // If it's a root but has no children, maybe show a "add" hint or empty?
        // Let's stick to: if hasChildren, show arrow. If root and empty, maybe nothing?
        // User asked for arrows.
        if (!hasChildren && isRoot) {
            expandIcon.innerHTML = ''; // Clean
        }
        expandIcon.className = 'expand-icon';
    }

    header.appendChild(nameSpan);
    if (expandIcon) header.appendChild(expandIcon);

    // Context Menu & Events
    setupNodeEvents(header, node, groupIndex, pathIndices, depth, nodeContainer, rootParent);

    nodeContainer.appendChild(header);

    // Render Children container
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'nav-tree-children';

        node.subs.forEach((sub, subIndex) => {
            const childPath = [...pathIndices, subIndex];
            // Check if child is active to propagate expansion
            const childIsActive = isNodeActiveOrChildActive(sub, currentSub);
            const childNode = renderNode(sub, groupIndex, childPath, depth + 1, rootParent, childIsActive);
            childrenContainer.appendChild(childNode);
        });

        nodeContainer.appendChild(childrenContainer);
    }

    return nodeContainer;
}

function isNodeActiveOrChildActive(node, activeNode) {
    if (!activeNode) return false;
    if (node.id === activeNode.id) return true;
    if (node.subs) {
        return node.subs.some(sub => isNodeActiveOrChildActive(sub, activeNode));
    }
    return false;
}

function setupNodeEvents(header, node, groupIndex, pathIndices, depth, containerEl, rootParent) {
    // Context Menu
    header.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const actions = [
            {
                label: 'Add Subcategory',
                icon: 'ph ph-plus-circle',
                action: () => startAddCategory(groupIndex, pathIndices)
            },
            { type: 'separator' },
            {
                label: 'Rename',
                icon: 'ph ph-pencil',
                action: () => startRenameCategory(header.querySelector('.category-name'), node, groupIndex, pathIndices)
            },
            {
                label: 'Delete',
                icon: 'ph ph-trash',
                action: () => deleteCategory(groupIndex, pathIndices),
                danger: true
            }
        ];
        showContextMenu(e.clientX, e.clientY, actions);
    });

    // Drag-and-drop
    header.draggable = true;
    header.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        header.classList.add('dragging');
        window.__hizooDragInfo = { groupIndex, pathIndices, node, type: 'category' };
        e.dataTransfer.effectAllowed = 'move';
    });
    header.addEventListener('dragend', () => {
        header.classList.remove('dragging');
        window.__hizooDragInfo = null;
    });
    header.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        header.classList.add('drag-over');
    });
    header.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        header.classList.remove('drag-over');
    });
    header.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        header.classList.remove('drag-over');
        handleDrop(e, groupIndex, pathIndices, node);
    });

    // Click behavior
    let clickTimer = null;
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        const clickedName = e.target.closest('.category-name');

        // Double click to rename
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            if (clickedName) {
                startRenameCategory(clickedName, node, groupIndex, pathIndices);
            }
        } else {
            clickTimer = setTimeout(() => {
                clickTimer = null;

                // Logic: 
                // 1. If it has children, toggle expand.
                // 2. Always Select the node (load it).

                const hasChildren = node.subs && node.subs.length > 0;

                // Toggle Expand
                if (hasChildren) {
                    containerEl.classList.toggle('expanded');
                }

                // Select Category
                if (onCategorySelectCallback) {
                    // We pass rootParent as parent context, and active node as 'sub'
                    onCategorySelectCallback(rootParent, node);
                }

                // Visual update (handled by re-render usually, but we can quick toggle)
                document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
                header.classList.add('active');

            }, 250);
        }
    });
}

function handleDrop(e, groupIndex, targetPath, targetNode) {
    const dragInfo = window.__hizooDragInfo;
    const dragCard = window.__hizooDraggedAsset;

    // 1. Reordering Categories
    if (dragInfo && dragInfo.type === 'category') {
        // Move dragInfo.node to be a child of targetNode? Or sibling?
        // Standard tree: Drop ON a node -> become child. Drop BETWEEN... is harder to detect without more UI.
        // Let's implement: Drop ON node -> Add as child.

        // Validation: Cannot drop parent into own child
        // Simplified: Move node from A to B.
        if (dragInfo.node.id === targetNode.id) return;

        // Execute move (data structure manipulation)
        // Check local or cross-group?
        if (sidebarStructureRef) {
            const sourceNode = findNode(dragInfo.groupIndex, dragInfo.pathIndices);
            const targetNodeRef = findNode(groupIndex, targetPath);

            if (!targetNodeRef.subs) targetNodeRef.subs = [];

            // Remove from old
            const parentOfSource = findParentNode(dragInfo.groupIndex, dragInfo.pathIndices);
            if (parentOfSource) {
                const idx = dragInfo.pathIndices[dragInfo.pathIndices.length - 1];
                parentOfSource.splice(idx, 1);

                // Add to new
                targetNodeRef.subs.push(sourceNode);

                renderSidebar(sidebarStructureRef);
            }
        }
        return;
    }

    // 2. Dropping Assets (Cards) on Categories
    if (dragCard && dragCard.item) {
        const item = dragCard.item;

        // Find root parent of target
        const group = sidebarStructureRef[groupIndex];
        const targetRoot = group.children[targetPath[0]];
        const targetSub = targetNode;

        const fromParent = assetsStore.currentParent;
        const fromSub = assetsStore.currentSub;

        // Optimistic UI Update: Move in memory store
        // Note: This relies on the convention that "Parent" is the root of the tree
        // and "Sub" can be any node (including the root itself).

        if (fromParent && fromSub && targetRoot && targetSub) {
            // Prevent move if source == target
            if (fromParent.id === targetRoot.id && fromSub.id === targetSub.id) return;

            // 1. Update Store (Pseudo-DB in memory)
            assetsStore.moveUploadedItem(item.id, fromParent.id, fromSub.id, targetRoot.id, targetSub.id);

            // 2. Remove from current view grid immediately
            const currentAssets = assetsStore.getAssets();
            const newAssets = currentAssets.filter(asset => asset.id !== item.id);
            assetsStore.setAssets(newAssets);
            renderGrid(newAssets);

            // 3. Mark as moved for Mock data preventing re-generation
            if (item.id.toString().length < 10) { // Simple heuristic for mock IDs? Or just always mark
                assetsStore.markMockMoved(fromParent.id, fromSub.id, item.id);
            }

            // 4. Backend Sync (Best Effort)
            // Assuming we have an API or some way to map frontend layout to DB IDs
            // For now we assume 'moveCardToCategory' works with DB IDs.
            // But our front-end IDs might be strings 'env', 'neon' etc.
            // Ideally we pass these IDs and backend handles it.
            // moveCardToCategory(item.id, targetSub.id); 

            if (window.showToast) {
                window.showToast(`Moved "${item.title}" to ${targetSub.name}`, 'success');
            }
        }
    }
}

// Helper to find node by path
function findNode(groupIndex, path) {
    let current = sidebarStructureRef[groupIndex].children;
    let node = null;
    path.forEach((idx, i) => {
        if (i === 0) {
            node = current[idx];
        } else {
            node = node.subs[idx];
        }
    });
    return node;
}

function findParentNode(groupIndex, path) {
    // Returns the ARRAY containing the node
    if (path.length === 1) {
        return sidebarStructureRef[groupIndex].children;
    }
    let current = sidebarStructureRef[groupIndex].children[path[0]];
    for (let i = 1; i < path.length - 1; i++) {
        current = current.subs[path[i]];
    }
    return current.subs;
}


// --- Restored/Adapted Helpers ---

export function loadSubCategory(parent, sub) {
    const root = document.documentElement;
    assetsStore.setCurrentCategory(parent, sub);

    root.style.setProperty('--accent', parent.color || '#00f3ff');
    root.style.setProperty('--border-glow', (parent.color || '#00f3ff') + '66');

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.innerHTML = `${parent.name}<span class="page-subtitle">/ ${sub.name}</span>`;
    }

    // Trigger render update to highlight
    renderSidebar(sidebarStructureRef);

    // 根据后端数据和上传数据生成当前分类下的卡片列表
    const uploadedDataStore = assetsStore.getUploadedDataStore();
    const storeKey = `${parent.id}-${sub.id}`;
    const uploaded = uploadedDataStore[storeKey] || [];

    // 后端 buildTreeFromBackend 会把该分类下的卡片挂到 sub.cards 上
    const backendCards = Array.isArray(sub.cards) ? sub.cards : [];

    // 先显示上传/本地新增的卡片，再显示数据库中的卡片
    const assets = [...uploaded, ...backendCards];

    assetsStore.setAssets(assets);
    renderGrid(assets);
    // 过滤标签：优先使用 sub.tags，否则从卡片 tags 汇总
    const filterTags = (sub.tags && sub.tags.length)
        ? sub.tags
        : Array.from(
            new Set(
                assets.flatMap(a => Array.isArray(a.tags) ? a.tags : (a.tag ? [a.tag] : []))
            )
        );
    renderFilters(filterTags, assets);

    if (window.eventBus) {
        window.eventBus.emit('CATEGORY_SELECT', { parent, sub, assets });
    }
}

function startRenameCategory(nameElement, category, groupIndex, pathIndices) {
    const oldName = category.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'category-rename-input';
    input.style.cssText = `
        background: rgba(0, 243, 255, 0.1);
        border: 1px solid var(--accent);
        color: var(--accent);
        padding: 4px 8px;
        font-size: inherit;
        font-family: inherit;
        width: 100%;
        outline: none;
    `;

    nameElement.parentNode.replaceChild(input, nameElement);
    input.focus();
    input.select();

    const finishRename = async () => {
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            category.name = newName;
            renderSidebar(sidebarStructureRef);
            if (window.showToast) window.showToast(`Renamed to "${newName}"`, 'success');
        } else {
            renderSidebar(sidebarStructureRef);
        }
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            renderSidebar(sidebarStructureRef);
        }
    });
}

function startAddCategory(groupIndex, parentPath) {
    const isRoot = parentPath === null;
    const placeholder = isRoot ? 'New Category...' : 'New Subcategory...';

    // Create prompt UI - simplified to standard prompt for now or inline input?
    // User liked the inline input.
    // Finding WHERE to insert input is tricky in recursive tree.
    // Let's use simple prompt for MVP recursion, or append to container.

    // Robust approach: Append a "ghost" node input to the target container.
    // We need to find the DOM element.
    // Since we re-render often, easiest is: update data with a "temp" node, render, then focus it?
    // Or just use window.prompt? User interface suggests inline.

    // We can try finding the container via data attributes if we adding them.
    // Let's add simple valid name check via prompt for speed and reliability in recursion
    // Or stick to the design:

    let name = prompt(placeholder);
    if (!name) return;

    const tempId = `temp-${Date.now()}`;
    const newNode = {
        id: tempId,
        name: name,
        subs: [],
        color: '#00f3ff'
    };

    if (isRoot) {
        if (!sidebarStructureRef[groupIndex].children) sidebarStructureRef[groupIndex].children = [];
        sidebarStructureRef[groupIndex].children.push(newNode);
    } else {
        const parentNode = findNode(groupIndex, parentPath);
        if (!parentNode.subs) parentNode.subs = [];
        parentNode.subs.push(newNode);
    }

    renderSidebar(sidebarStructureRef);
    if (window.showToast) window.showToast('Category created', 'success');
}

function deleteCategory(groupIndex, pathIndices) {
    if (!confirm('Delete this category?')) return;

    const siblings = findParentNode(groupIndex, pathIndices);
    const idx = pathIndices[pathIndices.length - 1];
    siblings.splice(idx, 1);

    renderSidebar(sidebarStructureRef);
    if (window.showToast) window.showToast('Category deleted', 'success');
}

// --- Context Menu System ---

function createSidebarContextMenu() {
    let menu = document.getElementById('sidebarContextMenu');
    if (menu) return;

    menu = document.createElement('div');
    menu.id = 'sidebarContextMenu';
    menu.className = 'context-menu';
    document.body.appendChild(menu);
}

function showContextMenu(x, y, items) {
    const menu = document.getElementById('sidebarContextMenu');
    if (!menu) return;

    menu.innerHTML = '';
    items.forEach(item => {
        if (item.type === 'separator') {
            const sep = document.createElement('div');
            sep.className = 'context-menu-separator';
            menu.appendChild(sep);
            return;
        }

        const el = document.createElement('div');
        el.className = 'context-menu-item';
        if (item.danger) el.style.color = 'var(--c-alert)';

        el.innerHTML = `<i class="${item.icon}"></i> ${item.label}`;
        el.addEventListener('click', () => {
            hideContextMenu();
            item.action();
        });
        menu.appendChild(el);
    });

    menu.style.display = 'flex';

    let posX = x;
    let posY = y;

    const rect = menu.getBoundingClientRect();
    if (posX + rect.width > window.innerWidth) posX -= rect.width;
    if (posY + rect.height > window.innerHeight) posY -= rect.height;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
}

function hideContextMenu() {
    const menu = document.getElementById('sidebarContextMenu');
    if (menu) menu.style.display = 'none';
}
