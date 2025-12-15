// 编辑器表格处理：表格调整、选择、上下文菜单等

// Table selection state
let tableSelectionState = {
    isSelecting: false,
    startCell: null,
    endCell: null,
    selectedCells: []
};

let currentTableContext = { table: null, cell: null };

export function initTableResize() {
    const editor = document.getElementById('editorContent');
    if (!editor) return;
    
    const tables = editor.querySelectorAll('table');
    
    tables.forEach(table => {
        // Remove existing handles
        table.querySelectorAll('.table-resize-handle').forEach(h => h.remove());
        
        // Add column resize handles
        const firstRow = table.querySelector('tr');
        if (firstRow) {
            const cells = firstRow.querySelectorAll('th, td');
            cells.forEach((cell, index) => {
                const handle = document.createElement('div');
                handle.className = 'table-resize-handle col-resize';
                handle.dataset.colIndex = index;
                cell.style.position = 'relative';
                cell.appendChild(handle);
                
                let isResizing = false;
                let startX = 0;
                let startWidth = 0;
                
                handle.addEventListener('mousedown', (e) => {
                    isResizing = true;
                    startX = e.clientX;
                    startWidth = cell.offsetWidth;
                    document.addEventListener('mousemove', resizeCol);
                    document.addEventListener('mouseup', stopResizeCol);
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                function resizeCol(e) {
                    if (!isResizing) return;
                    const diff = e.clientX - startX;
                    const newWidth = startWidth + diff;
                    if (newWidth > 30) {
                        const allRows = table.querySelectorAll('tr');
                        allRows.forEach(row => {
                            const targetCell = row.querySelectorAll('th, td')[index];
                            if (targetCell) {
                                targetCell.style.width = newWidth + 'px';
                            }
                        });
                    }
                }
                
                function stopResizeCol() {
                    isResizing = false;
                    document.removeEventListener('mousemove', resizeCol);
                    document.removeEventListener('mouseup', stopResizeCol);
                }
            });
        }
        
        // Add row resize handles
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const firstCell = row.querySelector('th, td');
            if (firstCell) {
                const handle = document.createElement('div');
                handle.className = 'table-resize-handle row-resize';
                handle.dataset.rowIndex = index;
                firstCell.style.position = 'relative';
                firstCell.appendChild(handle);
                
                let isResizing = false;
                let startY = 0;
                let startHeight = 0;
                
                handle.addEventListener('mousedown', (e) => {
                    isResizing = true;
                    startY = e.clientY;
                    startHeight = row.offsetHeight;
                    document.addEventListener('mousemove', resizeRow);
                    document.addEventListener('mouseup', stopResizeRow);
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                function resizeRow(e) {
                    if (!isResizing) return;
                    const diff = e.clientY - startY;
                    const newHeight = startHeight + diff;
                    if (newHeight > 20) {
                        row.style.height = newHeight + 'px';
                    }
                }
                
                function stopResizeRow() {
                    isResizing = false;
                    document.removeEventListener('mousemove', resizeRow);
                    document.removeEventListener('mouseup', stopResizeRow);
                }
            }
        });
    });
}

export function attachTableClickHandlers() {
    const editor = document.getElementById('editorContent');
    if (!editor) return;
    
    const tables = editor.querySelectorAll('table');
    
    tables.forEach(table => {
        if (!table.dataset.tableHandlerAttached) {
            table.dataset.tableHandlerAttached = 'true';
            
            // Single click - show toolbar
            table.addEventListener('click', (e) => {
                if (e.target.closest('td, th') && !e.target.classList.contains('table-resize-handle')) {
                    const cell = e.target.closest('td, th');
                    if (!e.ctrlKey && !e.metaKey && !tableSelectionState.isSelecting) {
                        clearTableSelection(table);
                        showTableToolbar(table, cell);
                    }
                }
            });
            
            // Mouse down - start selection
            table.addEventListener('mousedown', (e) => {
                if (e.target.closest('td, th') && !e.target.classList.contains('table-resize-handle')) {
                    const cell = e.target.closest('td, th');
                    if (e.button === 0) {
                        tableSelectionState.isSelecting = true;
                        tableSelectionState.startCell = cell;
                        tableSelectionState.endCell = cell;
                        clearTableSelection(table);
                        cell.classList.add('selected');
                        e.preventDefault();
                    }
                }
            });
            
            // Mouse move - extend selection
            table.addEventListener('mousemove', (e) => {
                if (tableSelectionState.isSelecting && tableSelectionState.startCell) {
                    const cell = e.target.closest('td, th');
                    if (cell && !cell.classList.contains('table-resize-handle')) {
                        tableSelectionState.endCell = cell;
                        updateTableSelection(table);
                    }
                }
            });
            
            // Right-click context menu
            table.addEventListener('contextmenu', (e) => {
                if (e.target.closest('td, th') && !e.target.classList.contains('table-resize-handle')) {
                    e.preventDefault();
                    const cell = e.target.closest('td, th');
                    showTableContextMenu(table, cell, e.clientX, e.clientY);
                }
            });
        }
    });
}

// Global mouseup handler for table selection
document.addEventListener('mouseup', (e) => {
    if (tableSelectionState.isSelecting) {
        tableSelectionState.isSelecting = false;
        const editor = document.getElementById('editorContent');
        if (editor) {
            const selectingCells = editor.querySelectorAll('td.selecting, th.selecting');
            selectingCells.forEach(cell => {
                cell.classList.remove('selecting');
                cell.classList.add('selected');
            });
            
            if (tableSelectionState.selectedCells.length > 1 || selectingCells.length > 1) {
                const selectedCells = Array.from(editor.querySelectorAll('td.selected, th.selected'));
                if (selectedCells.length > 1) {
                    showBatchTableEditMenu(selectedCells, e.clientX, e.clientY);
                }
            }
        }
    }
});

function clearTableSelection(table) {
    const cells = table.querySelectorAll('td.selected, th.selected, td.selecting, th.selecting');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'selecting');
    });
    tableSelectionState.selectedCells = [];
}

