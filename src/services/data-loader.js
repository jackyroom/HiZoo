// 数据加载器：只从后端 /api/tree 读取分类与卡片

import { buildTreeFromBackend } from './tree-builder.js';

export async function loadTaxonomy() {
    try {
        const apiRes = await fetch('/api/tree', { cache: 'no-cache' });
        if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && apiData.success) {
                const categories = apiData.categories || [];
                const cards = apiData.cards || [];
                const treeStructure = buildTreeFromBackend(categories, cards);
                return {
                    structure: treeStructure,
                    backend: { categories, cards }
                };
            }
        }
        // 后端没有返回成功时，前端不再提供任何默认分类
        return { structure: [], backend: null };
    } catch (err) {
        console.warn('[DataLoader] 调用 /api/tree 失败', err);
        return { structure: [], backend: null };
    }
}

