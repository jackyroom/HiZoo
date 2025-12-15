// Mock 数据工厂：生成假数据用于演示

// Generate 3D Model Thumbnail
function generate3DThumbnail(seed) {
    const modelPreviews = [
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1614729939124-032f0b8f4d5d?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    ];
    return modelPreviews[seed % modelPreviews.length];
}

export function generateData(parent, sub, uploadedDataStore = {}) {
    const arr = [];
    // First, add uploaded items for this category/subcategory
    const storeKey = `${parent.id}-${sub.id}`;
    if (uploadedDataStore[storeKey] && uploadedDataStore[storeKey].length > 0) {
        arr.push(...uploadedDataStore[storeKey]);
    }
    // Then add generated mock data
    for (let i = 0; i < 6; i++) {
        const tag = sub.tags[i % sub.tags.length];
        let type = 'image';
        let sources = [`https://picsum.photos/seed/${sub.id}${i}/800/600`];

        // Content Type Logic
        if (sub.id === 'video' && i < 3) {
            type = 'video';
            sources = ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'];
        }
        else if (sub.id === 'gallery') {
            type = 'gallery';
            sources = [
                `https://picsum.photos/seed/${sub.id}${i}a/800/600`,
                `https://picsum.photos/seed/${sub.id}${i}b/800/600`,
                `https://picsum.photos/seed/${sub.id}${i}c/800/600`
            ];
        }
        else if (sub.id === 'manuals') {
            type = 'pdf';
            sources = ['https://pdfobject.com/pdf/sample.pdf'];
        }
        else if (sub.id === 'logs' && parent.id === 'docs') {
            type = 'txt';
            sources = ['LOG_DATA'];
        }
        else if (sub.id === 'vehicles' || sub.id === 'chars') {
            type = 'model';
            sources = ['MOCK_3D_MODEL'];
        }
        else if (parent.id === 'audio') {
            type = 'audio';
            const audioSamples = [
                'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
                'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipses.mp3',
                'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Lobo_Loco/Vagabond/Lobo_Loco_-_06_-_Kick_Push_Vagabond.mp3',
            ];
            sources = [audioSamples[i % audioSamples.length]];
        }

        // Thumbnails
        let thumb = sources[0];
        if (type === 'video') thumb = `https://picsum.photos/seed/${sub.id}${i}/400/300?blur=2`;
        if (type === 'pdf') thumb = `https://placehold.co/400x300/1a1a1a/FFF?text=PDF+DOC`;
        if (type === 'txt') thumb = `https://placehold.co/400x300/000/00f3ff?text=TXT+LOG&font=monospace`;
        if (type === 'model') {
            thumb = generate3DThumbnail(i);
        }
        if (type === 'audio') {
            thumb = `https://placehold.co/400x300/101015/ff0055?text=AUDIO+WAVE&font=monospace`;
        }

        const entry = {
            title: `${sub.name}_${type.toUpperCase()}_${i + 100}`,
            type: type,
            thumbnail: thumb,
            sources: sources,
            tag: tag,
            size: (Math.random() * 400 + 10).toFixed(1) + ' MB',
            ver: 'v.' + (Math.random() * 5 + 1).toFixed(1)
        };

        if (type === 'model') {
            entry.polyCount = Math.floor(Math.random() * 50000 + 1000);
            entry.vertCount = Math.floor(Math.random() * 30000 + 500);
        }
        if (type === 'audio') {
            entry.fmt = 'MP3';
        }

        arr.push(entry);
    }
    return arr;
}