function updateTableSelection(table) {
    const allCells = table.querySelectorAll('td, th');
    allCells.forEach(cell => {
        cell.classList.remove('selecting');
    });
    
    if (!tableSelectionState.startCell || !tableSelectionState.endCell) return;
    
    const startRow = tableSelectionState.startCell.parentElement.rowIndex;
    const startCol = Array.from(tableSelectionState.startCell.parentElement.children).indexOf(tableSelectionState.startCell);
    const endRow = tableSelectionState.endCell.parentElement.rowIndex;
    const endCol = Array.from(tableSelectionState.endCell.parentElement.children).indexOf(tableSelectionState.endCell);
    
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const rows = table.querySelectorAll('tr');
    tableSelectionState.selectedCells = [];
    
    for (let r = minRow; r <= maxRow; r++) {
        const row = rows[r];
        if (row) {
            const cells = row.querySelectorAll('td, th');
            for (let c = minCol; c <= maxCol; c++) {
                if (cells[c]) {
                    cells[c].classList.add('selecting');
                    tableSelectionState.selectedCells.push(cells[c]);
                }
            }
        }
    }
}

function showBatchTableEditMenu(selectedCells, x, y) {
    const menu = document.getElementById('tableContextMenu');
    if (!menu) return;
    
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
    
    window.batchSelectedCells = selectedCells;
    
    const title = menu.querySelector('.context-menu-title');
    if (title && selectedCells.length > 1) {
        const originalTitle = title.dataset.originalTitle || title.innerText;
        title.dataset.originalTitle = originalTitle;
        title.innerText = `SELECTED: ${selectedCells.length} CELLS`;
    }
}

