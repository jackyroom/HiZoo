        // 默认结构，作为 taxonomy.json 的兜底
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
            if (logo) logo.addEventListener('click', (e) => { e.preventDefault(); toggleNeuralMode(); });
            if (uploadBtn) uploadBtn.addEventListener('click', (e) => { e.preventDefault(); openUploadPanel(); });
            if (editorBtn) editorBtn.addEventListener('click', (e) => { e.preventDefault(); openEditor(); });
        }

        function bindUploadPanel() {
            const closeBtn = document.querySelector('#uploadPanel .close-btn, #uploadPanel [onclick*="closeUploadPanel"]');
            const cancelBtn = Array.from(document.querySelectorAll('.cyber-btn'))
                .find(btn => btn.textContent && btn.textContent.includes('CANCEL_OP'));
            const submitBtn = Array.from(document.querySelectorAll('.cyber-btn'))
                .find(btn => btn.textContent && btn.textContent.includes('UPLOAD'));
            const coverDrop = document.getElementById('coverDrop');
            const coverInput = document.getElementById('coverInput');
            const coverRemove = document.querySelector('#coverPreview button');
            const fileBtn = document.querySelector('.uploader button');

            if (closeBtn) closeBtn.addEventListener('click', closeUploadPanel);
            if (cancelBtn) cancelBtn.addEventListener('click', closeUploadPanel);
            if (submitBtn) submitBtn.addEventListener('click', submitUpload);
            if (coverDrop && coverInput) coverDrop.addEventListener('click', () => coverInput.click());
            if (coverRemove) coverRemove.addEventListener('click', clearCover);
            if (fileBtn) fileBtn.addEventListener('click', () => {
                const input = document.getElementById('fileInput');
                if (input) input.click();
            });
        }

        function bindEditorPanel() {
            const closeBtn = document.querySelector('#editorPanel .cyber-btn');
            if (closeBtn) closeBtn.addEventListener('click', closeEditor);
            bindEditorToolbar();
            bindEditorPanels();
        }

        function bindModalControls() {
            const modalClose = document.querySelector('#modal .close-btn');
            const modalExpand = document.querySelector('#modal .expand-btn');
            const prev = document.getElementById('btnPrev');
            const next = document.getElementById('btnNext');

            if (modalClose) modalClose.addEventListener('click', closeModal);
            if (modalExpand) modalExpand.addEventListener('click', toggleFullscreen);
            if (prev) prev.addEventListener('click', () => navigateMedia(-1));
            if (next) next.addEventListener('click', () => navigateMedia(1));
        }

        function bindGraphExit() {
            const exitButtons = document.querySelectorAll('#graphView .exit-neural-btn, #graphView button.exit-neural-btn');
            exitButtons.forEach(btn => {
                btn.addEventListener('click', (e) => { e.preventDefault(); toggleNeuralMode(); });
            });
        }

        async function loadTaxonomy() {
            try {
                // file:// 场景下直接使用内置默认结构，避免 fetch 被浏览器拦截
                if (location.protocol === 'file:') {
                    structure = defaultStructure;
                    return;
                }
                const res = await fetch('src/config/taxonomy.json', { cache: 'no-cache' });
                if (!res.ok) throw new Error(res.statusText);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    structure = data;
                }
            } catch (err) {
                console.warn('[HiZoo] 加载 taxonomy.json 失败，回退默认结构', err);
                structure = defaultStructure;
            }
        }

        let currentAssets = [];
        let currentMediaIndex = 0;
        let activeItem = null;
        let loadTimer = null;
        const root = document.documentElement;
        let currentParent = null;
        let currentSub = null;

        // --- UPLOAD STATE ---
        let uploadedFiles = [];
        let uploadedCover = null;

        // --- UPLOADED DATA STORAGE ---
        // Store uploaded items by category and subcategory: { "categoryId-subId": [items...] }
        let uploadedDataStore = {};

        // --- EDITOR FUNCTIONS ---
        function bindEditorToolbar() {
            const toolbar = document.querySelector('.toolbar');
            if (!toolbar) return;
            // 按 data-cmd 绑定 execCommand
            toolbar.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
                const cmd = btn.getAttribute('data-cmd');
                btn.addEventListener('click', () => execCmd(cmd));
            });

            const codeBtn = document.getElementById('btnSource');
            if (codeBtn) codeBtn.addEventListener('click', toggleSourceMode);

            const linkBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('link'));
            if (linkBtn) linkBtn.addEventListener('click', showLinkPanel);

            const tableBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('insert table'));
            if (tableBtn) tableBtn.addEventListener('click', showTablePanel);

            const imgBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('insert image'));
            const videoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('insert video'));
            if (imgBtn) imgBtn.addEventListener('click', () => triggerFileUpload('image'));
            if (videoBtn) videoBtn.addEventListener('click', () => triggerFileUpload('video'));

            const undoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('undo'));
            const redoBtn = Array.from(toolbar.querySelectorAll('.tool-btn')).find(b => b.title && b.title.toLowerCase().includes('redo'));
            if (undoBtn) undoBtn.addEventListener('click', () => execCmd('undo'));
            if (redoBtn) redoBtn.addEventListener('click', () => execCmd('redo'));
        }

        function bindEditorPanels() {
            const linkApply = Array.from(document.querySelectorAll('.tool-btn')).find(b => b.textContent && b.textContent.includes('✔') || b.innerHTML.includes('ph-check'));
            const linkCancel = Array.from(document.querySelectorAll('.tool-btn')).find(b => b.textContent && b.textContent.includes('CANCEL'));
            const tableInsert = Array.from(document.querySelectorAll('.tool-btn')).find(b => b.textContent && b.textContent.includes('INSERT'));
            const tableCancel = Array.from(document.querySelectorAll('.tool-btn')).find(b => b.textContent && b.textContent.includes('CANCEL'));

            if (linkApply) linkApply.addEventListener('click', confirmLink);
            if (linkCancel) linkCancel.addEventListener('click', hideLinkPanel);
            if (tableInsert) tableInsert.addEventListener('click', insertTable);
            if (tableCancel) tableCancel.addEventListener('click', hideTablePanel);
        }
        function openEditor() {
            const panel = document.getElementById('editorPanel');
            panel.classList.add('active');

            // Populate Category Selector Dynamically
            const catSelect = document.getElementById('artCategory');
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

        function closeEditor() {
            document.getElementById('editorPanel').classList.remove('active');
            hideLinkPanel();
            hideResizer();
            activeMedia = null;
        }

        function execCmd(command, value = null) {
            document.execCommand(command, false, value);
            document.getElementById('editorContent').focus();
        }

        function handleImageInsert() {
            const url = prompt('Enter Image URL:');
            if (url) {
                execCmd('insertImage', url);
            }
        }

        function handlePublish() {
            const title = document.getElementById('artTitle').value.trim();
            const tags = document.getElementById('artTags').value.trim();
            const catValue = document.getElementById('artCategory').value; // "blog-articles"
            // Use uploaded cover image if available, otherwise use empty string
            const cover = articleCoverData || '';
            const content = document.getElementById('editorContent').innerHTML;

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
                sources: [], // Empty sources array for articles
                content: content, // Article content stored separately
                tag: tags.split(',')[0].trim().toUpperCase() || 'BLOG',
                description: "NEURAL LOG ENTRY"
            };

            // Store in Uploaded Data Store
            if (!uploadedDataStore[catValue]) {
                uploadedDataStore[catValue] = [];
            }
            uploadedDataStore[catValue].unshift(newArticle); // Add to top

            // Navigate to the category to see it
            // Find the category object in structure
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
            } else {
                // Just refresh whatever we are on, though usually we should jump
                // If we are already on the page, generateData will pick it up
            }

            closeEditor();

            // Reset Editor
            document.getElementById('artTitle').value = '';
            document.getElementById('artTags').value = '';
            clearArticleCover();
            document.getElementById('editorContent').innerHTML = '<p><br></p>';

            // Clean up global listeners
            document.removeEventListener('mousemove', resizeMedia);
            document.removeEventListener('mouseup', stopResize);
        }

        // --- ADVANCED EDITOR FUNCTIONS ---

        function toggleDropdown(id, event) {
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

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.toolbar-dropdown') && 
                !event.target.closest('.dropdown-content') && 
                !event.target.closest('.color-picker-panel')) {
                document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
            }
        });

        function switchColorTab(tab) {
            document.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.color-grid').forEach(g => g.style.display = 'none');

            if (tab === 'fore') {
                document.querySelectorAll('.color-tab')[0].classList.add('active');
                document.getElementById('foreColorGrid').style.display = 'grid';
            } else {
                document.querySelectorAll('.color-tab')[1].classList.add('active');
                document.getElementById('backColorGrid').style.display = 'grid';
            }
        }

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

        function initColorPicker() {
            const foreGrid = document.getElementById('foreColorGrid');
            const backGrid = document.getElementById('backColorGrid');
            if (!foreGrid || !backGrid) return;
            foreGrid.innerHTML = '';
            backGrid.innerHTML = '';
            colors.forEach(c => {
                let div = document.createElement('div');
                div.className = 'color-cell';
                div.style.backgroundColor = c;
                div.onclick = () => applyColor('foreColor', c);
                foreGrid.appendChild(div);
                div = document.createElement('div');
                div.className = 'color-cell';
                div.style.backgroundColor = c;
                div.onclick = () => applyColor('backColor', c);
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
            container.innerHTML = '';
            recentColors.forEach(c => {
                let div = document.createElement('div');
                div.className = 'color-cell';
                div.style.backgroundColor = c;
                div.onclick = () => {
                    const isBack = document.querySelectorAll('.color-tab')[1].classList.contains('active');
                    applyColor(isBack ? 'backColor' : 'foreColor', c);
                };
                container.appendChild(div);
            });
        }

        function triggerFileUpload(type) {
            if (type === 'image') document.getElementById('editorImgInput').click();
            if (type === 'video') document.getElementById('editorVidInput').click();
        }

        function handleEditorUpload(input, type) {
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

        function insertCodeBlock() {
            const codeHtml = `<pre style="background:rgba(0,0,0,0.5); padding:15px; border:1px solid #444; color:#0f0; font-family:'Courier New', monospace; white-space:pre-wrap;"><code>// Type your code here...</code></pre><p><br></p>`;
            document.execCommand('insertHTML', false, codeHtml);
        }

        function insertHorizontalRule() {
            const hrHtml = `<hr style="border: none; border-top: 2px solid var(--accent); margin: 20px 0; box-shadow: 0 0 10px rgba(0, 243, 255, 0.3);"><p><br></p>`;
            document.execCommand('insertHTML', false, hrHtml);
        }

        // Article cover upload handler
        let articleCoverData = null;
        function handleArticleCoverSelect(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                articleCoverData = e.target.result;
                const preview = document.getElementById('artCoverPreview');
                const previewImg = document.getElementById('artCoverPreviewImg');
                const coverText = document.getElementById('artCoverText');
                const coverDrop = document.getElementById('artCoverDrop');
                
                previewImg.src = articleCoverData;
                preview.style.display = 'block';
                coverText.innerText = 'COVER UPLOADED';
                coverDrop.style.backgroundImage = `url(${articleCoverData})`;
                coverDrop.style.backgroundSize = 'cover';
                coverDrop.style.backgroundPosition = 'center';
            };
            reader.readAsDataURL(file);
        }

        function clearArticleCover() {
            articleCoverData = null;
            const preview = document.getElementById('artCoverPreview');
            const coverText = document.getElementById('artCoverText');
            const coverDrop = document.getElementById('artCoverDrop');
            const coverInput = document.getElementById('artCoverInput');
            
            preview.style.display = 'none';
            coverText.innerText = 'CLICK TO UPLOAD COVER';
            coverDrop.style.backgroundImage = 'none';
            if (coverInput) coverInput.value = '';
        }

        // --- CONTROLS & STATS & SOURCE ---

        let isSourceMode = false;
        let originalHTML = ''; // Store original unformatted HTML
        let isFormatted = false; // Track if current HTML is formatted

        // Convert formatted HTML back to unformatted (remove extra line breaks and indentation)
        function unformatHTML(html) {
            if (!html) return '';
            
            // Remove all formatting whitespace (line breaks, extra spaces, indentation)
            // but preserve actual HTML structure
            let text = html;
            
            // Remove all line breaks and normalize whitespace
            // Split by lines, trim each, filter empty, then join with single space
            const lines = text.split(/\r?\n/);
            const cleaned = lines
                .map(line => line.trim()) // Remove indentation
                .filter(line => line.length > 0); // Remove empty lines
            
            // Join all lines with a single space
            const joined = cleaned.join(' ');
            
            // Normalize multiple spaces to single space (but preserve spaces in attributes)
            // This regex preserves spaces within quotes
            const normalized = joined.replace(/\s+/g, ' ').trim();
            
            // Use a temporary div to parse and re-serialize HTML
            // This ensures browser-normalized HTML without extra whitespace
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = normalized;
            
            // Return the normalized innerHTML (browser will clean it up properly)
            return tempDiv.innerHTML;
        }

        function toggleSourceMode() {
            const editor = document.getElementById('editorContent');
            const source = document.getElementById('editorSource');
            const highlight = document.getElementById('editorSourceHighlight');
            const btn = document.getElementById('btnSource');

            isSourceMode = !isSourceMode;

            if (isSourceMode) {
                // Switching TO Source
                // Get current HTML from editor
                let currentHTML = editor.innerHTML;
                
                // If HTML was previously formatted, unformat it first
                if (isFormatted) {
                    currentHTML = unformatHTML(currentHTML);
                }
                
                // Store unformatted HTML
                originalHTML = currentHTML;
                
                // Format only for display
                const formatted = formatHTML(originalHTML);
                source.value = formatted;
                isFormatted = true; // Mark as formatted
                
                // Apply syntax highlighting
                highlight.innerHTML = '<pre><code class="language-html">' + escapeHtml(formatted) + '</code></pre>';
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(highlight.querySelector('code'));
                }

                editor.style.display = 'none';
                source.style.display = 'none';
                highlight.style.display = 'block';
                btn.classList.add('active');

                // Hide floating tools
                document.getElementById('floatingToolbar').classList.remove('active');
            } else {
                // Switching TO Visual
                // Get HTML from source (may be edited)
                let html = source.value.trim();
                
                // Check if source was edited (compare with what we formatted)
                const wasFormatted = formatHTML(originalHTML);
                const wasEdited = html !== wasFormatted.trim();
                
                if (wasEdited && html) {
                    // User edited the source, unformat it before putting back
                    html = unformatHTML(html);
                } else if (!wasEdited && originalHTML) {
                    // Source wasn't edited, use original unformatted HTML
                    html = originalHTML;
                } else if (!html) {
                    // No source value, use original
                    html = originalHTML;
                }
                
                // Clear editor first to prevent browser from auto-adding paragraphs
                editor.innerHTML = '';
                
                // If HTML is empty, add a single empty paragraph
                if (!html || html.trim() === '') {
                    editor.innerHTML = '<p><br></p>';
                } else {
                    // Use Range API to insert HTML without browser auto-formatting
                    const range = document.createRange();
                    range.selectNodeContents(editor);
                    range.deleteContents();
                    
                    // Create a temporary container to parse HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    
                    // Move all nodes to editor to preserve structure exactly
                    const fragment = document.createDocumentFragment();
                    while (tempDiv.firstChild) {
                        fragment.appendChild(tempDiv.firstChild);
                    }
                    editor.appendChild(fragment);
                    
                    // Clean up any empty paragraphs that might have been added
                    const allPs = editor.querySelectorAll('p');
                    allPs.forEach(p => {
                        // Only remove if it's truly empty or just has a single br
                        const innerHTML = p.innerHTML.trim();
                        if (innerHTML === '' || innerHTML === '<br>' || innerHTML === '<br/>') {
                            // Check if it's the only child with just a br
                            const children = p.children;
                            if (children.length === 1 && children[0].tagName === 'BR') {
                                // Keep at least one empty paragraph for cursor placement
                                if (allPs.length > 1) {
                                    p.remove();
                                }
                            } else if (innerHTML === '') {
                                // Keep at least one empty paragraph for cursor placement
                                if (allPs.length > 1) {
                                    p.remove();
                                }
                            }
                        }
                    });
                }

                editor.style.display = 'block';
                source.style.display = 'none';
                highlight.style.display = 'none';
                btn.classList.remove('active');
                
                // Update original HTML to current editor content (unformatted)
                originalHTML = editor.innerHTML;
                isFormatted = false; // Mark as unformatted
                
                // Focus editor after switching
                setTimeout(() => {
                    editor.focus();
                    // Place cursor at end
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

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatHTML(html) {
            let text = html;

            // Add proper line breaks after closing tags
            text = text.replace(/<br\s*\/?>/g, '<br>\n');
            text = text.replace(/<\/p>/g, '</p>\n\n');
            text = text.replace(/<\/div>/g, '</div>\n');
            text = text.replace(/<\/h[1-6]>/g, (match) => match + '\n\n');
            text = text.replace(/<\/ul>/g, '</ul>\n');
            text = text.replace(/<\/ol>/g, '</ol>\n');
            text = text.replace(/<\/li>/g, '</li>\n');
            text = text.replace(/<\/pre>/g, '</pre>\n\n');

            // Add indentation for better readability
            const lines = text.split('\n');
            let indentLevel = 0;
            const indentStr = '    ';

            const formatted = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // Decrease indent for closing tags
                if (trimmed.match(/^<\/(div|ul|ol|li|p|h[1-6]|pre|blockquote)/)) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }

                const result = indentStr.repeat(indentLevel) + trimmed;

                // Increase indent for opening tags (but not self-closing)
                if (trimmed.match(/^<(div|ul|ol|li|p|h[1-6]|pre|blockquote)/) && !trimmed.match(/\/>/)) {
                    indentLevel++;
                }

                return result;
            }).join('\n');

            return formatted;
        }

        function updateStats() {
            const editor = document.getElementById('editorContent');
            const text = editor.innerText || '';
            // Fix: Use character count (length) for better accuracy with non-space-separated languages (like Chinese)
            // Or use a hybrid approach. For now, total characters ignoring only whitespace is "safest" visual count.
            const wordCount = text.replace(/[\s\n\r]/g, '').length;
            const imgCount = editor.querySelectorAll('img, video').length;

            const wEl = document.getElementById('statWords');
            const iEl = document.getElementById('statImg');
            if (wEl) wEl.innerText = wordCount;
            if (iEl) iEl.innerText = imgCount;
        }

        // Update stats on keyup too
        const editorEl = document.getElementById('editorContent');
        if (editorEl) editorEl.addEventListener('keyup', updateStats);

        // Sync source editor changes and update syntax highlighting
        const sourceEl = document.getElementById('editorSource');
        const highlightEl = document.getElementById('editorSourceHighlight');
        if (sourceEl && highlightEl) {
            let highlightTimeout = null;
            sourceEl.addEventListener('input', function() {
                // Don't update originalHTML here - it's already formatted
                // originalHTML should remain unformatted
                
                // Update syntax highlighting with debounce
                clearTimeout(highlightTimeout);
                highlightTimeout = setTimeout(() => {
                    // Source value is already formatted, use it directly
                    highlightEl.innerHTML = '<pre><code class="language-html">' + escapeHtml(sourceEl.value) + '</code></pre>';
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(highlightEl.querySelector('code'));
                    }
                }, 300);
            });
        }



        // --- EDITOR PHASE 2: INTERACTIVE MEDIA & LINKS ---

        let activeMedia = null;
        let isResizing = false;
        let resizeStartX, resizeStartY, startWidth, startHeight;
        let activeResizeHandle = null;

        function showLinkPanel() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Only show if selection is within editor
            if (!document.getElementById('editorContent').contains(selection.anchorNode)) return;

            const panel = document.getElementById('linkPanel');

            panel.style.top = (rect.bottom + 10) + 'px';
            panel.style.left = rect.left + 'px';
            panel.classList.add('active');

            const input = document.getElementById('linkInput');
            input.value = '';
            input.focus();

            // Save range to restore later
            window.savedRange = range.cloneRange();
        }

        function hideLinkPanel() {
            document.getElementById('linkPanel').classList.remove('active');
        }

        function confirmLink() {
            const url = document.getElementById('linkInput').value;
            if (url && window.savedRange) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(window.savedRange);
                execCmd('createLink', url);
            }
            hideLinkPanel();
        }

        // Table Functions
        function showTablePanel() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Only show if selection is within editor
            if (!document.getElementById('editorContent').contains(selection.anchorNode)) return;

            const panel = document.getElementById('tablePanel');
            panel.style.top = (rect.bottom + 10) + 'px';
            panel.style.left = rect.left + 'px';
            panel.classList.add('active');

            // Save range to restore later
            window.savedTableRange = range.cloneRange();
        }

        function hideTablePanel() {
            document.getElementById('tablePanel').classList.remove('active');
        }

        function insertTable() {
            const rows = parseInt(document.getElementById('tableRows').value) || 3;
            const cols = parseInt(document.getElementById('tableCols').value) || 3;
            
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
            
            // Add resize handles and make table interactive
            setTimeout(() => {
                const editor = document.getElementById('editorContent');
                const insertedTable = editor.querySelector('table:last-of-type');
                if (insertedTable) {
                    initTableResize();
                    attachTableClickHandlers();
                    // Click on first cell to show toolbar
                    const firstCell = insertedTable.querySelector('td, th');
                    if (firstCell) {
                        setTimeout(() => {
                            showTableToolbar(insertedTable, firstCell);
                        }, 50);
                    }
                }
            }, 100);
        }

        function initTableResize() {
            const editor = document.getElementById('editorContent');
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
                                // Resize all cells in this column
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

        // Table selection state
        let tableSelectionState = {
            isSelecting: false,
            startCell: null,
            endCell: null,
            selectedCells: []
        };

        function attachTableClickHandlers() {
            const editor = document.getElementById('editorContent');
            const tables = editor.querySelectorAll('table');
            
            tables.forEach(table => {
                // Remove existing listeners by checking if already attached
                if (!table.dataset.tableHandlerAttached) {
                    table.dataset.tableHandlerAttached = 'true';
                    
                    // Single click - show toolbar (only if not selecting)
                    table.addEventListener('click', (e) => {
                        if (e.target.closest('td, th') && !e.target.classList.contains('table-resize-handle')) {
                            const cell = e.target.closest('td, th');
                            // If Ctrl/Cmd is not pressed and not in selection mode, clear selection and show toolbar
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
                            if (e.button === 0) { // Left mouse button
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
                // Convert selecting cells to selected
                const editor = document.getElementById('editorContent');
                const selectingCells = editor.querySelectorAll('td.selecting, th.selecting');
                selectingCells.forEach(cell => {
                    cell.classList.remove('selecting');
                    cell.classList.add('selected');
                });
                
                if (tableSelectionState.selectedCells.length > 1 || selectingCells.length > 1) {
                    // Show batch edit options
                    const selectedCells = Array.from(editor.querySelectorAll('td.selected, th.selected'));
                    if (selectedCells.length > 1) {
                        showBatchTableEditMenu(selectedCells, e.clientX, e.clientY);
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
            // Clear previous selecting state
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

        function getSelectedCells(table) {
            if (tableSelectionState.selectedCells.length > 0) {
                return tableSelectionState.selectedCells;
            }
            return table.querySelectorAll('td.selected, th.selected');
        }

        function showBatchTableEditMenu(selectedCells, x, y) {
            // Update context menu to work with multiple cells
            const menu = document.getElementById('tableContextMenu');
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.classList.add('active');
            
            // Store selected cells for batch operations
            window.batchSelectedCells = selectedCells;
            
            // Update menu title to show selection count
            const title = menu.querySelector('.context-menu-title');
            if (title && selectedCells.length > 1) {
                const originalTitle = title.dataset.originalTitle || title.innerText;
                title.dataset.originalTitle = originalTitle;
                title.innerText = `SELECTED: ${selectedCells.length} CELLS`;
            }
        }

        function showTableToolbar(table, cell) {
            const toolbar = document.getElementById('tableToolbar');
            const rect = cell.getBoundingClientRect();
            
            toolbar.style.top = (rect.bottom + 10) + 'px';
            toolbar.style.left = rect.left + 'px';
            toolbar.classList.add('active');
            toolbar.dataset.tableId = Array.from(document.querySelectorAll('table')).indexOf(table);
            toolbar.dataset.cellRow = Array.from(cell.parentElement.parentElement.children).indexOf(cell.parentElement);
            toolbar.dataset.cellCol = Array.from(cell.parentElement.children).indexOf(cell);
        }

        function hideTableToolbar() {
            document.getElementById('tableToolbar').classList.remove('active');
        }

        function getCurrentTable() {
            const toolbar = document.getElementById('tableToolbar');
            if (!toolbar.classList.contains('active')) return null;
            const tables = document.querySelectorAll('#editorContent table');
            const tableIndex = parseInt(toolbar.dataset.tableId);
            return tables[tableIndex] || null;
        }

        function getCurrentCell() {
            const toolbar = document.getElementById('tableToolbar');
            if (!toolbar.classList.contains('active')) return null;
            const table = getCurrentTable();
            if (!table) return null;
            const rowIndex = parseInt(toolbar.dataset.cellRow);
            const colIndex = parseInt(toolbar.dataset.cellCol);
            const row = table.rows[rowIndex];
            return row ? row.cells[colIndex] : null;
        }

        function tableAddRow(position) {
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

        function tableAddCol(position) {
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

        function tableDeleteRow() {
            const cell = getCurrentCell();
            if (!cell) return;
            const row = cell.parentElement;
            const table = row.parentElement;
            if (table.rows.length > 1) {
                row.remove();
                hideTableToolbar();
            }
        }

        function tableDeleteCol() {
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

        function tableDeleteTable() {
            const table = getCurrentTable();
            if (table) {
                table.remove();
                hideTableToolbar();
            }
        }

        // Close table toolbar when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.table-toolbar') && !e.target.closest('table')) {
                hideTableToolbar();
            }
            if (!e.target.closest('.table-context-menu') && !e.target.closest('table')) {
                hideTableContextMenu();
            }
        });

        // Table Context Menu Functions
        let currentTableContext = { table: null, cell: null };

        function showTableContextMenu(table, cell, x, y) {
            const menu = document.getElementById('tableContextMenu');
            currentTableContext.table = table;
            currentTableContext.cell = cell;
            
            // Update input values based on current cell/row/column
            const row = cell.parentElement;
            const rowHeight = row.style.height ? parseInt(row.style.height) : row.offsetHeight;
            const colWidth = cell.style.width ? parseInt(cell.style.width) : cell.offsetWidth;
            
            document.getElementById('tableRowHeight').value = rowHeight;
            document.getElementById('tableColWidth').value = colWidth;
            
            // Check if there are selected cells
            const editor = document.getElementById('editorContent');
            const selectedCells = editor.querySelectorAll('td.selected, th.selected');
            if (selectedCells.length > 1) {
                window.batchSelectedCells = Array.from(selectedCells);
            } else {
                window.batchSelectedCells = null;
            }
            
            // Position menu
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.classList.add('active');
            
            // Update menu title if multiple cells selected
            const titles = menu.querySelectorAll('.context-menu-title');
            if (titles.length > 0 && window.batchSelectedCells && window.batchSelectedCells.length > 1) {
                titles[0].innerText = `SELECTED: ${window.batchSelectedCells.length} CELLS`;
            }
            
            // Initialize color picker if not already done
            initTableColorPicker();
        }

        function hideTableContextMenu() {
            document.getElementById('tableContextMenu').classList.remove('active');
        }

        function initTableColorPicker() {
            const picker = document.getElementById('tableColorPicker');
            if (picker.dataset.initialized === 'true') return;
            
            const colors = [
                '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                '#ff0055', '#ff5500', '#ffaa00', '#ffff00', '#aaff00', '#00ff00',
                '#00ffaa', '#00ffff', '#00aaff', '#0055ff', '#5500ff', '#aa00ff',
                '#ff00ff', '#ff00aa', '#ff0055', '#ff5500', '#ffaa00', '#ffff00'
            ];
            
            colors.forEach(color => {
                const colorBtn = document.createElement('div');
                colorBtn.style.width = '25px';
                colorBtn.style.height = '25px';
                colorBtn.style.backgroundColor = color;
                colorBtn.style.border = '1px solid #444';
                colorBtn.style.cursor = 'pointer';
                colorBtn.style.transition = 'transform 0.2s';
                colorBtn.title = color;
                colorBtn.addEventListener('click', () => {
                    document.getElementById('tableCustomColor').value = color;
                    applyTableCellColor();
                });
                colorBtn.addEventListener('mouseenter', () => {
                    colorBtn.style.transform = 'scale(1.1)';
                    colorBtn.style.borderColor = 'var(--accent)';
                });
                colorBtn.addEventListener('mouseleave', () => {
                    colorBtn.style.transform = 'scale(1)';
                    colorBtn.style.borderColor = '#444';
                });
                picker.appendChild(colorBtn);
            });
            
            picker.dataset.initialized = 'true';
        }

        function applyTableRowHeight() {
            const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
            if (selectedCells.length === 0) return;
            
            const height = parseInt(document.getElementById('tableRowHeight').value);
            if (height >= 20 && height <= 200) {
                // Get unique rows from selected cells
                const rows = new Set();
                selectedCells.forEach(cell => {
                    rows.add(cell.parentElement);
                });
                rows.forEach(row => {
                    row.style.height = height + 'px';
                });
            }
        }

        function applyTableColWidth() {
            const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
            if (selectedCells.length === 0) return;
            
            const width = parseInt(document.getElementById('tableColWidth').value);
            if (width >= 50 && width <= 500) {
                // Get unique columns from selected cells
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

        function setTableCellAlign(align, scope = 'cell') {
            const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
            if (selectedCells.length === 0) return;
            
            if (scope === 'cell') {
                // Apply to selected cells
                selectedCells.forEach(cell => {
                    cell.style.textAlign = align;
                });
            } else if (scope === 'row') {
                // Apply to entire rows of selected cells
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
                // Apply to entire columns of selected cells
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

        function applyTableCellColor() {
            const selectedCells = window.batchSelectedCells || (currentTableContext.cell ? [currentTableContext.cell] : []);
            if (selectedCells.length === 0) return;
            
            const color = document.getElementById('tableCustomColor').value;
            selectedCells.forEach(cell => {
                cell.style.backgroundColor = color;
            });
        }

        // Resizer Logic
        // We need to attach this listener once. Since init() is far away, we can self-invoke or check checks.
        // Better: Attach to editorContent immediately here if it exists (it does).

        const editorContentEl = document.getElementById('editorContent');
        if (editorContentEl) {
            // Initialize table resize on existing tables
            setTimeout(() => {
                initTableResize();
                attachTableClickHandlers();
            }, 500);
            
            editorContentEl.addEventListener('click', function (e) {
                if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
                    activateResizer(e.target);
                    // Prevent editing cursor from jumping inside/near potentially?
                    // e.stopPropagation(); 
                } else {
                    hideResizer();
                }
            });

            editorContentEl.addEventListener('paste', function (e) {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const html = (e.clipboardData || window.clipboardData).getData('text/html');

                if (html) {
                    // Basic support: insert HTML. 
                    document.execCommand('insertHTML', false, html);
                } else {
                    document.execCommand('insertText', false, text);
                }
            });
        }

        function activateResizer(target) {
            activeMedia = target;
            const overlay = document.getElementById('resizeOverlay');
            if (!overlay) return;

            updateResizerPos();
            overlay.classList.add('active');

            // Highlight alignment buttons based on current state?
        }

        function hideResizer() {
            const overlay = document.getElementById('resizeOverlay');
            if (overlay) overlay.classList.remove('active');
            activeMedia = null;
        }

        function updateResizerPos() {
            if (!activeMedia) return;
            const overlay = document.getElementById('resizeOverlay');
            // We need coords relative to .editor-main.
            // activeMedia.offsetTop/Left works if they are in the same offset context.
            // .editor-content is child of .editor-main. .editor-main is relative.
            // activeMedia is inside .editor-content.
            // .editor-content { min-height: 100% }. It doesn't have position: relative usually.
            // So activeMedia.offsetParent is likely .editor-main (since it has position:relative).
            // Let's verify. 
            // If activeMedia is floated, it still works.

            // Wait, offsetTop is relative to offsetParent.
            // If .editor-content is static, offsetParent is .editor-main.

            overlay.style.width = activeMedia.offsetWidth + 'px';
            overlay.style.height = activeMedia.offsetHeight + 'px';

            // If we use offsetTop/Left, it includes margin?
            overlay.style.top = activeMedia.offsetTop + 'px';
            overlay.style.left = activeMedia.offsetLeft + 'px';
        }

        // Drag Handles
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.addEventListener('mousedown', function (e) {
                if (!activeMedia) return;
                isResizing = true;
                activeResizeHandle = e.target.getAttribute('data-corner');
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                startWidth = activeMedia.offsetWidth;
                startHeight = activeMedia.offsetHeight;

                document.addEventListener('mousemove', resizeMedia);
                document.addEventListener('mouseup', stopResize);
                e.preventDefault();
                e.stopPropagation();
            });
        });

        function resizeMedia(e) {
            if (!isResizing || !activeMedia) return;

            const dx = e.clientX - resizeStartX;
            const dy = e.clientY - resizeStartY;

            let newW = startWidth;
            let newH = startHeight;

            if (activeResizeHandle.includes('e')) newW = startWidth + dx;
            if (activeResizeHandle.includes('w')) newW = startWidth - dx;
            if (activeResizeHandle.includes('s')) newH = startHeight + dy;
            if (activeResizeHandle.includes('n')) newH = startHeight - dy;

            // Simplification: only apply to Width/Height styles.
            if (newW > 20) activeMedia.style.width = newW + 'px';
            if (newH > 20) activeMedia.style.height = newH + 'px';

            updateResizerPos();
        }

        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', resizeMedia);
            document.removeEventListener('mouseup', stopResize);
            updateResizerPos(); // Final sync
        }

        function setMediaAlign(align) {
            if (!activeMedia) return;

            // Save width and height before clearing styles
            const savedWidth = activeMedia.style.width || activeMedia.offsetWidth + 'px';
            const savedHeight = activeMedia.style.height || activeMedia.offsetHeight + 'px';

            // Remove just alignment classes and float/margin/display styles (don't clear all styles)
            activeMedia.classList.remove('align-left', 'align-right', 'align-center', 'align-inline');
            activeMedia.style.float = '';
            activeMedia.style.display = '';
            activeMedia.style.margin = '';

            // Apply new alignment
            if (align === 'left') {
                activeMedia.classList.add('align-left');
            } else if (align === 'right') {
                activeMedia.classList.add('align-right');
            } else if (align === 'center') {
                activeMedia.classList.add('align-center');
            } else if (align === 'inline') {
                activeMedia.classList.add('align-inline');
            }

            // Restore width and height
            activeMedia.style.width = savedWidth;
            activeMedia.style.height = savedHeight;

            // Refresh position
            setTimeout(updateResizerPos, 10);
        }

        function deleteSelectedMedia() {
            if (activeMedia) {
                activeMedia.remove();
                hideResizer();
            }
        }

        // Listener for Floating Toolbar (Refined)
        document.addEventListener('selectionchange', () => {
            // If we have an active media resizing happening, hide text toolbar
            if (activeMedia) {
                document.getElementById('floatingToolbar').classList.remove('active');
                return;
            }

            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const content = document.getElementById('editorContent');
            if (!content) return;

            if (!content.contains(selection.anchorNode)) {
                document.getElementById('floatingToolbar').classList.remove('active');
                return;
            }

            if (selection.isCollapsed) {
                document.getElementById('floatingToolbar').classList.remove('active');
                return;
            }

            // Also check if selection contains images? 
            // If it's pure text selection, show toolbar
            const toolbar = document.getElementById('floatingToolbar');
            const rect = range.getBoundingClientRect();

            // Calculate relative to viewport logic if fixed
            // If not fixed, we might need offsets. 
            // In CSS we set it to fixed.

            toolbar.style.top = (rect.top - 60) + 'px';
            toolbar.style.left = (rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)) + 'px';
            toolbar.classList.add('active');

            updateToolbarState();
        });

        // Delete/Usage handler for Media
        document.addEventListener('keydown', function (e) {
            if (activeMedia && (e.key === 'Delete' || e.key === 'Backspace')) {
                // But wait, if focus is in input... activeMedia is only set if we clicked it?
                // We should ensure we don't delete if we are editing a caption or something?
                // But typically activeMedia is the IMG/VIDEO.

                // Also ensure editor is active?
                if (document.getElementById('editorPanel').classList.contains('active')) {
                    deleteSelectedMedia();
                    e.preventDefault();
                }
            }
        });

        document.getElementById('editorContent').addEventListener('keyup', updateToolbarState);
        document.getElementById('editorContent').addEventListener('mouseup', updateToolbarState);

        function updateToolbarState() {
            const buttons = document.querySelectorAll('.tool-btn');
            buttons.forEach(btn => {
                const cmd = btn.getAttribute('data-cmd');
                if (cmd) {
                    if (document.queryCommandState(cmd)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        }

        function init() {
            renderSidebar();
            setTimeout(() => {
                const firstParent = document.querySelector('.nav-parent');
                if (firstParent) {
                    firstParent.classList.add('expanded', 'active-parent');
                    loadSubCategory(structure[0].children[0], structure[0].children[0].subs[0]);
                }
            }, 100);

            document.getElementById('zoomSlider').addEventListener('input', (e) => {
                root.style.setProperty('--card-scale', e.target.value);
            });

            // Initialize search functionality
            initSearch();

            const filterContainer = document.getElementById('filterChecks');
            structure.forEach(group => {
                group.children.forEach(cat => {
                    const label = document.createElement('label');
                    label.className = 'filter-checkbox';
                    label.innerHTML = `<input type="checkbox" checked value="${cat.name}" onchange="updateGraphSettings()"> ${cat.name}`;
                    filterContainer.appendChild(label);
                });
            });

            initParticles();
            initUploadForm();
            initColorPicker();
        }

        // --- SEARCH FUNCTIONALITY ---
        function initSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchSuggestions = document.getElementById('searchSuggestions');
            let searchTimeout = null;

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();

                clearTimeout(searchTimeout);

                if (query.length === 0) {
                    searchSuggestions.classList.remove('active');
                    return;
                }

                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 200);
            });

            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim().length > 0) {
                    searchSuggestions.classList.add('active');
                }
            });

            // Close suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#searchBox')) {
                    searchSuggestions.classList.remove('active');
                }
            });

            // Handle Enter key
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query.length > 0) {
                        executeSearch(query);
                        searchSuggestions.classList.remove('active');
                    }
                } else if (e.key === 'Escape') {
                    searchSuggestions.classList.remove('active');
                }
            });
        }

        // Get all assets from all categories and subcategories
        function getAllAssets() {
            const allAssets = [];

            structure.forEach(group => {
                group.children.forEach(category => {
                    category.subs.forEach(sub => {
                        // Get generated data for this category/subcategory
                        const assets = generateData(category, sub);
                        // Add category and sub info to each asset
                        assets.forEach(asset => {
                            allAssets.push({
                                ...asset,
                                _category: category,
                                _sub: sub,
                                _group: group.group
                            });
                        });
                    });
                });
            });

            return allAssets;
        }

        function performSearch(query) {
            const suggestions = [];

            // Search in categories
            structure.forEach(group => {
                group.children.forEach(category => {
                    if (category.name.toLowerCase().includes(query)) {
                        suggestions.push({
                            type: 'category',
                            title: category.name,
                            category: category,
                            group: group.group
                        });
                    }

                    category.subs.forEach(sub => {
                        if (sub.name.toLowerCase().includes(query)) {
                            suggestions.push({
                                type: 'subcategory',
                                title: sub.name,
                                category: category,
                                sub: sub,
                                group: group.group
                            });
                        }

                        // Search in tags
                        sub.tags.forEach(tag => {
                            if (tag.toLowerCase().includes(query)) {
                                suggestions.push({
                                    type: 'tag',
                                    title: tag,
                                    category: category,
                                    sub: sub,
                                    group: group.group
                                });
                            }
                        });
                    });
                });
            });

            // Search in ALL assets from all categories and subcategories
            const allAssets = getAllAssets();
            allAssets.forEach(asset => {
                if (asset.title.toLowerCase().includes(query) ||
                    asset.tag.toLowerCase().includes(query) ||
                    (asset.description && asset.description.toLowerCase().includes(query)) ||
                    asset.type.toLowerCase().includes(query)) {
                    suggestions.push({
                        type: 'asset',
                        title: asset.title,
                        asset: asset,
                        category: asset._category,
                        sub: asset._sub,
                        group: asset._group
                    });
                }
            });

            displaySearchSuggestions(suggestions, query);
        }

        function displaySearchSuggestions(suggestions, query) {
            const searchSuggestions = document.getElementById('searchSuggestions');
            searchSuggestions.innerHTML = '';

            if (suggestions.length === 0) {
                searchSuggestions.innerHTML = `
                    <div class="suggestion-section">
                        <div class="suggestion-item" style="cursor: default; opacity: 0.5;">
                            <div class="suggestion-item-text">No results found for "${query}"</div>
                        </div>
                    </div>
                `;
                searchSuggestions.classList.add('active');
                return;
            }

            // Group suggestions by type
            const grouped = {
                category: [],
                subcategory: [],
                tag: [],
                asset: []
            };

            suggestions.forEach(s => {
                if (grouped[s.type]) {
                    grouped[s.type].push(s);
                }
            });

            // Display categories
            if (grouped.category.length > 0) {
                const section = document.createElement('div');
                section.className = 'suggestion-section';
                section.innerHTML = '<div class="suggestion-section-title">CATEGORIES</div>';

                grouped.category.slice(0, 3).forEach(item => {
                    const elem = createSuggestionItem('📁', item.title, item.group, () => {
                        loadSubCategory(item.category, item.category.subs[0]);
                        document.getElementById('searchInput').value = '';
                        searchSuggestions.classList.remove('active');
                    });
                    section.appendChild(elem);
                });

                searchSuggestions.appendChild(section);
            }

            // Display subcategories
            if (grouped.subcategory.length > 0) {
                const section = document.createElement('div');
                section.className = 'suggestion-section';
                section.innerHTML = '<div class="suggestion-section-title">SUBCATEGORIES</div>';

                grouped.subcategory.slice(0, 3).forEach(item => {
                    const elem = createSuggestionItem('📂', item.title, `${item.category.name} / ${item.sub.name}`, () => {
                        loadSubCategory(item.category, item.sub);
                        document.getElementById('searchInput').value = '';
                        searchSuggestions.classList.remove('active');
                    });
                    section.appendChild(elem);
                });

                searchSuggestions.appendChild(section);
            }

            // Display tags
            if (grouped.tag.length > 0) {
                const section = document.createElement('div');
                section.className = 'suggestion-section';
                section.innerHTML = '<div class="suggestion-section-title">TAGS</div>';

                // Remove duplicates
                const uniqueTags = [...new Set(grouped.tag.map(t => t.title))];
                uniqueTags.slice(0, 5).forEach(tagName => {
                    const item = grouped.tag.find(t => t.title === tagName);
                    const elem = createSuggestionItem('[TAG]', tagName, 'Filter by tag', () => {
                        if (item.category && item.sub) {
                            loadSubCategory(item.category, item.sub);
                            // Filter by tag
                            setTimeout(() => {
                                const filtered = currentAssets.filter(a => a.tag === tagName.toUpperCase());
                                renderGrid(filtered);
                                // Update filter chips
                                document.querySelectorAll('.filter-chip').forEach(c => {
                                    c.classList.remove('active');
                                    if (c.innerText === tagName) {
                                        c.classList.add('active');
                                    }
                                });
                            }, 100);
                        }
                        document.getElementById('searchInput').value = '';
                        searchSuggestions.classList.remove('active');
                    });
                    section.appendChild(elem);
                });

                searchSuggestions.appendChild(section);
            }

            // Display assets
            if (grouped.asset.length > 0) {
                const section = document.createElement('div');
                section.className = 'suggestion-section';
                section.innerHTML = '<div class="suggestion-section-title">ASSETS</div>';

                grouped.asset.slice(0, 5).forEach(item => {
                    const typeIcon = `[${item.asset.type.toUpperCase()}]`;
                    const categoryInfo = item.category && item.sub ? `${item.category.name} / ${item.sub.name}` : '';
                    const meta = categoryInfo ? `${item.asset.type.toUpperCase()} • ${categoryInfo}` : `${item.asset.type.toUpperCase()} • ${item.asset.size}`;
                    const elem = createSuggestionItem(typeIcon, item.title, meta, () => {
                        if (item.category && item.sub) {
                            loadSubCategory(item.category, item.sub);
                            setTimeout(() => {
                                openModal(item.asset);
                            }, 200);
                        }
                        document.getElementById('searchInput').value = '';
                        searchSuggestions.classList.remove('active');
                    });
                    section.appendChild(elem);
                });

                searchSuggestions.appendChild(section);
            }

            searchSuggestions.classList.add('active');
        }

        function createSuggestionItem(icon, title, meta, onClick) {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-item-icon">${icon}</div>
                <div class="suggestion-item-text">${title}</div>
                <div class="suggestion-item-meta">${meta}</div>
            `;
            item.onclick = onClick;
            return item;
        }

        function executeSearch(query) {
            // Perform full search across ALL assets from all categories
            const allAssets = getAllAssets();
            const filtered = allAssets.filter(asset => {
                return asset.title.toLowerCase().includes(query) ||
                    asset.tag.toLowerCase().includes(query) ||
                    (asset.description && asset.description.toLowerCase().includes(query)) ||
                    asset.type.toLowerCase().includes(query);
            });

            if (filtered.length > 0) {
                // Store search results with category info for navigation
                const searchResults = filtered.map(asset => ({
                    ...asset,
                    _category: asset._category,
                    _sub: asset._sub,
                    _group: asset._group
                }));

                // Render search results
                renderSearchResults(searchResults);
            } else {
                // Show message if no results
                const grid = document.getElementById('grid');
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">🔍</div>
                        <div style="font-size: 14px; color: var(--accent); margin-bottom: 10px;">NO RESULTS FOUND</div>
                        <div style="font-size: 11px;">Try searching for categories, tags, or asset names</div>
                    </div>
                `;
            }
        }

        function renderSearchResults(results) {
            const grid = document.getElementById('grid');
            grid.innerHTML = '';

            // Update page title to show search results
            document.getElementById('pageTitle').innerHTML = `SEARCH RESULTS<span class="page-subtitle">/ ${results.length} ITEMS</span>`;

            // Group results by category for better organization
            const grouped = {};
            results.forEach(asset => {
                const key = `${asset._category.name} / ${asset._sub.name}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        category: asset._category,
                        sub: asset._sub,
                        assets: []
                    };
                }
                grouped[key].assets.push(asset);
            });

            // Render each group
            Object.keys(grouped).forEach(groupKey => {
                const group = grouped[groupKey];

                // Add category header
                const header = document.createElement('div');
                header.style.cssText = 'grid-column: 1 / -1; padding: 20px 0 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 20px;';
                header.innerHTML = `
                    <div style="font-size: 12px; color: var(--accent); letter-spacing: 2px; margin-bottom: 5px;">${group.category.name} / ${group.sub.name}</div>
                    <div style="font-size: 10px; color: #666;">${group.assets.length} item(s)</div>
                `;
                grid.appendChild(header);

                // Render assets in this group
                group.assets.forEach((item, index) => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.style.animation = `slideDown 0.4s ease-out ${index * 0.05}s backwards`;
                    card.onclick = () => {
                        // Navigate to the category first, then open modal
                        loadSubCategory(group.category, group.sub);
                        setTimeout(() => {
                            openModal(item);
                        }, 300);
                    };

                    let typeBadge = item.type.toUpperCase();
                    if (item.type === 'gallery' && item.sources && item.sources.length > 0) {
                        typeBadge = 'GALLERY (' + item.sources.length + ')';
                    }

                    card.innerHTML = `
                        <div class="card-type-badge">${typeBadge}</div>
                        <div class="card-cover"><div class="card-scan"></div><img src="${item.thumbnail}" class="card-img" loading="lazy"></div>
                        <div class="card-body">
                            <div class="card-title">${item.title}</div>
                            <div class="tag-row"><span class="tag-tiny">${item.tag}</span><span class="tag-tiny">SECURE</span></div>
                            <div class="card-footer"><div>SIZE<span class="stat-val">${item.size}</span></div><div>VER<span class="stat-val">${item.ver}</span></div></div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            });
        }

        function renderSidebar() {
            const nav = document.getElementById('navList');
            nav.innerHTML = '';
            structure.forEach(group => {
                const groupHeader = document.createElement('div');
                groupHeader.className = 'nav-group-header';
                groupHeader.innerText = group.group;
                nav.appendChild(groupHeader);
                group.children.forEach(parent => {
                    const parentEl = document.createElement('div');
                    parentEl.className = 'nav-parent';
                    const header = document.createElement('div');
                    header.className = 'nav-parent-header';
                    header.innerHTML = `<span>${parent.name}</span><span>+</span>`;
                    header.addEventListener('click', () => {
                        const isExpanded = parentEl.classList.contains('expanded');
                        document.querySelectorAll('.nav-parent').forEach(p => p.classList.remove('expanded', 'active-parent'));
                        if (!isExpanded) {
                            parentEl.classList.add('expanded', 'active-parent');
                            if (parent.subs.length > 0) loadSubCategory(parent, parent.subs[0]);
                        }
                    });
                    const subList = document.createElement('div');
                    subList.className = 'nav-sub-list';
                    parent.subs.forEach(sub => {
                        const item = document.createElement('div');
                        item.className = 'nav-sub-item';
                        item.innerText = sub.name;
                        item.addEventListener('click', (e) => { e.stopPropagation(); loadSubCategory(parent, sub); });
                        subList.appendChild(item);
                    });
                    parentEl.appendChild(header);
                    parentEl.appendChild(subList);
                    nav.appendChild(parentEl);
                });
            });
        }

        function loadSubCategory(parent, sub) {
            currentParent = parent;
            currentSub = sub;
            root.style.setProperty('--accent', parent.color);
            root.style.setProperty('--border-glow', parent.color + '66');
            document.getElementById('pageTitle').innerHTML = `${parent.name}<span class="page-subtitle">/ ${sub.name}</span>`;

            // Expand the parent category in sidebar
            document.querySelectorAll('.nav-parent').forEach(p => {
                const headerText = p.querySelector('.nav-parent-header span')?.innerText;
                if (headerText === parent.name) {
                    p.classList.add('expanded', 'active-parent');
                } else {
                    p.classList.remove('expanded', 'active-parent');
                }
            });

            document.querySelectorAll('.nav-sub-item').forEach(el => {
                el.classList.remove('active');
                if (el.innerText === sub.name) el.classList.add('active');
            });
            currentAssets = generateData(parent, sub);
            renderGrid(currentAssets);
            renderFilters(sub.tags);
        }

        function generateData(parent, sub) {
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
                else if (sub.id === 'logs' && parent.id === 'docs') { // Differentiate logs from audio logs
                    type = 'txt';
                    sources = ['LOG_DATA'];
                }
                else if (sub.id === 'vehicles' || sub.id === 'chars') {
                    type = 'model';
                    sources = ['MOCK_3D_MODEL'];
                }
                else if (parent.id === 'audio') {
                    type = 'audio';
                    // Use working free audio samples
                    // Reliable HTTPS Audio Samples (Free Music Archive / similar)
                    const audioSamples = [
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipses.mp3',
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Lobo_Loco/Vagabond/Lobo_Loco_-_06_-_Kick_Push_Vagabond.mp3',
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipses.mp3',
                        'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Lobo_Loco/Vagabond/Lobo_Loco_-_06_-_Kick_Push_Vagabond.mp3',
                    ];
                    sources = [audioSamples[i % audioSamples.length]];

                    // Add mock metadata
                    const meta = [
                        { dur: 185, fmt: 'MP3', br: '320 kbps' },
                        { dur: 240, fmt: 'MP3', br: '320 kbps' },
                        { dur: 156, fmt: 'MP3', br: '192 kbps' },
                        { dur: 302, fmt: 'MP3', br: '320 kbps' },
                        { dur: 215, fmt: 'MP3', br: '256 kbps' },
                        { dur: 198, fmt: 'MP3', br: '320 kbps' }
                    ];
                    const m = meta[i % meta.length];

                    // Assign to object (accessed by item.duration, etc)
                    // We need to attach these to the *object* being created, 
                    // but here we are inside the structure loop calculating props.
                    // The 'newEntry' is created a few lines later.
                    // Wait, looking at the code structure...
                    // The 'sources', 'type', 'thumb' are local vars used to create 'newEntry' at line 1735 approx.
                    // I need to export these values or allow 'newEntry' to have them.

                    // We can add them to a temporary object or modify the loop to support extra props.
                    // Let's modify the push below.
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
                    // Audio waveform placeholder
                    thumb = `https://placehold.co/400x300/101015/ff0055?text=AUDIO+WAVE&font=monospace`;
                }

                const entry = {
                    title: `${sub.name}_${type.toUpperCase()}_${i + 100}`,
                    type: type,
                    thumbnail: thumb, // Changed from 'thumb' to 'thumbnail' to match existing structure
                    sources: sources,
                    tag: tag, // Changed from 'tags' to 'tag' to match existing structure
                    size: (Math.random() * 400 + 10).toFixed(1) + ' MB', // Kept original size calculation
                    ver: 'v.' + (Math.random() * 5 + 1).toFixed(1) // Kept original ver calculation
                };

                if (type === 'model') {
                    entry.polyCount = Math.floor(Math.random() * 50000 + 1000); // Kept original calculation
                    entry.vertCount = Math.floor(Math.random() * 30000 + 500); // Kept original calculation
                }
                if (type === 'audio') {
                    // entry.duration = ... (Removed to use actual metadata)
                    // entry.bitrate = ... (Removed to use actual metadata)
                    entry.fmt = 'MP3'; // Default to MP3 for these samples
                }

                arr.push(entry);
            }
            return arr;
        }

        // Generate 3D Model Thumbnail
        function generate3DThumbnail(seed) {
            // Use reliable 3D render images
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

        function renderFilters(tags) {
            const container = document.getElementById('filterContainer');
            container.innerHTML = '';
            const allBtn = document.createElement('div');
            allBtn.className = 'filter-chip active';
            allBtn.innerText = 'ALL_DATA';
            allBtn.onclick = () => {
                renderGrid(currentAssets);
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                allBtn.classList.add('active');
            };
            container.appendChild(allBtn);
            tags.forEach(tag => {
                const chip = document.createElement('div');
                chip.className = 'filter-chip';
                chip.innerText = tag;
                chip.onclick = () => {
                    const filtered = currentAssets.filter(item => item.tag === tag);
                    renderGrid(filtered);
                    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                };
                container.appendChild(chip);
            });
        }

        function renderGrid(data) {
            const grid = document.getElementById('grid');
            grid.innerHTML = '';
            data.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.animation = `slideDown 0.4s ease-out ${index * 0.05}s backwards`;
                card.onclick = () => openModal(item);
                let typeBadge = item.type.toUpperCase();
                if (item.type === 'gallery' && item.sources && item.sources.length > 0) {
                    typeBadge = 'GALLERY (' + item.sources.length + ')';
                }

                card.innerHTML = `
                    <div class="card-type-badge">${typeBadge}</div>
                    <div class="card-cover"><div class="card-scan"></div><img src="${item.thumbnail}" class="card-img" loading="lazy"></div>
                    <div class="card-body">
                        <div class="card-title">${item.title}</div>
                        <div class="tag-row"><span class="tag-tiny">${item.tag}</span><span class="tag-tiny">SECURE</span></div>
                        <div class="card-footer"><div>SIZE<span class="stat-val">${item.size}</span></div><div>VER<span class="stat-val">${item.ver}</span></div></div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function openModal(item) {
            activeItem = item; currentMediaIndex = 0;
            const modal = document.getElementById('modal');
            const container = document.getElementById('mediaContainer');
            document.getElementById('modalTitle').innerText = item.title;
            document.getElementById('modalSize').innerText = item.size;
            document.getElementById('modalVer').innerText = item.ver;
            document.getElementById('modalType').innerText = item.type.toUpperCase();
            document.getElementById('btnPrev').style.display = 'none';
            document.getElementById('btnNext').style.display = 'none';
            document.getElementById('thumbStrip').classList.remove('active');
            container.innerHTML = '';

            // Show/Hide Thumbnail Navigation
            const thumbContainer = document.getElementById('thumbStrip'); // Corrected to 'thumbStrip'
            // Check if item has sources array and multiple sources (exclude article type)
            if (item.type === 'article') {
                // Articles don't have sources, hide navigation
                thumbContainer.classList.remove('active');
                document.getElementById('btnPrev').style.display = 'none';
                document.getElementById('btnNext').style.display = 'none';
            } else if (item.sources && (item.type === 'gallery' || (item.sources.length > 1 && item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio'))) {
                thumbContainer.classList.add('active'); // Use classList for 'active'
                renderThumbnails();
                document.getElementById('btnPrev').style.display = 'flex';
                document.getElementById('btnNext').style.display = 'flex';
            } else {
                thumbContainer.classList.remove('active'); // Use classList for 'active'
                document.getElementById('btnPrev').style.display = 'none';
                document.getElementById('btnNext').style.display = 'none';
            }

            // Update Stats Display for Models
            if (item.type === 'model') {
                document.getElementById('modalSize').parentElement.children[0].innerText = 'VERTICES';
                document.getElementById('modalSize').innerText = item.vertCount.toLocaleString();
                document.getElementById('modalVer').parentElement.children[0].innerText = 'FACES';
                document.getElementById('modalVer').innerText = item.vertCount.toLocaleString();
            } else if (item.type === 'audio') {
                document.getElementById('modalSize').parentElement.children[0].innerText = 'DURATION';
                document.getElementById('modalSize').innerText = formatTime(item.duration) || '--:--';
                document.getElementById('modalVer').parentElement.children[0].innerText = 'FORMAT';
                document.getElementById('modalVer').innerText = item.bitrate || 'OGG';
            } else {
                document.getElementById('modalSize').parentElement.children[0].innerText = 'SIZE';
                document.getElementById('modalVer').parentElement.children[0].innerText = 'VERSION';
            }

            renderMediaContent(item, 0);
            modal.classList.add('active');
        }

        let threeScene, threeCamera, threeRenderer, threeControls, animationId;
        let currentModelViewer = null;

        function render3DModel(container, item) {
            container.innerHTML = '';

            // Use the actual model URL from item.sources
            const modelUrl = item.sources && item.sources.length > 0 ? item.sources[0] : null;

            if (!modelUrl) {
                container.innerHTML = '<div style="color: #ff0055; padding: 20px; text-align: center;">>> ERROR: MODEL SOURCE NOT FOUND</div>';
                return;
            }

            // Check if model-viewer supports this format (GLB/GLTF work best)
            // For blob URLs, check the original filename from item if available
            let fileName = '';
            if (item.originalFileName) {
                fileName = item.originalFileName.toLowerCase();
            } else if (item.title && (item.title.includes('.glb') || item.title.includes('.gltf') ||
                item.title.includes('.obj') || item.title.includes('.fbx'))) {
                fileName = item.title.toLowerCase();
            } else if (typeof modelUrl === 'string') {
                // Try to extract from URL if it's not a blob URL
                fileName = modelUrl.toLowerCase();
            }
            const isGLB = fileName.endsWith('.glb') || fileName.endsWith('.gltf');

            if (isGLB) {
                // Use model-viewer for GLB/GLTF files (best support)
                const modelViewer = document.createElement('model-viewer');
                modelViewer.setAttribute('src', modelUrl);
                modelViewer.setAttribute('alt', item.title);
                modelViewer.setAttribute('camera-controls', '');
                modelViewer.setAttribute('auto-rotate', '');
                modelViewer.setAttribute('shadow-intensity', '1');
                modelViewer.setAttribute('shadow-softness', '0.5');
                modelViewer.setAttribute('exposure', '1');
                modelViewer.setAttribute('environment-image', 'neutral');
                modelViewer.setAttribute('camera-orbit', '45deg 55deg 4.5m');
                modelViewer.setAttribute('min-camera-orbit', 'auto auto auto');
                modelViewer.setAttribute('max-camera-orbit', 'auto auto auto');
                modelViewer.setAttribute('loading', 'eager');
                modelViewer.style.width = '100%';
                modelViewer.style.height = '100%';
                modelViewer.style.background = 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a15 100%)';

                container.appendChild(modelViewer);
                currentModelViewer = modelViewer;
            } else {
                // For other formats (OBJ, FBX, etc.), show download option or use Three.js
                // For now, show a message with download option
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 40px; text-align: center;';
                wrapper.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                    <div style="font-size: 18px; color: var(--accent); margin-bottom: 10px;">3D MODEL DETECTED</div>
                    <div style="font-size: 12px; color: #888; margin-bottom: 30px;">Format: ${fileName ? fileName.split('.').pop().toUpperCase() : 'UNKNOWN'}</div>
                    <div style="font-size: 11px; color: #666; margin-bottom: 20px;">Model viewer supports GLB/GLTF formats.<br>For other formats, please download the file.</div>
                    <a href="${modelUrl}" download="${item.title}" style="
                        display: inline-block;
                        padding: 12px 24px;
                        background: var(--accent);
                        color: #000;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: bold;
                        font-size: 11px;
                        letter-spacing: 1px;
                    ">DOWNLOAD MODEL</a>
                `;
                container.appendChild(wrapper);
                currentModelViewer = null;
            }

            // Handle Resize with ResizeObserver
            const resizeObserver = new ResizeObserver(() => {
                if (!modelViewer || !container) return;
                const width = container.clientWidth;
                const height = container.clientHeight;
                if (width > 0 && height > 0) {
                    modelViewer.style.width = width + 'px';
                    modelViewer.style.height = height + 'px';
                }
            });
            resizeObserver.observe(container);

            // Store for cleanup
            container._resizeObserver = resizeObserver;
            container._modelViewer = modelViewer;
        }

        let audioContext, audioAnalyser, audioSource, audioAnimationId;

        function renderAudioPlayer(container, item) {
            container.innerHTML = '';
            container.classList.add('audio-player-container');

            // --- LAYOUT SETUP ---
            const wrapper = document.createElement('div');
            wrapper.className = 'audio-interface';
            wrapper.style.cssText = `
                width: 100%; height: 100%; display: flex; flex-direction: column;
                background: radial-gradient(circle at center, #1a1a2e 0%, #000 100%);
                position: relative; overflow: hidden;
            `;

            // Canvas Layer
            const canvas = document.createElement('canvas');
            canvas.className = 'audio-visualizer';
            canvas.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; z-index: 1;';
            wrapper.appendChild(canvas);

            // Container for controls (minimal, floating at bottom)
            const controls = document.createElement('div');
            controls.className = 'audio-controls';
            controls.style.cssText = `
                position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                width: 80%; padding: 15px 30px;
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(0, 243, 255, 0.3);
                border-radius: 4px;
                backdrop-filter: blur(5px);
                z-index: 10; display: flex; align-items: center; gap: 20px;
                box-shadow: 0 0 20px rgba(0, 243, 255, 0.1);
            `;

            // Play/Pause Button
            const playBtn = document.createElement('button');
            playBtn.className = 'cyber-btn icon-only';
            playBtn.innerHTML = '<i class="ph ph-play"></i>';
            playBtn.style.cssText = `
                font-size: 20px; width: 40px; height: 40px;
                display: flex; align-items: center; justify-content: center;
                padding: 0; 
            `;

            // Progress Bar
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = 'flex: 1; height: 4px; background: rgba(255,255,255,0.1); cursor: pointer; position: relative;';
            const progressFill = document.createElement('div');
            progressFill.style.cssText = 'height: 100%; width: 0%; background: var(--accent); box-shadow: 0 0 8px var(--accent); position: relative;';
            // Scrubber handle
            const scrubber = document.createElement('div');
            scrubber.style.cssText = 'position: absolute; right: -4px; top: -3px; width: 10px; height: 10px; background: #fff; border-radius: 50%; box-shadow: 0 0 5px #fff;';
            progressFill.appendChild(scrubber);
            progressContainer.appendChild(progressFill);

            // Volume Icon
            const volIcon = document.createElement('i');
            volIcon.className = 'ph ph-speaker-high';
            volIcon.style.color = 'var(--accent)';

            controls.appendChild(playBtn);
            controls.appendChild(progressContainer);
            controls.appendChild(volIcon);
            wrapper.appendChild(controls);
            container.appendChild(wrapper);

            // --- AUDIO LOGIC ---
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = item.sources[0];
            audio.volume = 0.5;

            audio.onerror = (e) => {
                console.error("Audio Load Error", e);
                const title = document.getElementById('modalTitle');
                if (title) {
                    title.innerText = "AUDIO ERROR: LOAD FAILED";
                    title.style.color = "var(--c-alert)";
                }
            };

            // --- METADATA UPDATE ---
            audio.onloadedmetadata = () => {
                // Update Modal Info Panel (Right Side)
                const durVal = document.getElementById('modalSize'); // Borrowed for Duration
                const fmtVal = document.getElementById('modalVer');  // Borrowed for Format/Type

                if (durVal) {
                    durVal.parentElement.children[0].innerText = "DURATION"; // Label
                    durVal.innerText = formatTime(audio.duration);
                    durVal.style.color = "var(--accent)";
                    durVal.style.textShadow = "0 0 5px var(--accent)";
                }
                if (fmtVal) {
                    fmtVal.parentElement.children[0].innerText = "TYPE"; // Label
                    // Get extension from URL
                    const ext = item.sources[0].split('.').pop().split('?')[0].toUpperCase();
                    fmtVal.innerText = ext + " AUDIO";
                }

                // Auto-play safely
                playBtn.click();
            };

            // Progress Update
            audio.ontimeupdate = () => {
                if (audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    progressFill.style.width = pct + '%';
                }
            };

            // Seek
            progressContainer.onclick = (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const p = (e.clientX - rect.left) / rect.width;
                audio.currentTime = p * audio.duration;
            };

            // Toggle Play
            playBtn.onclick = () => {
                if (audio.paused) {
                    // Init Context on user gesture
                    initAudioContext();
                    audio.play().then(() => {
                        playBtn.innerHTML = '<i class="ph ph-pause"></i>';
                        playBtn.classList.add('active');
                    }).catch(err => console.error("Play error:", err));
                } else {
                    audio.pause();
                    playBtn.innerHTML = '<i class="ph ph-play"></i>';
                    playBtn.classList.remove('active');
                }
            };

            // --- VISUALIZER ---
            function initAudioContext() {
                if (audioContext) return;
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioCtx();
                audioAnalyser = audioContext.createAnalyser();
                audioAnalyser.fftSize = 512; // Higher resolution
                audioSource = audioContext.createMediaElementSource(audio);
                audioSource.connect(audioAnalyser);
                audioAnalyser.connect(audioContext.destination);

                // Start Loop
                drawVisualizer();
            }

            function drawVisualizer() {
                audioAnimationId = requestAnimationFrame(drawVisualizer);

                // Resize
                canvas.width = wrapper.clientWidth;
                canvas.height = wrapper.clientHeight;
                const ctx = canvas.getContext('2d');
                const w = canvas.width;
                const h = canvas.height;
                const cx = w / 2;
                const cy = h / 2;

                // Data
                const bufferLength = audioAnalyser.frequencyBinCount; // 256
                const dataArray = new Uint8Array(bufferLength);
                audioAnalyser.getByteFrequencyData(dataArray);

                // Clear
                ctx.fillStyle = '#020205'; // Deep dark background
                ctx.fillRect(0, 0, w, h);

                // --- RETRO CYBER EFFECTS ---

                // 1. Grid Background ( Perspective )
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
                ctx.lineWidth = 1;
                // Vertical lines perspective
                for (let i = -10; i <= 10; i++) {
                    ctx.moveTo(cx + i * 100, h);
                    ctx.lineTo(cx + i * 20, cy);
                }
                // Horizontal lines
                for (let i = 0; i < 10; i++) {
                    const y = cy + i * (h / 2 / 10) * i * 0.2; // Exponential spacing
                    ctx.moveTo(0, y + 20);
                    ctx.lineTo(w, y + 20);
                }
                ctx.stroke();
                ctx.restore();

                // 2. Center HUD Core
                const radius = 60;
                const pulse = (dataArray[10] / 255) * 20; // Beat reaction
                const r = radius + pulse;

                // Glowing Hexagon
                ctx.save();
                ctx.translate(cx, cy);
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f3ff';

                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = r * Math.cos(angle);
                    const y = r * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();

                // Inner Time (HUD)
                ctx.rotate(0); // Ensure text is straight
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 24px "Courier New"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowBlur = 0;

                const cur = formatTime(audio.currentTime);
                ctx.fillText(cur, 0, 0);

                // "REC" like dot
                if (audio.paused) {
                    ctx.fillStyle = '#555';
                } else {
                    ctx.fillStyle = (Date.now() % 1000 < 500) ? '#ff0055' : '#550022';
                }
                ctx.beginPath();
                ctx.arc(0, 40, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();


                // 3. Symmetrical Bars
                const barWidth = 6;
                const gap = 4;
                const maxBarHeight = h * 0.5;
                const bars = 40; // Number of bars per side

                for (let i = 0; i < bars; i++) {
                    // Map low freq to center, high to edges? Or vice versa.
                    // Usually low is index 0. Let's put bass in center.
                    const val = dataArray[i * 2]; // Skip some bins
                    const p = val / 255;
                    const barH = p * maxBarHeight;

                    const xOffset = radius + 30 + (i * (barWidth + gap));

                    // Color Grad
                    const grad = ctx.createLinearGradient(0, cy - barH, 0, cy + barH);
                    grad.addColorStop(0, 'rgba(0, 243, 255, 0)');
                    grad.addColorStop(0.5, `rgba(0, 243, 255, ${p + 0.2})`);
                    grad.addColorStop(1, 'rgba(0, 243, 255, 0)');

                    ctx.fillStyle = grad;

                    // Right Side
                    ctx.fillRect(cx + xOffset, cy - barH / 2, barWidth, barH);
                    // Left Side
                    ctx.fillRect(cx - xOffset - barWidth, cy - barH / 2, barWidth, barH);

                    // Mirror effect (Top/Bottom reflection hints)
                    // ... slightly complex, let's stick to the main bars first.

                    // Little "Caps"
                    if (p > 0.1) {
                        ctx.fillStyle = '#fff';
                        // Right Cap
                        ctx.fillRect(cx + xOffset, cy - barH / 2 - 2, barWidth, 2);
                        ctx.fillRect(cx + xOffset, cy + barH / 2, barWidth, 2);
                        // Left Cap
                        ctx.fillRect(cx - xOffset - barWidth, cy - barH / 2 - 2, barWidth, 2);
                        ctx.fillRect(cx - xOffset - barWidth, cy + barH / 2, barWidth, 2);
                    }
                }

                // 4. Secondary Fills (Magenta) - High freqs
                // Draw some flying particles or lines based on high freqs
                const highFreq = dataArray[100];
                if (highFreq > 100) {
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 0, 85, ${(highFreq - 100) / 155})`;
                    ctx.beginPath();
                    ctx.moveTo(0, cy);
                    ctx.lineTo(w, cy);
                    ctx.stroke();
                    ctx.restore();
                }

                // Add reference text "5D STEREO"
                ctx.font = '10px "Arial"';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';
                ctx.fillText("5D STEREO 360° SURROUND", cx, cy + r + 30);
            }

            // Cleanup
            container._cleanupAudio = () => {
                if (audio) { audio.pause(); audio.src = ""; }
                if (audioContext && audioContext.state !== 'closed') audioContext.close();
                if (audioAnimationId) cancelAnimationFrame(audioAnimationId);
                audioContext = null;
                audioSource = null;
                audioAnalyser = null;
            };
        }

        function formatTime(s) {
            if (isNaN(s) || !isFinite(s)) return "00:00";
            const min = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }

        function simulateLoading(callback) {
            const loader = document.getElementById('mediaLoader');
            const bar = document.getElementById('loadBar');
            const pct = document.getElementById('loadPercent');
            loader.classList.add('active'); bar.style.width = '0%'; pct.innerText = '0%';
            let progress = 0;
            if (loadTimer) clearInterval(loadTimer);
            loadTimer = setInterval(() => {
                progress += Math.random() * 8;
                if (progress > 100) progress = 100;
                bar.style.width = progress + '%'; pct.innerText = Math.floor(progress) + '%';
                if (progress === 100) { clearInterval(loadTimer); setTimeout(() => { loader.classList.remove('active'); if (callback) callback(); }, 300); }
            }, 50);
        }

        function renderMediaContent(item, index) {
            const container = document.getElementById('mediaContainer');
            
            // Handle article type (has content instead of sources)
            if (item.type === 'article') {
                simulateLoading(() => {
                    container.innerHTML = '';
                    const wrap = document.createElement('div');
                    wrap.className = 'media-object active';
                    wrap.style.cssText = 'width: 100%; height: 100%; overflow-y: auto; padding: 40px; background: rgba(0, 0, 0, 0.3);';
                    wrap.innerHTML = item.content || '<p>No content available</p>';
                    container.appendChild(wrap);
                });
                return;
            }
            
            // For other types, use sources array
            if (!item.sources || !item.sources[index]) {
                container.innerHTML = '<div style="color: #ff0055; padding: 20px; text-align: center;">>> ERROR: SOURCE NOT FOUND</div>';
                return;
            }
            
            const src = item.sources[index];
            simulateLoading(() => {
                container.innerHTML = '';
                let element;

                if (item.type === 'video') {
                    element = document.createElement('video'); element.src = src; element.controls = true; element.autoplay = true; element.loop = true; element.className = 'media-object active';
                    container.appendChild(element);
                }
                else if (item.type === 'pdf') {
                    // PDF preview using iframe
                    element = document.createElement('iframe');
                    element.className = 'pdf-frame media-object active';
                    element.src = src + '#toolbar=0&navpanes=0';
                    element.style.width = '100%';
                    element.style.height = '100%';
                    element.style.border = 'none';
                    container.appendChild(element);
                }
                else if (item.type === 'doc') {
                    // Document files - show download option or preview if possible
                    const wrap = document.createElement('div');
                    wrap.className = 'media-object active';
                    wrap.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 40px; text-align: center;';
                    const fileName = src.split('/').pop() || item.title;
                    const fileExt = fileName.split('.').pop().toUpperCase();
                    wrap.innerHTML = `
                        <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                        <div style="font-size: 18px; color: var(--accent); margin-bottom: 10px;">DOCUMENT FILE</div>
                        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">${fileName}</div>
                        <div style="font-size: 11px; color: #666; margin-bottom: 30px;">Format: ${fileExt}</div>
                        <a href="${src}" download="${fileName}" style="
                            display: inline-block;
                            padding: 12px 24px;
                            background: var(--accent);
                            color: #000;
                            text-decoration: none;
                            border-radius: 4px;
                            font-weight: bold;
                            font-size: 11px;
                            letter-spacing: 1px;
                        ">DOWNLOAD DOCUMENT</a>
                    `;
                    container.appendChild(wrap);
                }
                else if (item.type === 'txt') {
                    // ... (keep txt logic)
                    const wrap = document.createElement('div');
                    wrap.className = 'text-reader-container active media-object';
                    const toc = document.createElement('div'); toc.className = 'text-toc';
                    toc.innerHTML = `<div style="color:var(--accent); font-weight:bold; margin-bottom:10px;">// DIRECTORY</div>`;
                    ['0x00_HEADER', '0x01_INIT_SEQ', '0x02_BODY_LOG', '0x03_ERR_DUMP', '0x04_EOF'].forEach(chap => {
                        const row = document.createElement('div'); row.className = 'toc-item'; row.innerText = chap; toc.appendChild(row);
                    });
                    const content = document.createElement('div'); content.className = 'text-content';
                    content.innerHTML = `<h1>${item.title}</h1><p>DATE: 2077-11-02 <br>ENCRYPTION: AES-256-GCM</p><p>System diagnostics initialized...</p><p>${generateRandomLog()}</p>`;
                    wrap.appendChild(toc); wrap.appendChild(content); container.appendChild(wrap);
                }
                else if (item.type === 'model') {
                    const wrap = document.createElement('div');
                    wrap.className = 'media-object active';
                    wrap.style.width = '100%';
                    wrap.style.height = '100%';
                    wrap.style.minHeight = '500px';
                    container.appendChild(wrap);
                    // Pass the current source to render3DModel
                    const modelItem = { ...item, sources: [src] };
                    setTimeout(() => render3DModel(wrap, modelItem), 100);
                }
                else if (item.type === 'audio') {
                    const wrap = document.createElement('div');
                    wrap.className = 'media-object active';
                    wrap.style.width = '100%';
                    wrap.style.height = '100%';
                    container.appendChild(wrap);
                    setTimeout(() => renderAudioPlayer(wrap, item), 100);
                }
                else {
                    element = document.createElement('img'); element.src = src; element.className = 'media-object active';
                    container.appendChild(element);
                }
            });
            // Only update thumbnail navigation if item has sources and multiple items
            if (item.sources && item.sources.length > 1 && 
                (item.type === 'gallery' || (item.type !== 'pdf' && item.type !== 'txt' && item.type !== 'model' && item.type !== 'audio' && item.type !== 'article'))) {
                updateThumbnailActive(index);
            }
        }

        function generateRandomLog() {
            return `>> PACKET_DUMP: ${Math.random().toString(36).substring(7)} ${Math.random().toString(36).substring(7)}... [OK]`;
        }

        function renderThumbnails() {
            const strip = document.getElementById('thumbStrip'); 
            strip.innerHTML = '';
            
            // Check if item has sources
            if (!activeItem.sources || activeItem.sources.length === 0) {
                return;
            }
            
            activeItem.sources.forEach((src, idx) => {
                const thumb = document.createElement('div'); 
                thumb.className = 'thumb-item';
                if (idx === currentMediaIndex) thumb.classList.add('active');
                const img = document.createElement('img'); 
                img.src = src; 
                thumb.appendChild(img);
                thumb.onclick = () => { 
                    currentMediaIndex = idx; 
                    renderMediaContent(activeItem, currentMediaIndex); 
                };
                strip.appendChild(thumb);
            });
        }

        function updateThumbnailActive(index) {
            const thumbs = document.querySelectorAll('.thumb-item');
            thumbs.forEach((t, i) => { t.classList.toggle('active', i === index); });
        }

        function navigateMedia(direction) {
            if (!activeItem) return;
            // Articles don't have sources, so navigation doesn't apply
            if (activeItem.type === 'article' || !activeItem.sources || activeItem.sources.length === 0) {
                return;
            }
            const total = activeItem.sources.length;
            currentMediaIndex += direction;
            if (currentMediaIndex >= total) currentMediaIndex = 0;
            if (currentMediaIndex < 0) currentMediaIndex = total - 1;
            renderMediaContent(activeItem, currentMediaIndex);
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('active');

            // Clean up
            const container = document.getElementById('mediaContainer');
            if (container) {
                if (container._resizeObserver) {
                    container._resizeObserver.disconnect();
                    container._resizeObserver = null;
                }
                if (container._modelViewer) {
                    container._modelViewer = null;
                }
                // Cleanup Audio
                if (container._cleanupAudio) {
                    container._cleanupAudio();
                    container._cleanupAudio = null;
                }
            }
            currentModelViewer = null;

            document.getElementById('mediaContainer').innerHTML = '';
            document.getElementById('modalPanel').classList.remove('expanded');
            document.querySelector('.expand-btn').innerText = "EXPAND";
        }

        function toggleFullscreen() {
            const panel = document.getElementById('modalPanel');
            const btn = document.querySelector('.expand-btn');
            panel.classList.toggle('expanded');
            btn.innerText = panel.classList.contains('expanded') ? "SHRINK" : "EXPAND";
        }

        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('modal').classList.contains('active')) return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') navigateMedia(-1);
            if (e.key === 'ArrowRight') navigateMedia(1);
        });

        // --- UPLOAD LOGIC ---
        function initUploadForm() {
            const catSel = document.getElementById('upCategory');
            structure.forEach((group, idx) => {
                group.children.forEach((cat, cIdx) => {
                    const opt = document.createElement('option');
                    opt.value = `${idx}-${cIdx}`;
                    opt.innerText = cat.name;
                    catSel.appendChild(opt);
                });
            });
            updateSubCats();
        }

        function updateSubCats() {
            const val = document.getElementById('upCategory').value.split('-');
            const cat = structure[val[0]].children[val[1]];
            const subSel = document.getElementById('upSub');
            subSel.innerHTML = '';
            cat.subs.forEach((sub, sIdx) => {
                const opt = document.createElement('option');
                opt.value = sIdx;
                opt.innerText = sub.name;
                subSel.appendChild(opt);
            });
        }

        function openUploadPanel() {
            document.getElementById('uploadPanel').classList.add('active');
            document.getElementById('modal').classList.add('active');
            document.getElementById('modalPanel').style.display = 'none';
            // Reset state
            uploadedFiles = [];
            uploadedCover = null;
            document.getElementById('upTitle').value = '';
            document.getElementById('upDesc').value = '';
            document.getElementById('upTags').value = '';
            document.getElementById('fileList').innerHTML = '<div style="text-align:center; color:#444; padding:20px; font-size:10px;">NO FILES SELECTED</div>';
            document.getElementById('preImg').src = 'https://placehold.co/600x400/000/00f3ff?text=NO+PREVIEW';
            const coverDrop = document.getElementById('coverDrop');
            coverDrop.style.backgroundImage = 'none';
            // Preserve the input element when resetting - get it BEFORE clearing innerHTML
            const coverInput = coverDrop.querySelector('#coverInput') || document.getElementById('coverInput');
            coverDrop.innerHTML = '<span>CLICK TO SET COVER</span>';
            // Re-add the input element if it exists
            if (coverInput) {
                coverDrop.appendChild(coverInput);
            } else {
                // If input doesn't exist, recreate it
                const newInput = document.createElement('input');
                newInput.type = 'file';
                newInput.id = 'coverInput';
                newInput.style.display = 'none';
                newInput.accept = 'image/*';
                newInput.onchange = function () { handleCoverSelect(this); };
                coverDrop.appendChild(newInput);
            }
        }

        function closeUploadPanel() {
            document.getElementById('uploadPanel').classList.remove('active');
            document.getElementById('modal').classList.remove('active');
            document.getElementById('modalPanel').style.display = 'flex';
        }

        // --- NEW UPLOAD LOGIC ---

        function handleFileSelect(input) {
            const files = Array.from(input.files);
            if (files.length === 0) return;

            uploadedFiles = [...uploadedFiles, ...files];
            renderFileList();
            updatePreview();

            // Auto-set cover from first image if not set
            if (!uploadedCover) {
                const firstImg = uploadedFiles.find(f => f.type.startsWith('image/'));
                if (firstImg) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // Don't auto-set if user already picked one manually, but here check again
                        if (!uploadedCover) {
                            document.getElementById('preImg').src = e.target.result;
                            // Use this as cover for data
                            uploadedCover = e.target.result;
                        }
                    };
                    reader.readAsDataURL(firstImg);
                }
            }
        }

        function handleCoverSelect(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedCover = e.target.result;
                const coverDrop = document.getElementById('coverDrop');
                coverDrop.style.backgroundImage = `url(${uploadedCover})`;
                // Preserve the input element when clearing text - get it BEFORE clearing innerHTML
                const coverInput = coverDrop.querySelector('#coverInput') || document.getElementById('coverInput');
                coverDrop.innerHTML = ''; // Hide text
                // Re-add the input element if it exists
                if (coverInput) {
                    coverDrop.appendChild(coverInput);
                } else {
                    // If input doesn't exist, recreate it
                    const newInput = document.createElement('input');
                    newInput.type = 'file';
                    newInput.id = 'coverInput';
                    newInput.style.display = 'none';
                    newInput.accept = 'image/*';
                    newInput.onchange = function () { handleCoverSelect(this); };
                    coverDrop.appendChild(newInput);
                }
                updatePreview();
            };
            reader.readAsDataURL(file);
        }

        function renderFileList() {
            const list = document.getElementById('fileList');
            list.innerHTML = '';
            if (uploadedFiles.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#444; padding:20px; font-size:10px;">NO FILES SELECTED</div>';
                return;
            }

            uploadedFiles.forEach((file, idx) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                        <i class="ph ph-file-text" style="color:var(--accent)"></i>
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</span>
                    </div>
                    <div style="color:#666; font-size:9px;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                `;
                // Remove button
                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = "cursor:pointer; color:var(--c-alert); font-size:14px; margin-left:10px;";
                removeBtn.onclick = () => {
                    uploadedFiles.splice(idx, 1);
                    renderFileList();
                    updatePreview();
                };
                item.appendChild(removeBtn);
                list.appendChild(item);
            });
        }

        function updatePreview() {
            const title = document.getElementById('upTitle').value || (uploadedFiles.length > 0 ? uploadedFiles[0].name : 'UNTITLED_ASSET');
            const catVal = document.getElementById('upCategory').value.split('-');
            const category = structure[catVal[0]].children[catVal[1]];
            const desc = document.getElementById('upDesc').value;
            const tags = document.getElementById('upTags').value.split(',');

            document.getElementById('preTitle').innerText = title;
            document.getElementById('preType').innerText = category.name.toUpperCase();

            // Size
            let totalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
            document.getElementById('preSize').innerText = (totalSize / 1024 / 1024).toFixed(1) + ' MB';

            // Tags
            const tagContainer = document.getElementById('preTags');
            tagContainer.innerHTML = '';
            // Default tag
            const defTag = document.createElement('span'); defTag.className = 'tag-pill'; defTag.innerText = 'NEW';
            tagContainer.appendChild(defTag);

            tags.forEach(t => {
                if (t.trim()) {
                    const span = document.createElement('span');
                    span.className = 'tag-pill';
                    span.innerText = t.trim().toUpperCase();
                    tagContainer.appendChild(span);
                }
            });

            // Cover
            if (uploadedCover) {
                document.getElementById('preImg').src = uploadedCover;
            } else if (uploadedFiles.length === 0) {
                document.getElementById('preImg').src = 'https://placehold.co/600x400/000/00f3ff?text=NO+PREVIEW';
            }
        }

        function submitUpload() {
            if (uploadedFiles.length === 0) {
                alert(">> ACCESS DENIED: NO PAYLOAD DETECTED");
                return;
            }

            const customTitle = document.getElementById('upTitle').value || 'UNTITLED_ASSET';
            const catVal = document.getElementById('upCategory').value.split('-');
            const subIdx = document.getElementById('upSub').value;
            const userTags = document.getElementById('upTags').value.split(',').filter(t => t.trim() !== '');
            const userDesc = document.getElementById('upDesc').value;

            const category = structure[catVal[0]].children[catVal[1]];
            const sub = category.subs[subIdx];

            // Create blob URLs for all files
            const blobSources = uploadedFiles.map(file => URL.createObjectURL(file));

            // Determine primary type (from first file) - Enhanced detection
            let type = 'doc';
            const firstFile = uploadedFiles[0];
            const fileName = firstFile.name.toLowerCase();
            const fileType = firstFile.type.toLowerCase();

            // Model files (3D)
            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf') ||
                fileName.endsWith('.obj') || fileName.endsWith('.fbx') ||
                fileName.endsWith('.dae') || fileName.endsWith('.3ds') ||
                fileName.endsWith('.ply') || fileName.endsWith('.stl')) {
                type = 'model';
            }
            // Image files
            else if (fileType.startsWith('image/')) {
                type = uploadedFiles.length > 1 ? 'gallery' : 'image';
            }
            // Video files
            else if (fileType.startsWith('video/')) {
                type = 'video';
            }
            // Audio files
            else if (fileType.startsWith('audio/')) {
                type = 'audio';
            }
            // Document files
            else if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
                type = 'pdf';
            }
            else if (fileName.endsWith('.txt') || fileName.endsWith('.log') ||
                fileType.includes('text/plain')) {
                type = 'txt';
            }
            else if (fileName.endsWith('.doc') || fileName.endsWith('.docx') ||
                fileType.includes('msword') || fileType.includes('wordprocessingml')) {
                type = 'doc';
            }
            else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx') ||
                fileType.includes('spreadsheet')) {
                type = 'doc';
            }
            // Default to doc for unknown types
            else {
                type = 'doc';
            }

            // Calculate total size
            const totalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);

            // Generate appropriate thumbnail based on type
            let thumbnail = uploadedCover;
            if (!thumbnail) {
                if (type === 'image' || type === 'gallery') {
                    thumbnail = blobSources[0];
                } else if (type === 'model') {
                    // Use a placeholder for 3D models, or try to use cover if available
                    thumbnail = uploadedCover || `https://placehold.co/600x400/1a1a2e/00f3ff?text=3D+MODEL&font=monospace`;
                } else if (type === 'video') {
                    // Try to create a thumbnail from video (first frame)
                    thumbnail = `https://placehold.co/600x400/000/00f3ff?text=VIDEO&font=monospace`;
                } else if (type === 'audio') {
                    thumbnail = `https://placehold.co/600x400/101015/ff0055?text=AUDIO&font=monospace`;
                } else if (type === 'pdf') {
                    thumbnail = `https://placehold.co/600x400/1a1a1a/FFF?text=PDF+DOC`;
                } else if (type === 'txt') {
                    thumbnail = `https://placehold.co/600x400/000/00f3ff?text=TXT+LOG&font=monospace`;
                } else {
                    thumbnail = `https://placehold.co/600x400/000/00f3ff?text=${type.toUpperCase()}`;
                }
            }

            // Create ONE item with all sources
            const newItem = {
                title: customTitle,
                tag: userTags.length > 0 ? userTags[0].toUpperCase() : sub.tags[0],
                size: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
                ver: 'v.1.0',
                type: type,
                thumbnail: thumbnail,
                sources: blobSources,
                description: userDesc || undefined,
                duration: (type === 'audio') ? 0 : undefined,
                // Store original file names for proper type detection
                originalFileName: firstFile.name
            };

            // Add model-specific metadata if available
            if (type === 'model') {
                // These could be extracted from the model file if needed
                newItem.vertCount = 0; // Could be calculated from model
                newItem.polyCount = 0; // Could be calculated from model
            }

            // Store the uploaded item
            const storeKey = `${category.id}-${sub.id}`;
            if (!uploadedDataStore[storeKey]) {
                uploadedDataStore[storeKey] = [];
            }
            uploadedDataStore[storeKey].unshift(newItem);

            // Navigate to the target category if not already there
            const isCurrentCategory = currentSub && currentSub.id === sub.id && currentParent && currentParent.id === category.id;

            if (!isCurrentCategory) {
                // Navigate to the target category
                loadSubCategory(category, sub);
            } else {
                // Already in the target category, just refresh the grid
                currentAssets = generateData(category, sub);
                renderGrid(currentAssets);
            }

            closeUploadPanel();

            // Scroll to top of grid to show the newly uploaded item
            setTimeout(() => {
                const grid = document.getElementById('grid');
                if (grid && grid.firstChild) {
                    grid.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Add a highlight effect to the first card (newly uploaded)
                    grid.firstChild.style.outline = '2px solid var(--accent)';
                    grid.firstChild.style.outlineOffset = '4px';
                    setTimeout(() => {
                        if (grid.firstChild) {
                            grid.firstChild.style.outline = '';
                            grid.firstChild.style.outlineOffset = '';
                        }
                    }, 2000);
                }
            }, 100);

            alert(`>> UPLOAD COMPLETE: ${uploadedFiles.length} FILE(S) -> 1 ASSET CREATED`);
        }

        // --- COSMIC PARTICLES ---
        let particles = [];
        let particleCtx;
        let particleAnimFrame;

        function initParticles() {
            const canvas = document.getElementById('particleCanvas');
            particleCtx = canvas.getContext('2d');
            resizeParticles();
            window.addEventListener('resize', resizeParticles);
            for (let i = 0; i < 150; i++) particles.push(createParticle());
            animateParticles();
        }

        function createParticle() {
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                opacity: Math.random(),
                pulse: Math.random() * 0.02
            };
        }

        function resizeParticles() {
            const canvas = document.getElementById('particleCanvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function animateParticles() {
            if (!document.getElementById('particleCanvas').classList.contains('active')) {
                particleAnimFrame = requestAnimationFrame(animateParticles);
                return;
            }
            particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            particleCtx.fillStyle = '#fff';
            particles.forEach(p => {
                p.x += p.speedX; p.y += p.speedY; p.opacity += p.pulse;
                if (p.opacity <= 0 || p.opacity >= 1) p.pulse *= -1;
                if (p.x < 0) p.x = window.innerWidth; if (p.x > window.innerWidth) p.x = 0;
                if (p.y < 0) p.y = window.innerHeight; if (p.y > window.innerHeight) p.y = 0;
                particleCtx.globalAlpha = p.opacity;
                particleCtx.beginPath(); particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); particleCtx.fill();
            });
            particleAnimFrame = requestAnimationFrame(animateParticles);
        }

        function toggleParticles() {
            const active = document.getElementById('setParticles').checked;
            const canvas = document.getElementById('particleCanvas');
            if (active) canvas.classList.add('active'); else canvas.classList.remove('active');
        }

        // --- NEURAL NETWORK GRAPH LOGIC v3.0 ---
        let simulation;
        let isNeuralMode = false;
        let allNodes = [], allLinks = [];

        function toggleNeuralMode() {
            isNeuralMode = !isNeuralMode;
            const dash = document.getElementById('dashboard');
            const floor = document.getElementById('floor');
            const graph = document.getElementById('graphView');
            const particles = document.getElementById('particleCanvas');

            if (isNeuralMode) {
                dash.classList.add('hidden');
                floor.style.opacity = '0.3';
                graph.classList.add('active');
                if (document.getElementById('setParticles').checked) particles.classList.add('active');
                initGraphData();
                renderGraph();
            } else {
                dash.classList.remove('hidden');
                floor.style.opacity = '1';
                graph.classList.remove('active');
                particles.classList.remove('active');
                if (simulation) simulation.stop();
                d3.select("#graphView svg").remove();
            }
        }

        function initGraphData() {
            allNodes = [{ id: "CORE", group: "root", radius: 15, color: "#fff", img: `https://picsum.photos/seed/CORE/200/200` }];
            allLinks = [];

            structure.forEach(group => {
                group.children.forEach(cat => {
                    allNodes.push({
                        id: cat.name, group: "category", radius: 10, color: cat.color,
                        img: `https://picsum.photos/seed/${cat.name}/200/200`
                    });
                    allLinks.push({ source: "CORE", target: cat.name });

                    cat.subs.forEach(sub => {
                        const subId = sub.name;
                        allNodes.push({
                            id: subId, group: "sub", radius: 6, color: cat.color,
                            img: `https://picsum.photos/seed/${subId}/200/200`
                        });
                        allLinks.push({ source: cat.name, target: subId });

                        sub.tags.forEach(tag => {
                            const tagId = tag;
                            if (!allNodes.find(n => n.id === tagId)) {
                                allNodes.push({
                                    id: tagId,
                                    group: "tag",
                                    radius: 4,
                                    color: cat.color,
                                    parentCat: cat.name,
                                    parentSub: subId,
                                    img: `https://picsum.photos/seed/${tagId}/200/200`
                                });
                            }
                            allLinks.push({ source: subId, target: tagId });
                            allLinks.push({ source: cat.name, target: tagId });

                            for (let k = 0; k < 2; k++) {
                                const itemId = `${tag}_ITEM_${k}`;
                                const itemImg = `https://picsum.photos/seed/${tag}${k}/800/600`;

                                const itemData = {
                                    title: itemId,
                                    size: (Math.random() * 100).toFixed(1) + 'MB',
                                    ver: '1.0',
                                    type: 'image',
                                    sources: [itemImg]
                                };

                                allNodes.push({
                                    id: itemId,
                                    group: "item",
                                    radius: 2,
                                    color: cat.color,
                                    parentCat: cat.name,
                                    parentSub: subId,
                                    img: itemImg,
                                    data: itemData,
                                    parentId: tagId
                                });
                                allLinks.push({ source: tagId, target: itemId });
                                allLinks.push({ source: subId, target: itemId });
                            }
                        });
                    });
                });
            });
        }

        function updateGraphSettings() {
            renderGraph();
        }

        function updateGraphBg() {
            const color = document.getElementById('setBgColor').value;
            const graphContainer = document.getElementById('graphView');
            graphContainer.style.background = `radial-gradient(circle at center, ${color} 0%, #000 90%)`;
        }

        function renderGraph() {
            const size = document.getElementById('setImgSize').value;
            const density = document.getElementById('setDensity').value;
            const showImages = document.getElementById('setShowImages').checked;

            const activeFilters = [];
            document.querySelectorAll('#filterChecks input:checked').forEach(cb => activeFilters.push(cb.value));

            let filteredNodes = allNodes.filter(n => {
                if (n.group === 'root') return true;
                if (n.group === 'category') return activeFilters.includes(n.id);
                if (n.group === 'tag') return activeFilters.includes(n.parentCat);
                return activeFilters.includes(n.parentCat);
            });

            if (density < 100) {
                filteredNodes = filteredNodes.filter(n => {
                    if (n.group !== 'item') return true;
                    return (Math.random() * 100) < density;
                });
            }

            const nodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredLinks = allLinks.filter(l => {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                return nodeIds.has(s) && nodeIds.has(t);
            });

            d3.select("#graphView svg").remove();
            const width = window.innerWidth;
            const height = window.innerHeight;

            const svg = d3.select("#graphView").append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", showImages ? "show-images" : "")
                .call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => {
                    g.attr("transform", event.transform);
                }));

            const g = svg.append("g");

            simulation = d3.forceSimulation(filteredNodes)
                .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(d => d.group === 'item' ? 30 : 100))
                .force("charge", d3.forceManyBody().strength(d => d.group === 'item' ? -50 : -400))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collide", d3.forceCollide(d => d.group === 'item' ? 5 : parseInt(size) / 2 + 10));

            const link = g.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(filteredLinks)
                .enter().append("line")
                .attr("class", "link");

            const node = g.append("g")
                .attr("class", "nodes")
                .selectAll("g")
                .data(filteredNodes)
                .enter().append("g")
                .attr("class", "node-group")
                .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

            node.append("circle")
                .attr("class", "node-circle")
                .attr("r", d => d.radius)
                .attr("fill", d => d.color);

            node.filter(d => d.img).append("image")
                .attr("class", "node-preview-img")
                .attr("href", d => d.img)
                .attr("x", -size / 2)
                .attr("y", -size / 2 - size * 0.8)
                .attr("width", size)
                .attr("height", size)
                .style("cursor", "pointer")
                .on("click", (e, d) => {
                    e.stopPropagation();
                    if (d.group === 'item') {
                        openModal(d.data);
                    } else if (d.group === 'tag') {
                        const childItems = filteredNodes.filter(n => n.parentId === d.id && n.group === 'item');
                        if (childItems.length > 0) {
                            const galleryData = {
                                title: `TAG: ${d.id}`,
                                size: 'VAR',
                                ver: '1.0',
                                type: 'gallery',
                                sources: childItems.map(c => c.data.sources[0])
                            };
                            openModal(galleryData);
                        }
                    }
                });

            node.append("text")
                .attr("class", "node-text")
                .attr("dx", 15)
                .attr("dy", 4)
                .text(d => d.group === 'item' ? '' : d.id);

            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });

            const linkedByIndex = {};
            filteredLinks.forEach(d => {
                linkedByIndex[`${d.source.id},${d.target.id}`] = 1;
            });

            function isConnected(a, b) {
                return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
            }

            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
                node.classed("dimmed", true); link.classed("dimmed", true);
                node.classed("highlighted", o => isConnected(d, o));
                link.classed("highlighted", o => o.source.id === d.id || o.target.id === d.id);
            }

            function dragged(event, d) { d.fx = event.x; d.fy = event.y; }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
                node.classed("dimmed", false).classed("highlighted", false);
                link.classed("dimmed", false).classed("highlighted", false);
            }
        }

        async function bootstrap() {
            try {
                await loadTaxonomy();
                bindHeaderActions();
                bindUploadPanel();
                bindEditorPanel();
                bindModalControls();
                bindGraphExit();
                init();
            } catch (err) {
                console.error('[HiZoo] bootstrap error, fallback to default layout', err);
                // 尝试最小化渲染以保证界面可见
                structure = defaultStructure;
                try {
                    renderSidebar();
                    if (structure[0]?.children?.[0]?.subs?.[0]) {
                        loadSubCategory(structure[0].children[0], structure[0].children[0].subs[0]);
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
