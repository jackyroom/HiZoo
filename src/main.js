// 导入新模块
import { loadTaxonomy } from './services/data-loader.js';
import { generateData } from './services/mock-factory.js';
import { assetsStore, uiStore } from './store/index.js';
import { initSidebar, loadSubCategory } from './modules/layout/sidebar.js';
import { renderGrid } from './modules/dashboard/grid-renderer.js';
import { renderFilters } from './modules/dashboard/filter-bar.js';
import { initSearch } from './modules/dashboard/search.js';
import { formatTime, escapeHtml } from './utils/format.js';
import { openModal, closeModal, toggleFullscreen, navigateMedia, initModalKeyboard } from './modules/layout/modal-system.js';
import { openEditor, closeEditor, execCmd, toggleSourceMode, updateStats } from './modules/editor/editor-core.js';
import { insertCodeBlock, insertHorizontalRule } from './modules/editor/editor-inserts.js';
import { bindEditorToolbar, handleEditorUpload, triggerFileUpload } from './modules/editor/editor-toolbar.js';
import { initFloatingToolbar } from './modules/editor/editor-floating-toolbar.js';
import { updateToolbarState } from './modules/editor/editor-toolbar-state.js';
import { bindEditorPanels, showLinkPanel, hideLinkPanel, confirmLink, showTablePanel, hideTablePanel, insertTable } from './modules/editor/editor-panels.js';
import { initColorPicker, toggleDropdown, switchColorTab } from './modules/editor/editor-color.js';
import { handleArticleCoverSelect, clearArticleCover } from './modules/editor/editor-cover.js';
import { handlePublish } from './modules/editor/editor-publish.js';
import { initTableResize, attachTableClickHandlers, initTableHandlers, tableAddRow, tableAddCol, tableDeleteRow, tableDeleteCol, tableDeleteTable, applyTableRowHeight, applyTableColWidth, setTableCellAlign, applyTableCellColor, showTableToolbar, hideTableToolbar, showTableContextMenu, hideTableContextMenu } from './modules/editor/editor-table.js';
import { initResizer, activateResizer, hideResizer, deleteSelectedMedia, setMediaAlign, getActiveMedia } from './modules/editor/editor-media.js';
import { openUploadPanel, closeUploadPanel, bindUploadPanel } from './modules/upload/upload-panel.js';
import { submitUpload as submitUploadHandler } from './services/upload-handler.js';
import { toggleNeuralMode, initGraphData, renderGraph, updateGraphSettings, updateGraphBg, initGraphFilters, initParticles, toggleParticles } from './modules/neural-graph/graph-core.js';
import { eventBus } from './core/event-bus.js';

