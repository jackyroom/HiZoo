// 资源管理面板：仅负责查看 / 筛选 / 编辑 / 删除资源

let recentUploads = [];
let editingSet = new Set();
let manageState = {
    page: 1,
    pageSize: 20,
    total: 0,
    q: '',
    category: '',
    subCategory: ''
};

export function openManagePanel() {
    const panel = document.getElementById('managePanel');
    const modal = document.getElementById('modal');
    const modalPanel = document.getElementById('modalPanel');

    if (panel) panel.classList.add('active');
    if (modal) modal.classList.add('active');
    if (modalPanel) modalPanel.style.display = 'none';

    // 每次打开刷新列表
    loadRecentUploads();
}

export function closeManagePanel() {
    const panel = document.getElementById('managePanel');
    const modal = document.getElementById('modal');
    const modalPanel = document.getElementById('modalPanel');

    if (panel) panel.classList.remove('active');

    // 如果没有其它面板打开，则还原模态
    const uploadPanel = document.getElementById('uploadPanel');
    const anyActive = uploadPanel && uploadPanel.classList.contains('active');
    if (!anyActive) {
        if (modal) modal.classList.remove('active');
        if (modalPanel) modalPanel.style.display = 'flex';
    }
}

export function bindManagePanel(structure) {
    initManageFilters(structure);
}

function initManageFilters(structure) {
    const catSel = document.getElementById('rmCategory');
    const subSel = document.getElementById('rmSubCategory');
    const searchInput = document.getElementById('rmSearch');

    if (catSel) {
        catSel.innerHTML = '<option value=\"\">全部分类</option>';
        structure.forEach(group => {
            (group.children || []).forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.innerText = cat.name;
                catSel.appendChild(opt);
            });
        });

        catSel.onchange = () => {
            manageState.category = catSel.value || '';
            // 重置子类
            if (subSel) {
                subSel.innerHTML = '<option value=\"\">全部子类</option>';
                if (manageState.category) {
                    structure.forEach(group => {
                        (group.children || []).forEach(cat => {
                            if (cat.name === manageState.category) {
                                (cat.subs || []).forEach(sub => {
                                    const opt = document.createElement('option');
                                    opt.value = sub.name;
                                    opt.innerText = sub.name;
                                    subSel.appendChild(opt);
                                });
                            }
                        });
                    });
                }
                manageState.subCategory = '';
            }
            manageState.page = 1;
            loadRecentUploads();
        };
    }

    if (subSel) {
        subSel.onchange = () => {
            manageState.subCategory = subSel.value || '';
            manageState.page = 1;
            loadRecentUploads();
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            manageState.q = searchInput.value || '';
            manageState.page = 1;
            if (searchInput._timer) clearTimeout(searchInput._timer);
            searchInput._timer = setTimeout(() => {
                loadRecentUploads();
            }, 300);
        };
    }
}

async function loadRecentUploads() {
    const listEl = document.getElementById('recentList');
    if (!listEl) return;
    listEl.innerHTML = '<div style=\"text-align:center; color:#444; padding:14px; font-size:11px;\">加载中...</div>';
    try {
        const params = new URLSearchParams();
        params.set('page', String(manageState.page || 1));
        params.set('pageSize', String(manageState.pageSize || 20));
        if (manageState.q && manageState.q.trim()) params.set('q', manageState.q.trim());
        if (manageState.category) params.set('category', manageState.category);
        if (manageState.subCategory) params.set('subCategory', manageState.subCategory);

        const res = await fetch(`/api/uploads/list?${params.toString()}`);
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        recentUploads = data?.items || [];
        manageState.total = data?.total || recentUploads.length || 0;
        renderRecentList();
    } catch (err) {
        listEl.innerHTML = '<div style=\"text-align:center; color:#c44; padding:14px; font-size:11px;\">加载失败</div>';
    }
}

