// 编辑器发布功能

import { closeEditor } from './editor-core.js';
import { clearArticleCover, getArticleCover } from './editor-cover.js';
import { loadSubCategory } from '../../modules/layout/sidebar.js';

let uploadedDataStore = {};

export function handlePublish(structure) {
    const title = document.getElementById('artTitle')?.value.trim();
    const tags = document.getElementById('artTags')?.value.trim();
    const catValue = document.getElementById('artCategory')?.value; // "blog-articles"
    const cover = getArticleCover() || '';
    const content = document.getElementById('editorContent')?.innerHTML;

    if (!title) {
        alert('Please enter a title.');
        return;
    }

    const [catId, subId] = catValue.split('-');

    // Create New Article Asset
    const newArticle = {
        title: title,
        type: 'article',
        size: (content.length / 1024).toFixed(1) + ' KB',
        ver: 'v.1.0',
        thumbnail: cover || 'https://placehold.co/600x400/00ffaa/000?text=ARTICLE',
        sources: [],
        content: content,
        tag: tags.split(',')[0].trim().toUpperCase() || 'BLOG',
        description: "NEURAL LOG ENTRY"
    };

    // Store in Uploaded Data Store
    if (!uploadedDataStore[catValue]) {
        uploadedDataStore[catValue] = [];
    }
    uploadedDataStore[catValue].unshift(newArticle);

    // Navigate to the category
    let foundCat, foundSub;
    structure.forEach(g => {
        g.children.forEach(c => {
            if (c.id === catId) {
                foundCat = c;
                c.subs.forEach(s => {
                    if (s.id === subId) foundSub = s;
                });
            }
        });
    });

    if (foundCat && foundSub) {
        loadSubCategory(foundCat, foundSub);
    }

    closeEditor();

    // Reset Editor
    const artTitle = document.getElementById('artTitle');
    const artTags = document.getElementById('artTags');
    const editorContent = document.getElementById('editorContent');
    
    if (artTitle) artTitle.value = '';
    if (artTags) artTags.value = '';
    clearArticleCover();
    if (editorContent) editorContent.innerHTML = '<p><br></p>';
}

export function getUploadedDataStore() {
    return uploadedDataStore;
}