// 默认结构，作为 taxonomy.json 的兜底（保留作为兜底）
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

        let structure = defaultStructure;

        // 将原有内联 onclick 迁移为模块内事件绑定，避免全局函数依赖
        // 移除内联 onclick，按映射绑定显式事件
        function bindHeaderActions() {
            const logo = document.getElementById('logoBtn');
            const uploadBtn = document.querySelector('.user-profile-box[title=\"UPLOAD DATA\"]');
            const editorBtn = document.querySelector('.user-profile-box[title=\"WRITE ARTICLE\"]');
            if (logo) logo.addEventListener('click', (e) => { 
                e.preventDefault(); 
                toggleNeuralMode(structure); 
            });
            if (uploadBtn) uploadBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                openUploadPanel(); 
            });
            if (editorBtn) editorBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                openEditor(structure); 
            });
        }

        function bindUploadPanelWrapper() {
            bindUploadPanel(structure);
        }

        function bindEditorPanel() {
            const closeBtn = document.querySelector('#editorPanel .close-btn, #editorPanel .cyber-btn');
            if (closeBtn) closeBtn.addEventListener('click', closeEditor);
            
            // Bind toolbar and panels
            bindEditorToolbar();
            bindEditorPanels();
            
            // Initialize color picker
            initColorPicker();
            
            // Initialize floating toolbar
            initFloatingToolbar(updateToolbarState);
            
            // Bind cover upload
            const artCoverInput = document.getElementById('artCoverInput');
            const artCoverDrop = document.getElementById('artCoverDrop');
            const artCoverRemove = document.querySelector('#artCoverPreview button');
            
            if (artCoverInput) {
                artCoverInput.addEventListener('change', (e) => handleArticleCoverSelect(e.target));
            }
            if (artCoverDrop) {
                artCoverDrop.addEventListener('click', () => {
                    if (artCoverInput) artCoverInput.click();
                });
            }
            if (artCoverRemove) {
                artCoverRemove.addEventListener('click', clearArticleCover);
            }
            
            // Bind publish button
            const publishBtn = document.getElementById('publishArticleBtn');
            if (publishBtn) {
                publishBtn.addEventListener('click', () => handlePublish(structure));
            }
            
            // Bind color tabs
            document.querySelectorAll('.color-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabType = tab.getAttribute('data-tab');
                    switchColorTab(tabType);
                });
            });
            
            // Bind dropdown buttons
            const fontSizeBtn = document.getElementById('fontSizeBtn');
            const colorBtn = document.getElementById('colorBtn');
            if (fontSizeBtn) {
                fontSizeBtn.addEventListener('click', (e) => toggleDropdown('fontSizeDropdown', e));
            }
            if (colorBtn) {
                colorBtn.addEventListener('click', (e) => toggleDropdown('colorDropdown', e));
            }
        }

        function bindModalControls() {
            const modalClose = document.querySelector('#modal .close-btn');
            const modalExpand = document.querySelector('#modal .expand-btn');
            const prev = document.getElementById('btnPrev');
            const next = document.getElementById('btnNext');

            if (modalClose) {
                modalClose.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal();
                });
            }
            
            if (modalExpand) {
                modalExpand.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen();
                });
            }
            
            if (prev) prev.addEventListener('click', () => navigateMedia(-1));
            if (next) next.addEventListener('click', () => navigateMedia(1));
        }

        function bindGraphExit() {
            const exitButtons = document.querySelectorAll('#graphView .exit-neural-btn, #graphView button.exit-neural-btn');
            exitButtons.forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    toggleNeuralMode(structure); 
                });
            });
            
            // Bind graph settings
            const setImageSize = document.getElementById('setImageSize');
            const setDensity = document.getElementById('setDensity');
            const setShowImages = document.getElementById('setShowImages');
            const setParticles = document.getElementById('setParticles');
            const setBgColor = document.getElementById('setBgColor');
            
            if (setImageSize) setImageSize.addEventListener('input', updateGraphSettings);
            if (setDensity) setDensity.addEventListener('input', updateGraphSettings);
            if (setShowImages) setShowImages.addEventListener('change', updateGraphSettings);
            if (setParticles) setParticles.addEventListener('change', toggleParticles);
            if (setBgColor) setBgColor.addEventListener('change', updateGraphBg);
        }

        // 状态管理：使用 assetsStore 和 uiStore，同步到全局以保持兼容性
        const root = document.documentElement;
        Object.defineProperty(window, 'currentAssets', {
            get: () => assetsStore.getAssets(),
            set: (val) => assetsStore.setAssets(val)
        });

        // 编辑器相关函数已从模块导入（见文件顶部 import 语句）
        // 编辑器统计更新和源代码语法高亮已在 editor-core.js 中处理

        // 编辑器交互功能：媒体调整、链接、表格等功能已迁移到相应模块
        // 浮动工具栏和工具栏状态管理已迁移到 editor-floating-toolbar.js 和 editor-toolbar-state.js
        
        // 暴露到全局供其他模块使用
        window.updateToolbarState = updateToolbarState;

        // 初始化缩放滑块
        function initZoomSlider() {
            const zoomSlider = document.getElementById('zoomSlider');
            if (zoomSlider) {
                zoomSlider.addEventListener('input', (e) => {
                    root.style.setProperty('--card-scale', e.target.value);
                });
            }
        }
        
        // 初始化默认分类显示（延迟加载第一个分类）
        function initDefaultCategory() {
            // 增加延迟确保侧边栏已完全渲染，并且所有初始化都已完成
            setTimeout(() => {
                const firstParent = document.querySelector('.nav-parent');
                if (firstParent && structure[0]?.children?.[0]?.subs?.[0]) {
                    firstParent.classList.add('expanded', 'active-parent');
                    // 确保使用正确的函数引用
                    if (oldLoadSubCategory) {
                        oldLoadSubCategory(structure[0].children[0], structure[0].children[0].subs[0]);
                    } else if (loadSubCategory) {
                        loadSubCategory(structure[0].children[0], structure[0].children[0].subs[0]);
                    }
                }
            }, 300);
        }

        // 兼容层：保留 oldLoadSubCategory 作为别名，供旧代码使用
        const oldLoadSubCategory = loadSubCategory;

        // 将 eventBus 暴露到全局，供其他模块使用
        window.eventBus = eventBus;
        
        // 将模态函数暴露到全局，供其他代码调用（这些函数已从模块导入）
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.toggleFullscreen = toggleFullscreen;
        window.navigateMedia = navigateMedia;

        async function bootstrap() {
            try {
                structure = await loadTaxonomy();
                
                // 先设置事件监听（必须在初始化之前设置，以便 loadSubCategory 触发的事件能被捕获）
                if (eventBus) {
                    eventBus.on('ASSET_CLICK', ({ item }) => {
                        openModal(item);
                    });
                    eventBus.on('CATEGORY_SELECT', ({ assets }) => {
                        if (assets && assets.length > 0) {
                            renderGrid(assets);
                        }
                    });
                    eventBus.on('FILTER_CHANGE', ({ assets }) => {
                        renderGrid(assets);
                    });
                    eventBus.on('UPLOAD_SUCCESS', ({ callback }) => {
                        if (callback) callback();
                    });
                }
                
                bindHeaderActions();
                bindUploadPanelWrapper();
                bindEditorPanel();
                bindModalControls();
                bindGraphExit();
                
                // 初始化模态键盘事件
                initModalKeyboard();
                
                // 使用新模块初始化侧边栏
                initSidebar(structure, oldLoadSubCategory);
                
                // 初始化搜索（需要传入 structure）
                initSearch(structure);
                
                // 初始化神经网络图过滤器
                initGraphFilters(structure);
                
                // 初始化粒子系统
                initParticles();
                
                // 暴露函数到全局（供HTML中的onclick使用）
                window.openModal = openModal;
                window.closeModal = closeModal;
                window.toggleFullscreen = toggleFullscreen;
                window.navigateMedia = navigateMedia;
                window.closeUploadPanel = closeUploadPanel;
                window.openUploadPanel = openUploadPanel;
                window.openEditor = () => openEditor(structure);
                window.closeEditor = closeEditor;
                window.execCmd = execCmd;
                window.toggleDropdown = toggleDropdown;
                window.switchColorTab = switchColorTab;
                
                // 创建 submitUpload 的全局包装函数（需要 structure 参数）
                window.submitUpload = function() {
                    submitUploadHandler(structure, (newItem, category, sub) => {
                        // Success callback - emit event for navigation
                        if (window.eventBus) {
                            window.eventBus.emit('UPLOAD_SUCCESS', { 
                                item: newItem, 
                                category, 
                                sub,
                                callback: () => {
                                    // Navigate to category
                                    if (window.loadSubCategory) {
                                        window.loadSubCategory(category, sub);
                                    }
                                    
                                    // Scroll to top and highlight
                                    setTimeout(() => {
                                        const grid = document.getElementById('grid');
                                        if (grid && grid.firstChild) {
                                            grid.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            grid.firstChild.style.outline = '2px solid var(--accent)';
                                            grid.firstChild.style.outlineOffset = '4px';
                                            setTimeout(() => {
                                                if (grid.firstChild) {
                                                    grid.firstChild.style.outline = '';
                                                }
                                            }, 3000);
                                        }
                                    }, 100);
                                    
                                    closeUploadPanel();
                                }
                            });
                        }
                    });
                };
                
                // 暴露 loadSubCategory 到全局（供上传模块使用）
                window.loadSubCategory = oldLoadSubCategory;
                
                // 暴露表格处理函数到全局（供编辑器使用）
                window.initTableHandlers = initTableHandlers;
                
                // 初始化编辑器媒体调整器
                initResizer();
                
                // 初始化缩放滑块和默认分类
                initZoomSlider();
                initDefaultCategory();
            } catch (err) {
                console.error('[HiZoo] bootstrap error, fallback to default layout', err);
                // 尝试最小化渲染以保证界面可见
                structure = defaultStructure;
                try {
                    initSidebar(structure, oldLoadSubCategory);
                    initSearch(structure);
                    if (structure[0]?.children?.[0]?.subs?.[0]) {
                        oldLoadSubCategory(structure[0].children[0], structure[0].children[0].subs[0]);
                    }
                } catch (e) {
                    console.error('[HiZoo] fallback render failed', e);
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
