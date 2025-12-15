// 神经网络图核心：D3 图谱功能

import { uiStore } from '../../store/ui.store.js';

let allNodes = [];
let allLinks = [];
let simulation = null;

export function toggleNeuralMode(structure) {
    const isNeuralMode = uiStore.getNeuralMode();
    uiStore.setNeuralMode(!isNeuralMode);
    
    const dash = document.getElementById('dashboard');
    const floor = document.getElementById('floor');
    const graph = document.getElementById('graphView');
    const particles = document.getElementById('particleCanvas');

    if (!isNeuralMode) {
        dash.classList.add('hidden');
        if (floor) floor.style.opacity = '0.3';
        graph.classList.add('active');
        const particlesCheck = document.getElementById('setParticles');
        if (particlesCheck && particlesCheck.checked) {
            if (particles) particles.classList.add('active');
        }
        if (structure) {
            initGraphData(structure);
            renderGraph();
        }
    } else {
        dash.classList.remove('hidden');
        if (floor) floor.style.opacity = '1';
        graph.classList.remove('active');
        if (particles) particles.classList.remove('active');
        if (simulation) simulation.stop();
        d3.select("#graphView svg").remove();
    }
}

export function initGraphData(structure) {
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

export function renderGraph() {
    const size = document.getElementById('setImageSize')?.value || 48;
    const density = document.getElementById('setDensity')?.value || 1;
    const showImages = document.getElementById('setShowImages')?.checked !== false;

    const activeFilters = [];
    document.querySelectorAll('#filterChecks input:checked').forEach(cb => activeFilters.push(cb.value));

    let filteredNodes = allNodes.filter(n => {
        if (n.group === 'root') return true;
        if (n.group === 'category') return activeFilters.length === 0 || activeFilters.includes(n.id);
        if (n.group === 'tag') return activeFilters.length === 0 || activeFilters.includes(n.parentCat);
        return activeFilters.length === 0 || activeFilters.includes(n.parentCat);
    });

    if (density < 1) {
        filteredNodes = filteredNodes.filter(n => {
            if (n.group !== 'item') return true;
            return (Math.random() * 100) < (density * 100);
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
            if (d.group === 'item' && d.data && window.openModal) {
                window.openModal(d.data);
            } else if (d.group === 'tag') {
                const childItems = filteredNodes.filter(n => n.parentId === d.id && n.group === 'item');
                if (childItems.length > 0 && window.openModal) {
                    const galleryData = {
                        title: `TAG: ${d.id}`,
                        size: 'VAR',
                        ver: '1.0',
                        type: 'gallery',
                        sources: childItems.map(c => c.data.sources[0])
                    };
                    window.openModal(galleryData);
                }
            }
        });

    // 创建链接索引（完全还原 bf.html 中的原始实现）
    const linkedByIndex = {};
    filteredLinks.forEach(d => {
        linkedByIndex[`${d.source.id},${d.target.id}`] = 1;
    });

    // 判断两个节点是否连接（完全还原 bf.html 中的原始实现）
    function isConnected(a, b) {
        return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
    }

    // 添加鼠标悬停高亮效果（使用与 bf.html 中 dragstarted 完全相同的逻辑）
    node.on("mouseover", function(event, d) {
        // 完全还原 bf.html 中的逻辑
        node.classed("dimmed", true);
        link.classed("dimmed", true);
        node.classed("highlighted", o => isConnected(d, o));
        link.classed("highlighted", o => o.source.id === d.id || o.target.id === d.id);
    })
    .on("mouseout", function(event, d) {
        // 完全还原 bf.html 中的逻辑
        node.classed("dimmed", false).classed("highlighted", false);
        link.classed("dimmed", false).classed("highlighted", false);
    });

    node.append("text")
        .attr("class", "node-text")
        .attr("dy", d => d.radius + 5)
        .attr("text-anchor", "middle")
        .text(d => d.id)
        .style("font-size", "10px")
        .style("fill", "#fff")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

export function updateGraphSettings() {
    renderGraph();
}

export function updateGraphBg() {
    const color = document.getElementById('setBgColor')?.value || '#1a1a2e';
    const graphContainer = document.getElementById('graphView');
    if (graphContainer) {
        graphContainer.style.background = `radial-gradient(circle at center, ${color} 0%, #000 90%)`;
    }
}

export function initGraphFilters(structure) {
    const container = document.getElementById('filterChecks');
    if (!container) return;
    
    container.innerHTML = '';
    
    structure.forEach(group => {
        group.children.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'filter-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = cat.name;
            checkbox.checked = true;
            checkbox.addEventListener('change', updateGraphSettings);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(cat.name));
            container.appendChild(label);
        });
    });
}

let particles = [];
let particleAnimationId = null;

export function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        });
    }
    
    animateParticles();
}

function animateParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.fill();
    });
    
    particleAnimationId = requestAnimationFrame(animateParticles);
}

export function toggleParticles() {
    const particlesEl = document.getElementById('particleCanvas');
    const checkbox = document.getElementById('setParticles');
    
    if (!particlesEl || !checkbox) return;
    
    if (checkbox.checked) {
        particlesEl.classList.add('active');
        if (particles.length === 0) {
            initParticles();
        }
    } else {
        particlesEl.classList.remove('active');
        if (particleAnimationId) {
            cancelAnimationFrame(particleAnimationId);
            particleAnimationId = null;
        }
        const ctx = particlesEl.getContext('2d');
        ctx.clearRect(0, 0, particlesEl.width, particlesEl.height);
    }
}