export function showTableToolbar(table, cell) {
    const toolbar = document.getElementById('tableControls');
    if (!toolbar) return;
    
    const rect = cell.getBoundingClientRect();
    toolbar.style.top = (rect.bottom + 10) + 'px';
    toolbar.style.left = rect.left + 'px';
    toolbar.classList.add('active');
    toolbar.dataset.tableId = Array.from(document.querySelectorAll('#editorContent table')).indexOf(table);
    toolbar.dataset.cellRow = Array.from(cell.parentElement.parentElement.children).indexOf(cell.parentElement);
    toolbar.dataset.cellCol = Array.from(cell.parentElement.children).indexOf(cell);
}

export function hideTableToolbar() {
    const toolbar = document.getElementById('tableControls');
    if (toolbar) toolbar.classList.remove('active');
}

function getCurrentTable() {
    const toolbar = document.getElementById('tableControls');
    if (!toolbar || !toolbar.classList.contains('active')) return null;
    const tables = document.querySelectorAll('#editorContent table');
    const tableIndex = parseInt(toolbar.dataset.tableId);
    return tables[tableIndex] || null;
}

function getCurrentCell() {
    const toolbar = document.getElementById('tableControls');
    if (!toolbar || !toolbar.classList.contains('active')) return null;
    const table = getCurrentTable();
    if (!table) return null;
    const rowIndex = parseInt(toolbar.dataset.cellRow);
    const colIndex = parseInt(toolbar.dataset.cellCol);
    const row = table.rows[rowIndex];
    return row ? row.cells[colIndex] : null;
}

export function tableAddRow(position) {
    const cell = getCurrentCell();
    if (!cell) return;
    const row = cell.parentElement;
    const table = row.parentElement;
    const newRow = row.cloneNode(true);
    newRow.querySelectorAll('td, th').forEach(c => {
        c.innerHTML = '<br>';
        c.tagName = 'TD';
    });
    
    if (position === 'above') {
        table.insertBefore(newRow, row);
    } else {
        table.insertBefore(newRow, row.nextSibling);
    }
    initTableResize();
}

export function tableAddCol(position) {
    const cell = getCurrentCell();
    if (!cell) return;
    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
    const table = cell.closest('table');
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        const newCell = document.createElement(index === 0 ? 'th' : 'td');
        newCell.innerHTML = '<br>';
        newCell.style.border = '1px solid rgba(0, 243, 255, 0.2)';
        newCell.style.padding = '8px';
        newCell.style.minWidth = '50px';
        newCell.style.minHeight = '30px';
        newCell.style.position = 'relative';
        newCell.style.background = index === 0 ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
        
        if (position === 'left') {
            row.insertBefore(newCell, row.cells[colIndex]);
        } else {
            row.insertBefore(newCell, row.cells[colIndex + 1]);
        }
    });
    initTableResize();
}

export function tableDeleteRow() {
    const cell = getCurrentCell();
    if (!cell) return;
    const row = cell.parentElement;
    const table = row.parentElement;
    if (table.rows.length > 1) {
        row.remove();
        hideTableToolbar();
    }
}

export function tableDeleteCol() {
    const cell = getCurrentCell();
    if (!cell) return;
    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
    const table = cell.closest('table');
    const rows = table.querySelectorAll('tr');
    
    if (rows[0] && rows[0].cells.length > 1) {
        rows.forEach(row => {
            if (row.cells[colIndex]) {
                row.cells[colIndex].remove();
            }
        });
        hideTableToolbar();
    }
}

export function tableDeleteTable() {
    const table = getCurrentTable();
    if (table) {
        table.remove();
        hideTableToolbar();
    }
}

export function showTableContextMenu(table, cell, x, y) {
    const menu = document.getElementById('tableControls');
    if (!menu) return;
    
    currentTableContext.table = table;
    currentTableContext.cell = cell;
    
    const row = cell.parentElement;
    const rowHeight = row.style.height ? parseInt(row.style.height) : row.offsetHeight;
    const colWidth = cell.style.width ? parseInt(cell.style.width) : cell.offsetWidth;
    
    const rowHeightInput = document.getElementById('tableRowHeight');
    const colWidthInput = document.getElementById('tableColWidth');
    if (rowHeightInput) rowHeightInput.value = rowHeight;
    if (colWidthInput) colWidthInput.value = colWidth;
    
    const editor = document.getElementById('editorContent');
    const selectedCells = editor?.querySelectorAll('td.selected, th.selected');
    if (selectedCells && selectedCells.length > 1) {
        window.batchSelectedCells = Array.from(selectedCells);
    } else {
        window.batchSelectedCells = null;
    }
    
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
    
    initTableColorPicker();
}

