// 编辑器工具栏：工具栏按钮绑定和命令处理

import { execCmd } from './editor-core.js';
import { showLinkPanel, showTablePanel } from './editor-panels.js';
import { insertCodeBlock, insertHorizontalRule } from './editor-inserts.js';

export function bindEditorToolbar() {
    const toolbar = document.querySelector('.editor-toolbar');
    if (!toolbar) return;
    
    // 按 data-cmd 绑定 execCommand
    toolbar.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
        const cmd = btn.getAttribute('data-cmd');
        btn.addEventListener('click', () => execCmd(cmd));
    });

    const codeBtn = document.getElementById('btnSource');
    if (codeBtn) {
        codeBtn.addEventListener('click', () => {
            if (window.toggleSourceMode) window.toggleSourceMode();
        });
    }

    const linkBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('link'));
    if (linkBtn) linkBtn.addEventListener('click', showLinkPanel);

    const tableBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('insert table'));
    if (tableBtn) tableBtn.addEventListener('click', showTablePanel);

    const imgBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('insert image'));
    const videoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('insert video'));
    if (imgBtn) imgBtn.addEventListener('click', () => triggerFileUpload('image'));
    if (videoBtn) videoBtn.addEventListener('click', () => triggerFileUpload('video'));

    const undoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('undo'));
    const redoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('redo'));
    if (undoBtn) undoBtn.addEventListener('click', () => execCmd('undo'));
    if (redoBtn) redoBtn.addEventListener('click', () => execCmd('redo'));

    // Code block and horizontal rule
    const codeBlockBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('code block'));
    const hrBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => 
        b.title && b.title.toLowerCase().includes('horizontal line'));
    if (codeBlockBtn) codeBlockBtn.addEventListener('click', insertCodeBlock);
    if (hrBtn) hrBtn.addEventListener('click', insertHorizontalRule);
}

export function triggerFileUpload(type) {
    if (type === 'image') {
        const input = document.getElementById('editorImgInput');
        if (input) input.click();
    }
    if (type === 'video') {
        const input = document.getElementById('editorVidInput');
        if (input) input.click();
    }
}

export function handleEditorUpload(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        if (type === 'image') {
            execCmd('insertImage', e.target.result);
        } else {
            const videoHtml = `<br><video src="${e.target.result}" controls style="max-width:100%; border:1px solid var(--accent); margin:10px 0;"></video><br>`;
            document.execCommand('insertHTML', false, videoHtml);
        }
    };
    reader.readAsDataURL(file);
    input.value = '';
}

