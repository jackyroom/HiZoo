// 编辑器颜色选择器

import { execCmd } from './editor-core.js';

const colors = [
    '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
    '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada',
    '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5',
    '#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f',
    '#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09',
    '#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806',
    '#00f3ff', '#ff0055', '#00ffaa', '#ffcc00', '#ff9900'
];

let recentColors = [];

export function initColorPicker() {
    const foreGrid = document.getElementById('foreColorGrid');
    const backGrid = document.getElementById('backColorGrid');
    if (!foreGrid || !backGrid) return;
    
    foreGrid.innerHTML = '';
    backGrid.innerHTML = '';
    
    colors.forEach(c => {
        let div = document.createElement('div');
        div.className = 'color-cell';
        div.style.backgroundColor = c;
        div.addEventListener('click', () => applyColor('foreColor', c));
        foreGrid.appendChild(div);
        
        div = document.createElement('div');
        div.className = 'color-cell';
        div.style.backgroundColor = c;
        div.addEventListener('click', () => applyColor('backColor', c));
        backGrid.appendChild(div);
    });
}

function applyColor(cmd, color) {
    execCmd(cmd, color);
    toggleDropdown('colorDropdown');
    addToRecentColors(color);
}

function addToRecentColors(color) {
    if (recentColors.includes(color)) return;
    recentColors.unshift(color);
    if (recentColors.length > 8) recentColors.pop();
    renderRecentColors();
}

function renderRecentColors() {
    const container = document.getElementById('recentColors');
    if (!container) return;
    
    container.innerHTML = '';
    recentColors.forEach(c => {
        let div = document.createElement('div');
        div.className = 'color-cell';
        div.style.backgroundColor = c;
        div.addEventListener('click', () => {
            const isBack = document.querySelectorAll('.color-tab')[1]?.classList.contains('active');
            applyColor(isBack ? 'backColor' : 'foreColor', c);
        });
        container.appendChild(div);
    });
}

export function toggleDropdown(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const el = document.getElementById(id);
    if (!el) return;
    const isShown = el.classList.contains('show');
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    if (!isShown) {
        el.classList.add('show');
    }
}

export function switchColorTab(tab) {
    document.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.color-grid').forEach(g => g.style.display = 'none');

    if (tab === 'fore') {
        const tabs = document.querySelectorAll('.color-tab');
        if (tabs[0]) tabs[0].classList.add('active');
        const foreGrid = document.getElementById('foreColorGrid');
        if (foreGrid) foreGrid.style.display = 'grid';
    } else {
        const tabs = document.querySelectorAll('.color-tab');
        if (tabs[1]) tabs[1].classList.add('active');
        const backGrid = document.getElementById('backColorGrid');
        if (backGrid) backGrid.style.display = 'grid';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.toolbar-dropdown') && 
        !event.target.closest('.dropdown-content') && 
        !event.target.closest('.color-picker-panel')) {
        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    }
});


