// ==========================================
// MODULE: APPLICATION CORE & LIFECYCLE
// ==========================================

const loader = document.getElementById('loader-overlay');
const appShell = document.querySelector('.bg-grid-pattern');
let loaderTimeout = null;

function showLoader(visibleFor = window.APP_CONFIG?.loaderDurationMs || 300) {
  if (!loader) return;
  clearTimeout(loaderTimeout);
  loader.style.opacity = '1';
  loader.style.pointerEvents = 'auto';

  loaderTimeout = setTimeout(() => {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
  }, visibleFor);
}

// 1. Tab Router & Viewport Reset
window.switchTab = function(tabId) {
  showLoader();

  // Dismiss emote immediately on tab switch
  const emoteEl = document.getElementById('billyBounceEmote');
  if (emoteEl) {
    emoteEl.classList.add('hidden');
    emoteEl.classList.remove('flex');
  }

  const duration = window.APP_CONFIG?.loaderDurationMs || 300;

  setTimeout(() => {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden');

    document.querySelectorAll('.hud-tab').forEach(btn => {
      btn.classList.remove('bg-synth-purple/40', 'text-white', 'shadow-[0_0_10px_rgba(157,78,221,0.4)]');
      btn.classList.add('bg-synth-panel/80', 'text-synth-lavender/70');
    });

    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) {
      activeBtn.classList.add('bg-synth-purple/40', 'text-white', 'shadow-[0_0_10px_rgba(157,78,221,0.4)]');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, duration);
};

window.switchExpSubTab = function(tabName) {
  document.getElementById('sub-internships')?.classList.add('hidden');
  document.getElementById('sub-lastSeen')?.classList.add('hidden');
  
  const btnInternships = document.getElementById('btn-internships');
  const btnLastSeen = document.getElementById('btn-lastSeen');
  if (btnInternships) btnInternships.className = 'pb-2 text-xs font-mono border-b-2 border-transparent text-synth-lavender/60 hover:text-white';
  if (btnLastSeen) btnLastSeen.className = 'pb-2 text-xs font-mono border-b-2 border-transparent text-synth-lavender/60 hover:text-white';

  document.getElementById(`sub-${tabName}`)?.classList.remove('hidden');
  const activeBtn = document.getElementById(`btn-${tabName}`);
  if (activeBtn) activeBtn.className = 'pb-2 text-xs font-mono border-b-2 border-synth-neonMagenta text-white';
};

// 2. Performant Footer Observer (About Me Only)
document.addEventListener('DOMContentLoaded', () => {
  const emoteEl = document.getElementById('billyBounceEmote');
  const footer = document.querySelector('footer');

  if (emoteEl && footer) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const aboutTab = document.getElementById('view-about');
        const isAboutActive = aboutTab && !aboutTab.classList.contains('hidden');

        if (entry.isIntersecting && isAboutActive) {
          emoteEl.classList.remove('hidden');
          emoteEl.classList.add('flex');
        } else {
          emoteEl.classList.add('hidden');
          emoteEl.classList.remove('flex');
        }
      });
    }, { threshold: 0.1 });

    observer.observe(footer);
  }
});

// ==========================================
// 3. PROJECT CAROUSELS & FULLSCREEN LIGHTBOX
// ==========================================

const rubiksSlides = [
  'assets/img/RBpic5.webp',
  'assets/img/RBpic1.webp',
  'assets/img/RBpic2.webp',
  'assets/img/RBpic3.webp',
  'assets/img/RBpic4.webp',
  'assets/img/RBpic6.webp'
];
const rubiksImage = document.getElementById('rubiks-preview-image');
let rubiksIndex = 0;

function renderRubiksSlide(nextIndex) {
  if (!rubiksImage) return;
  rubiksIndex = (nextIndex + rubiksSlides.length) % rubiksSlides.length;
  rubiksImage.src = rubiksSlides[rubiksIndex];
}

document.querySelectorAll('.rubiks-nav').forEach((button) => {
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const step = Number(button.dataset.rubiksStep || 1);
    renderRubiksSlide(rubiksIndex + step);
  });
});