function renderRecentList() {
    const listEl = document.getElementById('recentList');
    const pagerEl = document.getElementById('recentPager');
    const structure = window.structure || [];
    if (!listEl) return;
    if (!recentUploads.length) {
        listEl.innerHTML = '<div style=\"text-align:center; color:#444; padding:14px; font-size:11px;\">暂无数据</div>';
        if (pagerEl) pagerEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = '';
    recentUploads.forEach((item) => {
        const links = (item.downloads || []).slice().sort((a, b) => {
            const la = (a.label || '').toLowerCase();
            const lb = (b.label || '').toLowerCase();
            if (la === lb) return 0;
            if (la.includes('recent') || la.includes('新') || la.includes('latest')) return -1;
            if (lb.includes('recent') || lb.includes('新') || lb.includes('latest')) return 1;
            return la.localeCompare(lb);
        });
        const tags = item.tags || [];
        const thumb = item.thumbnail || (item.gallery && item.gallery[0]) || '';
        const cat = item.categoryPath?.[0] || '';
        const sub = item.categoryPath?.[1] || '';
        const catOptions = buildCategoryOptions(structure, cat);
        const subOptions = buildSubOptions(structure, cat, sub);
        const row = document.createElement('div');
        row.className = 'recent-item';
        if (editingSet.has(item.id)) row.classList.add('editing');
        row.innerHTML = `
            <div class=\"recent-view\">
                <div class=\"recent-thumb\">
                    ${thumb ? `<img src=\"${thumb}\" alt=\"thumb\" />` : '<div class=\"recent-thumb-placeholder\">NO COVER</div>'}
                </div>
                <div class=\"recent-head\">
                    <div class=\"recent-title\">${item.title || '未命名'}</div>
                    <div class=\"recent-meta\">${(item.categoryPath || []).join(' / ') || '未分类'} · ${item.size || '--'}</div>
                </div>
                <div class=\"recent-tags-line\">
                    ${tags.slice(0, 3).map(t => `<span class=\"recent-tag\">${t}</span>`).join('')}
                </div>
                <div class=\"recent-view-actions\">
                    <span class=\"recent-edit-btn\" data-action=\"enter-edit\">编辑</span>
                </div>
            </div>
            <div class=\"recent-edit\">
                <div class=\"recent-cat-row\">
                    <select class=\"cyber-input recent-select\" data-field=\"cat\">${catOptions}</select>
                    <select class=\"cyber-input recent-select\" data-field=\"sub\">${subOptions}</select>
                </div>
                <input class=\"cyber-input recent-input\" placeholder=\"Link\" value=\"${links[0]?.url || ''}\" data-field=\"link1\" />
                <input class=\"cyber-input recent-input\" placeholder=\"Link2\" value=\"${links[1]?.url || ''}\" data-field=\"link2\" />
                <input class=\"cyber-input recent-input\" placeholder=\"Link3\" value=\"${links[2]?.url || ''}\" data-field=\"link3\" />
                <input class=\"cyber-input recent-input\" placeholder=\"标签，逗号分隔\" value=\"${tags.join(',')}\" data-field=\"tags\" />
                <textarea class=\"cyber-input recent-textarea\" placeholder=\"描述\" data-field=\"desc\">${item.description || ''}</textarea>
                <div class=\"recent-actions\">
                    <button class=\"cyber-btn\" data-action=\"save\">保存</button>
                    <button class=\"cyber-btn danger\" data-action=\"delete\">删除</button>
                    <span class=\"recent-close\" data-action=\"close-edit\">收起</span>
                </div>
            </div>
        `;

        // 防止点击按钮冒泡触发折叠
        row.querySelectorAll('[data-action="save"],[data-action="delete"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        // 编辑/收起
        row.querySelectorAll('[data-action="enter-edit"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editingSet.add(item.id);
                row.classList.add('editing');
            });
        });
        row.querySelectorAll('[data-action="close-edit"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editingSet.delete(item.id);
                row.classList.remove('editing');
            });
        });

        // 卡片空白区域点击切换编辑
        row.addEventListener('click', (e) => {
            const isControl = e.target.closest('button, input, textarea, select, a, .recent-edit-btn');
            if (isControl) return;
            if (row.classList.contains('editing')) {
                editingSet.delete(item.id);
                row.classList.remove('editing');
            } else {
                editingSet.add(item.id);
                row.classList.add('editing');
            }
        });

        row.querySelectorAll('[data-action="save"],[data-action="delete"]').forEach((btn) => {
            btn.addEventListener('click', () => handleRecentAction(item, row, btn.getAttribute('data-action')));
        });

        // 分类切换时，刷新子分类选项
        const catSelect = row.querySelector('[data-field=\"cat\"]');
        const subSelect = row.querySelector('[data-field=\"sub\"]');
        if (catSelect && subSelect) {
            catSelect.addEventListener('change', () => {
                const newCat = catSelect.value;
                subSelect.innerHTML = buildSubOptions(structure, newCat, '');
            });
        }

        listEl.appendChild(row);
    });

    if (pagerEl) {
        const totalPages = Math.max(Math.ceil((manageState.total || 0) / manageState.pageSize), 1);
        pagerEl.innerHTML = '';
        const info = document.createElement('span');
        info.textContent = `第 ${manageState.page}/${totalPages} 页，共 ${manageState.total} 条`;
        const controls = document.createElement('div');

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.disabled = manageState.page <= 1;
        prevBtn.onclick = () => {
            if (manageState.page > 1) {
                manageState.page -= 1;
                loadRecentUploads();
            }
        };

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.disabled = manageState.page >= totalPages;
        nextBtn.onclick = () => {
            if (manageState.page < totalPages) {
                manageState.page += 1;
                loadRecentUploads();
            }
        };

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        pagerEl.appendChild(info);
        pagerEl.appendChild(controls);
    }
}

async function handleRecentAction(item, rowEl, action) {
    if (action === 'delete') {
        if (!confirm(`确认删除：${item.title}?`)) return;
        try {
            const res = await fetch(`/api/uploads/${item.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('删除失败');
            recentUploads = recentUploads.filter((x) => x.id !== item.id);
            renderRecentList();
            alert('已删除');
        } catch (err) {
            alert(err.message || '删除失败');
        }
        return;
    }

    const link1 = rowEl.querySelector('[data-field=\"link1\"]')?.value || '';
    const link2 = rowEl.querySelector('[data-field=\"link2\"]')?.value || '';
    const link3 = rowEl.querySelector('[data-field=\"link3\"]')?.value || '';
    const tags = rowEl.querySelector('[data-field=\"tags\"]')?.value || '';
    const desc = rowEl.querySelector('[data-field=\"desc\"]')?.value || '';
    const cat = rowEl.querySelector('[data-field=\"cat\"]')?.value || '';
    const sub = rowEl.querySelector('[data-field=\"sub\"]')?.value || '';

    try {
        const res = await fetch(`/api/uploads/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                links: [link1, link2, link3],
                tags,
                description: desc,
                categoryName: cat || item.categoryPath?.[0] || '',
                subCategory: sub || ''
            })
        });
        if (!res.ok) throw new Error('保存失败');
        alert('已保存并同步 CSV');
        editingSet.delete(item.id);
        loadRecentUploads();
    } catch (err) {
        alert(err.message || '保存失败');
    }
}

function buildCategoryOptions(structure, selected) {
    let html = '<option value=\"\">选择分类</option>';
    structure.forEach(group => {
        (group.children || []).forEach(cat => {
            const sel = cat.name === selected ? 'selected' : '';
            html += `<option value=\"${cat.name}\" ${sel}>${cat.name}</option>`;
        });
    });
    return html;
}

function buildSubOptions(structure, categoryName, selected) {
    let html = '<option value=\"\">选择子分类</option>';
    if (!categoryName) return html;
    structure.forEach(group => {
        (group.children || []).forEach(cat => {
            if (cat.name === categoryName) {
                (cat.subs || []).forEach(sub => {
                    const sel = sub.name === selected ? 'selected' : '';
                    html += `<option value=\"${sub.name}\" ${sel}>${sub.name}</option>`;
                });
            }
        });
    });
    return html;
}