export function hideTableContextMenu() {
    const menu = document.getElementById('tableControls');
    if (menu) menu.classList.remove('active');
}

function initTableColorPicker() {
    const picker = document.getElementById('tableCellColor');
    if (!picker || picker.dataset.initialized === 'true') return;
    
    // Color picker is already an input[type="color"], so we just mark it as initialized
    picker.dataset.initialized = 'true';
}

export function applyTableRowHeight() {
    const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
    if (selectedCells.length === 0) return;
    
    const heightInput = document.getElementById('tableRowHeight');
    if (!heightInput) return;
    
    const height = parseInt(heightInput.value);
    if (height >= 20 && height <= 200) {
        const rows = new Set();
        selectedCells.forEach(cell => {
            rows.add(cell.parentElement);
        });
        rows.forEach(row => {
            row.style.height = height + 'px';
        });
    }
}

export function applyTableColWidth() {
    const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
    if (selectedCells.length === 0) return;
    
    const widthInput = document.getElementById('tableColWidth');
    if (!widthInput) return;
    
    const width = parseInt(widthInput.value);
    if (width >= 50 && width <= 500) {
        const table = selectedCells[0].closest('table');
        if (!table) return;
        
        const colIndices = new Set();
        selectedCells.forEach(cell => {
            const row = cell.parentElement;
            const colIndex = Array.from(row.children).indexOf(cell);
            colIndices.add(colIndex);
        });
        
        const rows = table.querySelectorAll('tr');
        colIndices.forEach(colIndex => {
            rows.forEach(row => {
                const targetCell = row.cells[colIndex];
                if (targetCell) {
                    targetCell.style.width = width + 'px';
                }
            });
        });
    }
}

export function setTableCellAlign(align, scope = 'cell') {
    const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
    if (selectedCells.length === 0) return;
    
    if (scope === 'cell') {
        selectedCells.forEach(cell => {
            cell.style.textAlign = align;
        });
    } else if (scope === 'row') {
        const rows = new Set();
        selectedCells.forEach(cell => {
            rows.add(cell.parentElement);
        });
        rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach(c => {
                c.style.textAlign = align;
            });
        });
    } else if (scope === 'col') {
        const table = selectedCells[0].closest('table');
        if (!table) return;
        
        const colIndices = new Set();
        selectedCells.forEach(cell => {
            const row = cell.parentElement;
            const colIndex = Array.from(row.children).indexOf(cell);
            colIndices.add(colIndex);
        });
        
        const rows = table.querySelectorAll('tr');
        colIndices.forEach(colIndex => {
            rows.forEach(row => {
                const targetCell = row.cells[colIndex];
                if (targetCell) {
                    targetCell.style.textAlign = align;
                }
            });
        });
    }
}

export function applyTableCellColor() {
    const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
    if (selectedCells.length === 0) return;
    
    const colorInput = document.getElementById('tableCellColor');
    if (!colorInput) return;
    
    const color = colorInput.value;
    selectedCells.forEach(cell => {
        cell.style.backgroundColor = color;
    });
}

// Close table toolbar when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.table-controls') && !e.target.closest('table')) {
        hideTableToolbar();
    }
    if (!e.target.closest('.table-controls') && !e.target.closest('table')) {
        hideTableContextMenu();
    }
});

// Export init function for use after table insertion
export function initTableHandlers(table) {
    initTableResize();
    attachTableClickHandlers();
    const firstCell = table.querySelector('td, th');
    if (firstCell) {
        setTimeout(() => {
            showTableToolbar(table, firstCell);
        }, 50);
    }
}


