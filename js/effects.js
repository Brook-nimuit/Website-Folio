// ==========================================
// MODULE: EFFECTS (SPOTLIGHT, MATRIX, DANCER)
// ==========================================

// 1. Mouse Spotlight Tracker
const spotlight = document.getElementById('spotlight');
window.addEventListener('mousemove', (e) => {
  if (spotlight) {
    spotlight.style.setProperty('--mouse-x', `${e.clientX}px`);
    spotlight.style.setProperty('--mouse-y', `${e.clientY}px`);
  }
});

// 2. Matrix Particle Canvas
const CONFIG = {
  imageUrl: 'assets/img/Your-Headshot.webp',
  gap: 5,               // Slightly tighter grid for sharper facial details
  particleSize: 1.8,    // Crisp dots instead of big overlapping circles
  minAlpha: 0.32,       // HIGHER: Drops out background wall/shadow pixels entirely
  darken: 0.95,         // HIGHER: Keeps face highlights bright and recognizable
  drift: 1.2,           // Less jitter so features stay recognizable
  speed: 0.0006,
  repelRadius: 75,
  repelForce: 0.4,
  glitch: 0.3,          // Less glitch tearing across the face
  displayWidth: 420,
  background: '#0b0b10'
};

const portraitCanvas = document.getElementById('portrait');
const portraitWrap = document.querySelector('.matrix-photo-wrap');

if (portraitCanvas && portraitWrap) {
  const ctx = portraitCanvas.getContext('2d', { willReadFrequently: true });
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let glitchBands = [];

  function buildFromImage(img) {
    const scale = Math.max(1, CONFIG.displayWidth / img.width);
    const W = Math.round(img.width * scale);
    const H = Math.round(img.height * scale);
    const dpr = window.devicePixelRatio || 1;

    portraitCanvas.width = W * dpr;
    portraitCanvas.height = H * dpr;
    portraitCanvas.style.width = W + 'px';
    portraitCanvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, W, H);
    const data = octx.getImageData(0, 0, W, H).data;

    particles = [];
    for (let y = 0; y < H; y += CONFIG.gap) {
      for (let x = 0; x < W; x += CONFIG.gap) {
        const i = (y * W + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum < CONFIG.minAlpha) continue;

        particles.push({
          ox: x,
          oy: y,
          color: `rgba(${(r * CONFIG.darken) | 0},${(g * CONFIG.darken) | 0},${(b * CONFIG.darken) | 0},1)`,
          phase: Math.random() * Math.PI * 2,
          freq: 0.5 + Math.random(),
          vx: 0,
          vy: 0
        });
      }
    }
    requestAnimationFrame(tick);
  }

  function tick(now) {
    const W = portraitCanvas.width / (window.devicePixelRatio || 1);
    const H = portraitCanvas.height / (window.devicePixelRatio || 1);

    if (Math.random() < CONFIG.glitch * 0.06) {
      const bandH = 4 + Math.random() * 18;
      glitchBands.push({
        y: Math.random() * H,
        h: bandH,
        shift: (Math.random() - 0.5) * 60 * CONFIG.glitch,
        life: 1
      });
    }
    glitchBands.forEach(b => (b.life -= 0.03));
    glitchBands = glitchBands.filter(b => b.life > 0);

    ctx.fillStyle = CONFIG.background;
    ctx.fillRect(0, 0, W, H);

    const t = now * CONFIG.speed;

    for (const p of particles) {
      let x = p.ox + Math.sin(t * p.freq + p.phase) * CONFIG.drift;
      let y = p.oy + Math.cos(t * p.freq * 0.9 + p.phase * 1.7) * CONFIG.drift;

      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < CONFIG.repelRadius * CONFIG.repelRadius) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / CONFIG.repelRadius) * CONFIG.repelForce;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      p.vx *= 0.9;
      p.vy *= 0.9;
      x += p.vx;
      y += p.vy;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, CONFIG.particleSize, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of glitchBands) {
      const slice = ctx.getImageData(0, Math.max(0, b.y | 0), portraitCanvas.width, b.h);
      ctx.putImageData(slice, b.shift, Math.max(0, b.y | 0));
      ctx.fillStyle = `rgba(255,255,255,${0.05 * b.life})`;
      ctx.fillRect(0, b.y, W, b.h);
    }

    requestAnimationFrame(tick);
  }

  portraitCanvas.addEventListener('pointermove', (event) => {
    const rect = portraitCanvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });

  portraitCanvas.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => buildFromImage(img);
  img.src = CONFIG.imageUrl;
}

// 3. Dancer Speed Controller
let clickCount = 0;
const maxClicks = 6;
const playbackSpeeds = [1.0, 1.3, 1.7, 2.2, 2.8, 3.5];

window.speedUpDancer = function() {
  const video = document.getElementById('dancerVideo');
  const banner = document.getElementById('statusBanner');
  const overlay = document.getElementById('errorOverlay');

  if (clickCount < maxClicks) {
    clickCount++;
    if (clickCount < maxClicks) {
      video.playbackRate = playbackSpeeds[clickCount];
      banner.innerHTML = `/ SPEED: ${playbackSpeeds[clickCount]}X // CLICK AGAIN`;
      banner.className = "mb-3 px-3 py-1 bg-purple-900/90 border border-purple-400 rounded text-[11px] font-mono text-purple-200 tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.6)]";
      video.style.transform = `scale(${1 + clickCount * 0.03})`;
    } else {
      video.playbackRate = 0;
      video.style.filter = "grayscale(100%) brightness(50%) contrast(200%)";
      banner.innerHTML = `<span class="text-red-400 font-bold animate-pulse">ERR:) CORE_OVERFLOW // SYSTEM_CRASH</span>`;
      banner.className = "mb-3 px-3 py-1 bg-red-950 border border-red-500/80 rounded text-[11px] font-mono text-red-400 tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.5)]";
      overlay.classList.remove('hidden');
      setTimeout(() => { resetDancer(); }, 3500);
    }
  }
};

function resetDancer() {
  const video = document.getElementById('dancerVideo');
  const banner = document.getElementById('statusBanner');
  const overlay = document.getElementById('errorOverlay');

  clickCount = 0;
  video.playbackRate = 1.0;
  video.style.filter = "none";
  video.style.transform = "scale(1)";
  overlay.classList.add('hidden');
  banner.innerHTML = "/ CLICK ME: DANCE FASTER";
  banner.className = "mb-3 px-3 py-1 bg-purple-950/80 border border-purple-500/30 rounded text-[11px] font-mono text-purple-300 tracking-wider transition-all duration-200 group-hover:border-purple-400 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.4)]";
}