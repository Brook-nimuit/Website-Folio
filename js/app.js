// ==========================================
// MODULE: APPLICATION CORE & LIFECYCLE
// ==========================================

const loader = document.getElementById('loader-overlay');
const appShell = document.querySelector('.bg-grid-pattern');
let loaderTimeout = null;

function showLoader(visibleFor = window.APP_CONFIG.loaderDurationMs) {
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
  }, window.APP_CONFIG.loaderDurationMs);
};

window.switchExpSubTab = function(tabName) {
  document.getElementById('sub-internships').classList.add('hidden');
  document.getElementById('sub-lastSeen').classList.add('hidden');
  document.getElementById('btn-internships').className = 'pb-2 text-xs font-mono border-b-2 border-transparent text-synth-lavender/60 hover:text-white';
  document.getElementById('btn-lastSeen').className = 'pb-2 text-xs font-mono border-b-2 border-transparent text-synth-lavender/60 hover:text-white';

  document.getElementById(`sub-${tabName}`).classList.remove('hidden');
  document.getElementById(`btn-${tabName}`).className = 'pb-2 text-xs font-mono border-b-2 border-synth-neonMagenta text-white';
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

// 3. Project Carousels & Lightbox
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
  button.addEventListener('click', () => {
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
  button.addEventListener('click', () => {
    const step = Number(button.dataset.cafeStep || 1);
    renderCafeSlide(cafeIndex + step);
  });
});

const projectLightbox = document.getElementById('project-lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');

function openProjectLightbox(src, alt) {
  if (!projectLightbox || !lightboxImage) return;
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  projectLightbox.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeProjectLightbox() {
  if (!projectLightbox || !lightboxImage) return;
  projectLightbox.classList.remove('visible');
  lightboxImage.src = '';
  document.body.style.overflow = '';
}

[rubiksImage, cafeImage].forEach((img) => {
  if (!img) return;
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => openProjectLightbox(img.src, img.alt));
});

if (projectLightbox) {
  projectLightbox.addEventListener('click', (event) => {
    if (event.target === projectLightbox || event.target === lightboxClose) closeProjectLightbox();
  });
}

if (lightboxClose) lightboxClose.addEventListener('click', closeProjectLightbox);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && projectLightbox?.classList.contains('visible')) {
    closeProjectLightbox();
  }
});

// 4. Lifecycle Initializer
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[Lucide] Icon init warning:', e);
    }
  }
});

// Always guarantee the loader hides even if network or canvas lags
window.addEventListener('load', () => {
  if (loader) {
    showLoader(loaderVisibleMs);
    setTimeout(() => {
      if (appShell) appShell.style.opacity = '1';
    }, 120);
  }
});

// Failsafe fallback: Force hide loader after 1.5s no matter what
setTimeout(() => {
  if (loader && loader.style.opacity !== '0') {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    if (appShell) appShell.style.opacity = '1';
  }
}, 1500);

window.addEventListener('load', () => {
  if (loader) {
    showLoader();
    setTimeout(() => {
      if (appShell) appShell.style.opacity = '1';
    }, 120);
  }
});