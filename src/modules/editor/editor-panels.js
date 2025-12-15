// 编辑器面板：链接面板、表格面板等

import { execCmd } from './editor-core.js';
import { initTableHandlers } from './editor-table.js';

export function showLinkPanel() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const editor = document.getElementById('editorContent');
    if (!editor || !editor.contains(selection.anchorNode)) return;

    const panel = document.getElementById('linkPanel');
    if (!panel) return;

    panel.style.top = (rect.bottom + 10) + 'px';
    panel.style.left = rect.left + 'px';
    panel.classList.add('active');

    const input = document.getElementById('linkUrl') || document.getElementById('linkInput');
    if (input) {
        input.value = '';
        input.focus();
    }

    window.savedRange = range.cloneRange();
}

export function hideLinkPanel() {
    const panel = document.getElementById('linkPanel');
    if (panel) panel.classList.remove('active');
}

export function confirmLink() {
    const input = document.getElementById('linkUrl') || document.getElementById('linkInput');
    const url = input ? input.value : '';
    
    if (url && window.savedRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(window.savedRange);
        execCmd('createLink', url);
    }
    hideLinkPanel();
}

export function showTablePanel() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const editor = document.getElementById('editorContent');
    if (!editor || !editor.contains(selection.anchorNode)) return;

    const panel = document.getElementById('tablePanel');
    if (!panel) return;

    panel.style.top = (rect.bottom + 10) + 'px';
    panel.style.left = rect.left + 'px';
    panel.classList.add('active');

    window.savedTableRange = range.cloneRange();
}

export function hideTablePanel() {
    const panel = document.getElementById('tablePanel');
    if (panel) panel.classList.remove('active');
}

export function insertTable() {
    const rowsInput = document.getElementById('tableRows');
    const colsInput = document.getElementById('tableCols');
    const rows = parseInt(rowsInput?.value) || 3;
    const cols = parseInt(colsInput?.value) || 3;
    
    let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid rgba(0, 243, 255, 0.3);">';
    
    for (let i = 0; i < rows; i++) {
        tableHtml += '<tr>';
        for (let j = 0; j < cols; j++) {
            const cellTag = i === 0 ? 'th' : 'td';
            tableHtml += `<${cellTag} style="border: 1px solid rgba(0, 243, 255, 0.2); padding: 8px; min-width: 50px; min-height: 30px; position: relative; background: ${i === 0 ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'};"><br></${cellTag}>`;
        }
        tableHtml += '</tr>';
    }
    tableHtml += '</table><p><br></p>';
    
    if (window.savedTableRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(window.savedTableRange);
    }
    
    document.execCommand('insertHTML', false, tableHtml);
    hideTablePanel();
    
            // Initialize table handlers after insertion
            setTimeout(() => {
                const editor = document.getElementById('editorContent');
                const insertedTable = editor?.querySelector('table:last-of-type');
                if (insertedTable && window.initTableHandlers) {
                    window.initTableHandlers(insertedTable);
                }
            }, 100);
}

export function bindEditorPanels() {
    // Link panel buttons
    const linkApply = Array.from(document.querySelectorAll('.tool-btn')).find(b => 
        b.textContent && (b.textContent.includes('✔') || b.innerHTML.includes('ph-check')));
    const linkCancel = Array.from(document.querySelectorAll('.tool-btn')).find(b => 
        b.textContent && b.textContent.includes('CANCEL') && b.closest('#linkPanel'));
    
    if (linkApply) linkApply.addEventListener('click', confirmLink);
    if (linkCancel) linkCancel.addEventListener('click', hideLinkPanel);
    
    // Table panel buttons
    const tableInsert = Array.from(document.querySelectorAll('.tool-btn')).find(b => 
        b.textContent && b.textContent.includes('INSERT') && b.closest('#tablePanel'));
    const tableCancel = Array.from(document.querySelectorAll('.tool-btn')).find(b => 
        b.textContent && b.textContent.includes('CANCEL') && b.closest('#tablePanel'));

    if (tableInsert) tableInsert.addEventListener('click', insertTable);
    if (tableCancel) tableCancel.addEventListener('click', hideTablePanel);
}

