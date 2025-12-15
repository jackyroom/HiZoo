// 编辑器浮动工具栏：根据文本选择显示/隐藏工具栏

import { getActiveMedia, deleteSelectedMedia } from './editor-media.js';

let updateToolbarStateCallback = null;

export function initFloatingToolbar(updateToolbarStateFn) {
    updateToolbarStateCallback = updateToolbarStateFn;
    
    // 监听文本选择变化
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 监听编辑器内容变化，更新工具栏状态
    const editorContent = document.getElementById('editorContent');
    if (editorContent) {
        editorContent.addEventListener('keyup', updateToolbarStateCallback);
        editorContent.addEventListener('mouseup', updateToolbarStateCallback);
    }
    
    // 监听媒体删除快捷键
    document.addEventListener('keydown', handleMediaDelete);
}

function handleSelectionChange() {
    // 如果有激活的媒体正在调整，隐藏文本工具栏
    if (getActiveMedia()) {
        const toolbar = document.getElementById('floatingToolbar');
        if (toolbar) toolbar.classList.remove('active');
        return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const content = document.getElementById('editorContent');
    if (!content) return;

    if (!content.contains(selection.anchorNode)) {
        const toolbar = document.getElementById('floatingToolbar');
        if (toolbar) toolbar.classList.remove('active');
        return;
    }

    if (selection.isCollapsed) {
        const toolbar = document.getElementById('floatingToolbar');
        if (toolbar) toolbar.classList.remove('active');
        return;
    }

    // 显示浮动工具栏（仅文本选择，不包含图片）
    const toolbar = document.getElementById('floatingToolbar');
    if (!toolbar) return;
    
    const rect = range.getBoundingClientRect();
    toolbar.style.top = (rect.top - 60) + 'px';
    toolbar.style.left = (rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)) + 'px';
    toolbar.classList.add('active');

    if (updateToolbarStateCallback) {
        updateToolbarStateCallback();
    }
}

function handleMediaDelete(e) {
    if (getActiveMedia() && (e.key === 'Delete' || e.key === 'Backspace')) {
        const editorPanel = document.getElementById('editorPanel');
        if (editorPanel && editorPanel.classList.contains('active')) {
            deleteSelectedMedia();
            e.preventDefault();
        }
    }
}

export function hideFloatingToolbar() {
    const toolbar = document.getElementById('floatingToolbar');
    if (toolbar) toolbar.classList.remove('active');
}

