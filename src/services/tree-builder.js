function safeParse(str) {
    try { return JSON.parse(str); } catch (_) { return {}; }
}

export function buildTreeFromBackend(categories = [], cards = []) {
    if (!Array.isArray(categories)) return [];

    const nodeMap = new Map();
    categories.forEach(cat => {
        const meta = cat.meta_json ? safeParse(cat.meta_json) : {};
        nodeMap.set(cat.id, {
            id: String(cat.id),
            dbId: cat.id,
            name: cat.name,
            color: meta.color || '#00f3ff',
            subs: [],
            cards: []
        });
    });

    const roots = [];
    categories.forEach(cat => {
        const node = nodeMap.get(cat.id);
        if (cat.parent_id) {
            const parent = nodeMap.get(cat.parent_id);
            if (parent) parent.subs.push(node);
        } else {
            roots.push(node);
        }
    });

    cards.forEach(card => {
        const node = nodeMap.get(card.category_id);
        if (!node) return;
        const attrs = card.attributes_json ? safeParse(card.attributes_json) : {};
        const tags = attrs.tags || [];
        const downloads = attrs.downloads || [];
        const gallery = attrs.gallery || [];
        const thumb = attrs.thumbnail || attrs.cover || '';

        node.cards.push({
            id: card.id,
            dbId: card.id,
            title: card.title,
            type: attrs.type || 'download',
            thumbnail: thumb,
            gallery,
            sources: gallery.length ? [thumb, ...gallery].filter(Boolean) : [thumb].filter(Boolean),
            tag: tags[0] || 'ASSET',
            tags,
            size: attrs.size || '--',
            ver: attrs.version || '1.0',
            downloads,
            content: card.content_body || ''
        });
    });

    return [
        {
            group: 'REMOTE IMPORT',
            children: roots
        }
    ];
}


