// 编辑器核心：富文本编辑器基础功能

import { escapeHtml } from '../../utils/format.js';
import { hideLinkPanel } from './editor-panels.js';
import { hideResizer } from './editor-media.js';

let isSourceMode = false;
let originalHTML = '';

export function execCmd(command, value = null) {
    document.execCommand(command, false, value);
    const editor = document.getElementById('editorContent');
    if (editor) editor.focus();
}

export function openEditor(structure) {
    const panel = document.getElementById('editorPanel');
    if (!panel) return;
    
    panel.classList.add('active');

    // Populate Category Selector Dynamically
    const catSelect = document.getElementById('artCategory');
    if (!catSelect) return;
    
    catSelect.innerHTML = '';

    // Find the BLOG group
    const blogGroup = structure.find(g => g.group === 'NETWORK');
    if (blogGroup && blogGroup.children) {
        const blogCat = blogGroup.children.find(c => c.id === 'blog');
        if (blogCat) {
            blogCat.subs.forEach(sub => {
                const option = document.createElement('option');
                option.value = `${blogCat.id}-${sub.id}`;
                option.text = `${blogCat.name} / ${sub.name}`;
                catSelect.appendChild(option);
            });
        }
    }
}

export function closeEditor() {
    const panel = document.getElementById('editorPanel');
    if (panel) panel.classList.remove('active');
    
    hideLinkPanel();
    hideResizer();
    if (window.activeMedia) window.activeMedia = null;
}

export function toggleSourceMode() {
    const editor = document.getElementById('editorContent');
    const source = document.getElementById('editorSource');
    const highlight = document.getElementById('editorSourceHighlight');
    const btn = document.getElementById('btnSource');
    
    if (!editor || !source || !highlight || !btn) return;

    isSourceMode = !isSourceMode;

    if (isSourceMode) {
        // Switching TO Source
        let currentHTML = editor.innerHTML;
        
        if (isFormatted) {
            currentHTML = unformatHTML(currentHTML);
        }
        
        originalHTML = currentHTML;
        const formatted = formatHTML(originalHTML);
        source.value = formatted;
        isFormatted = true;
        
        highlight.innerHTML = '<pre><code class="language-html">' + escapeHtml(formatted) + '</code></pre>';
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(highlight.querySelector('code'));
        }

        editor.style.display = 'none';
        source.style.display = 'none';
        highlight.style.display = 'block';
        btn.classList.add('active');

        const floatingToolbar = document.getElementById('floatingToolbar');
        if (floatingToolbar) floatingToolbar.classList.remove('active');
    } else {
        // Switching TO Visual
        let html = source.value.trim();
        
        const wasFormatted = formatHTML(originalHTML);
        const wasEdited = html !== wasFormatted.trim();
        
        if (wasEdited && html) {
            html = unformatHTML(html);
        } else if (!wasEdited && originalHTML) {
            html = originalHTML;
        } else if (!html) {
            html = originalHTML;
        }
        
        editor.innerHTML = '';
        
        if (!html || html.trim() === '') {
            editor.innerHTML = '<p><br></p>';
        } else {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.deleteContents();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            editor.appendChild(fragment);
        }

        editor.style.display = 'block';
        source.style.display = 'none';
        highlight.style.display = 'none';
        btn.classList.remove('active');
        
        originalHTML = editor.innerHTML;
        isFormatted = false;
        
        setTimeout(() => {
            editor.focus();
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }, 50);
    }
    updateStats();
}

let isFormatted = false;

function unformatHTML(html) {
    if (!html) return '';
    const lines = html.split(/\r?\n/);
    const cleaned = lines
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const joined = cleaned.join(' ');
    const normalized = joined.replace(/\s+/g, ' ').trim();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = normalized;
    return tempDiv.innerHTML;
}

function formatHTML(html) {
    let text = html;
    text = text.replace(/<br\s*\/?>/g, '<br>\n');
    text = text.replace(/<\/p>/g, '</p>\n\n');
    text = text.replace(/<\/div>/g, '</div>\n');
    text = text.replace(/<\/h[1-6]>/g, (match) => match + '\n\n');
    text = text.replace(/<\/ul>/g, '</ul>\n');
    text = text.replace(/<\/ol>/g, '</ol>\n');
    text = text.replace(/<\/li>/g, '</li>\n');
    text = text.replace(/<\/pre>/g, '</pre>\n\n');

    const lines = text.split('\n');
    let indentLevel = 0;
    const indentStr = '    ';

    const formatted = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        if (trimmed.match(/^<\/(div|ul|ol|li|p|h[1-6]|pre|blockquote)/)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        const result = indentStr.repeat(indentLevel) + trimmed;

        if (trimmed.match(/^<(div|ul|ol|li|p|h[1-6]|pre|blockquote)/) && !trimmed.match(/\/>/)) {
            indentLevel++;
        }

        return result;
    }).join('\n');

    return formatted;
}

export function updateStats() {
    const editor = document.getElementById('editorContent');
    if (!editor) return;
    
    const text = editor.innerText || '';
    const wordCount = text.replace(/[\s\n\r]/g, '').length;
    const imgCount = editor.querySelectorAll('img, video').length;

    const wEl = document.getElementById('statWords');
    const iEl = document.getElementById('statImg');
    if (wEl) wEl.innerText = wordCount;
    if (iEl) iEl.innerText = imgCount;
}

// Initialize stats update listener
const editorEl = document.getElementById('editorContent');
if (editorEl) {
    editorEl.addEventListener('keyup', updateStats);
}

// Sync source editor changes
const sourceEl = document.getElementById('editorSource');
const highlightEl = document.getElementById('editorSourceHighlight');
if (sourceEl && highlightEl) {
    let highlightTimeout = null;
    sourceEl.addEventListener('input', function() {
        clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => {
            highlightEl.innerHTML = '<pre><code class="language-html">' + escapeHtml(sourceEl.value) + '</code></pre>';
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(highlightEl.querySelector('code'));
            }
        }, 300);
    });
}

// hideLinkPanel and hideResizer are now imported from their respective modules

