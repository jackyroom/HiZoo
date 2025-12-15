// 数据加载器：负责读取 taxonomy.json 并解析

const defaultStructure = [
    {
        group: 'MAIN DATABASE',
        children: [
            {
                id: 'env', name: 'ENVIRONMENTS', color: '#00f3ff',
                subs: [
                    { id: 'neon', name: 'Neon City', tags: ['Night', 'Rain', 'Lights'] },
                    { id: 'waste', name: 'Wasteland', tags: ['Dust', 'Ruins', 'Sun'] }
                ]
            },
            {
                id: 'evidence', name: 'EVIDENCE', color: '#ff0055',
                subs: [
                    { id: 'gallery', name: 'Scene Gallery', tags: ['Multi-View', 'Photos', 'Evidence'] },
                    { id: 'video', name: 'Surveillance', tags: ['Footage', 'CCTV', 'Night Vision'] }
                ]
            }
        ]
    },
    {
        group: 'ARCHIVES',
        children: [
            {
                id: 'docs', name: 'DOCUMENTS', color: '#ffcc00',
                subs: [
                    { id: 'manuals', name: 'Manuals', tags: ['PDF', 'Blueprint', 'Tech'] },
                    { id: 'logs', name: 'Mission Logs', tags: ['Text', 'Report', 'Encrypted'] }
                ]
            }
        ]
    },
    {
        group: '3D ASSETS',
        children: [
            {
                id: 'models', name: 'MODELS', color: '#ff9900',
                subs: [
                    { id: 'vehicles', name: 'Vehicles', tags: ['Cyber', 'Transport', 'Air'] },
                    { id: 'chars', name: 'Characters', tags: ['Droid', 'Humanoid', 'NPC'] }
                ]
            }
        ]
    },
    {
        group: 'AUDIO LOGS',
        children: [
            {
                id: 'audio', name: 'RECORDS', color: '#ff0055',
                subs: [
                    { id: 'logs', name: 'Voice Logs', tags: ['Voice', 'Encrypted'] },
                    { id: 'music', name: 'Synthwave', tags: ['Music', 'Ambient'] }
                ]
            }
        ]
    },
    {
        group: 'NETWORK',
        children: [
            {
                id: 'blog', name: 'BLOG', color: '#00ffaa',
                subs: [
                    { id: 'articles', name: 'Articles', tags: ['News', 'Tech', 'Cyber'] },
                    { id: 'notes', name: 'Notes', tags: ['Draft', 'Memo'] }
                ]
            }
        ]
    }
];

export async function loadTaxonomy() {
    try {
        // file:// 场景下直接使用内置默认结构，避免 fetch 被浏览器拦截
        if (location.protocol === 'file:') {
            return defaultStructure;
        }
        const res = await fetch('src/config/taxonomy.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
        return defaultStructure;
    } catch (err) {
        console.warn('[DataLoader] 加载 taxonomy.json 失败，回退默认结构', err);
        return defaultStructure;
    }
}