const cafeSlides = [
  'assets/img/cafe1.webp',
  'assets/img/cafe2.webp',
  'assets/img/cafe3.webp'
];
const cafeImage = document.getElementById('cafe-preview-image');
let cafeIndex = 0;

function renderCafeSlide(nextIndex) {
  if (!cafeImage) return;
  cafeIndex = (nextIndex + cafeSlides.length) % cafeSlides.length;
  cafeImage.src = cafeSlides[cafeIndex];
}

document.querySelectorAll('.cafe-nav').forEach((button) => {
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const step = Number(button.dataset.cafeStep || 1);
    renderCafeSlide(cafeIndex + step);
  });
});

// --- LIGHTBOX ENGINE (FULLSCREEN SCROLL & ARROWS) ---
let currentLightboxGallery = [];
let currentLightboxIndex = 0;

function openLightbox(gallery, index = 0) {
  const lightbox = document.getElementById('project-lightbox');
  const img = document.getElementById('lightbox-image');
  if (!lightbox || !img || !gallery.length) return;

  currentLightboxGallery = gallery;
  currentLightboxIndex = (index + gallery.length) % gallery.length;

  img.src = currentLightboxGallery[currentLightboxIndex];
  lightbox.classList.add('visible');
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('project-lightbox');
  const img = document.getElementById('lightbox-image');
  if (!lightbox) return;

  lightbox.classList.remove('visible');
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  if (img) img.src = '';
  document.body.style.overflow = '';
}

function changeLightboxImage(step) {
  if (!currentLightboxGallery.length) return;
  currentLightboxIndex = (currentLightboxIndex + step + currentLightboxGallery.length) % currentLightboxGallery.length;
  const img = document.getElementById('lightbox-image');
  if (img) img.src = currentLightboxGallery[currentLightboxIndex];
}

// Click preview images to open their fullscreen gallery
if (cafeImage) {
  cafeImage.style.cursor = 'zoom-in';
  cafeImage.addEventListener('click', () => openLightbox(cafeSlides, cafeIndex));
}

if (rubiksImage) {
  rubiksImage.style.cursor = 'zoom-in';
  rubiksImage.addEventListener('click', () => openLightbox(rubiksSlides, rubiksIndex));
}

// Nav Buttons inside Fullscreen Lightbox
document.getElementById('lightbox-prev')?.addEventListener('click', (e) => {
  e.stopPropagation();
  changeLightboxImage(-1);
});

document.getElementById('lightbox-next')?.addEventListener('click', (e) => {
  e.stopPropagation();
  changeLightboxImage(1);
});

document.getElementById('lightbox-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});

// Click background backdrop to close
document.getElementById('project-lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'project-lightbox') {
    closeLightbox();
  }
});

// Keyboard controls (Arrow keys & Escape)
window.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('project-lightbox');
  if (!lightbox || (!lightbox.classList.contains('active') && !lightbox.classList.contains('visible'))) return;

  if (e.key === 'ArrowRight') changeLightboxImage(1);
  if (e.key === 'ArrowLeft') changeLightboxImage(-1);
  if (e.key === 'Escape') closeLightbox();
});

// Mouse wheel scroll to cycle images in fullscreen
document.getElementById('project-lightbox')?.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.deltaY > 0) changeLightboxImage(1);
  else if (e.deltaY < 0) changeLightboxImage(-1);
}, { passive: false });

// ==========================================
// 4. LIFECYCLE & FAILSAFE GUARDS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[Lucide] Icon init warning:', e);
    }
  }
});

window.addEventListener('load', () => {
  if (loader) {
    showLoader();
    setTimeout(() => {
      if (appShell) appShell.style.opacity = '1';
    }, 120);
  }
});

// Failsafe: force dismiss loader after 1.5s
setTimeout(() => {
  if (loader && loader.style.opacity !== '0') {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    if (appShell) appShell.style.opacity = '1';
  }
}, 1500);