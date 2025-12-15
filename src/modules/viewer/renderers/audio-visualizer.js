// 音频可视化器渲染器

import { formatTime } from '../../../utils/format.js';

let audioContext, audioAnalyser, audioSource, audioAnimationId;

export function renderAudio(container, item) {
    container.innerHTML = '';
    container.classList.add('audio-player-container');

    // Layout Setup
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

    // Controls Container
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

    // Audio Logic
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

    // Metadata Update
    audio.onloadedmetadata = () => {
        const durVal = document.getElementById('modalSize');
        const fmtVal = document.getElementById('modalVer');

        if (durVal) {
            durVal.parentElement.children[0].innerText = "DURATION";
            durVal.innerText = formatTime(audio.duration);
            durVal.style.color = "var(--accent)";
            durVal.style.textShadow = "0 0 5px var(--accent)";
        }
        if (fmtVal) {
            fmtVal.parentElement.children[0].innerText = "TYPE";
            const ext = item.sources[0].split('.').pop().split('?')[0].toUpperCase();
            fmtVal.innerText = ext + " AUDIO";
        }

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
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        audio.currentTime = p * audio.duration;
    });

    // Toggle Play
    playBtn.addEventListener('click', () => {
        if (audio.paused) {
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
    });

    // Visualizer
    function initAudioContext() {
        if (audioContext) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 512;
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        drawVisualizer();
    }

    function drawVisualizer() {
        if (!audioAnalyser) return;
        audioAnimationId = requestAnimationFrame(drawVisualizer);

        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        const bufferLength = audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioAnalyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#020205';
        ctx.fillRect(0, 0, w, h);

        // Grid Background
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = -10; i <= 10; i++) {
            ctx.moveTo(cx + i * 100, h);
            ctx.lineTo(cx + i * 20, cy);
        }
        for (let i = 0; i < 10; i++) {
            const y = cy + i * (h / 2 / 10) * i * 0.2;
            ctx.moveTo(0, y + 20);
            ctx.lineTo(w, y + 20);
        }
        ctx.stroke();
        ctx.restore();

        // Center HUD Core
        const radius = 60;
        const pulse = (dataArray[10] / 255) * 20;
        const r = radius + pulse;

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

        ctx.rotate(0);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;

        const cur = formatTime(audio.currentTime);
        ctx.fillText(cur, 0, 0);

        if (audio.paused) {
            ctx.fillStyle = '#555';
        } else {
            ctx.fillStyle = (Date.now() % 1000 < 500) ? '#ff0055' : '#550022';
        }
        ctx.beginPath();
        ctx.arc(0, 40, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Symmetrical Bars
        const barWidth = 6;
        const gap = 4;
        const maxBarHeight = h * 0.5;
        const bars = 40;

        for (let i = 0; i < bars; i++) {
            const val = dataArray[i * 2];
            const p = val / 255;
            const barH = p * maxBarHeight;
            const xOffset = radius + 30 + (i * (barWidth + gap));

            const grad = ctx.createLinearGradient(0, cy - barH, 0, cy + barH);
            grad.addColorStop(0, 'rgba(0, 243, 255, 0)');
            grad.addColorStop(0.5, `rgba(0, 243, 255, ${p + 0.2})`);
            grad.addColorStop(1, 'rgba(0, 243, 255, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(cx + xOffset, cy - barH / 2, barWidth, barH);
            ctx.fillRect(cx - xOffset - barWidth, cy - barH / 2, barWidth, barH);

            if (p > 0.1) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx + xOffset, cy - barH / 2 - 2, barWidth, 2);
                ctx.fillRect(cx + xOffset, cy + barH / 2, barWidth, 2);
                ctx.fillRect(cx - xOffset - barWidth, cy - barH / 2 - 2, barWidth, 2);
                ctx.fillRect(cx - xOffset - barWidth, cy + barH / 2, barWidth, 2);
            }
        }

        // High Frequency Line
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

        ctx.font = '10px "Arial"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText("5D STEREO 360° SURROUND", cx, cy + r + 30);
    }

    // Cleanup function
    container._cleanupAudio = () => {
        if (audioAnimationId) {
            cancelAnimationFrame(audioAnimationId);
            audioAnimationId = null;
        }
        if (audio) {
            audio.pause();
            audio.src = '';
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        audioAnalyser = null;
        audioSource = null;
    };
}

export function cleanupAudio(container) {
    if (container._cleanupAudio) {
        container._cleanupAudio();
        container._cleanupAudio = null;
    }
}


