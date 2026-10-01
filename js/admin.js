// =============================================================================
// ADMIN CONSOLE: MULTI-TAB PORTFOLIO MANAGEMENT + DELETE / UNDO SYSTEM
// =============================================================================

const ADMIN_STORAGE_KEY = 'banimut_admin_content';
const ADMIN_UNDO_KEY = 'banimut_admin_undo';
const CLOUD_CONTENT_COLLECTION = 'site_content';
const CLOUD_CONTENT_DOCUMENT = 'portfolio';

function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPortfolioData() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY)) || {
      projects: [],
      experiences: [],
      leadership: []
    };
  } catch {
    return { projects: [], experiences: [], leadership: [] };
  }
}

function savePortfolioData(data, preserveUndo = false) {
  if (!preserveUndo) localStorage.removeItem(ADMIN_UNDO_KEY);
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
  renderDynamicContent();
  renderAdminManageList();
}

async function fetchCloudContent() {
  try {
    const db = await initFirebaseStore();
    const snapshot = await db.collection(CLOUD_CONTENT_COLLECTION).doc(CLOUD_CONTENT_DOCUMENT).get();
    if (!snapshot.exists) return;

    const cloudData = snapshot.data() || {};
    const data = {
      projects: Array.isArray(cloudData.projects) ? cloudData.projects : [],
      experiences: Array.isArray(cloudData.experiences) ? cloudData.experiences : [],
      leadership: Array.isArray(cloudData.leadership) ? cloudData.leadership : []
    };
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
    renderDynamicContent();
    renderAdminManageList();
  } catch (err) {
    console.warn('[Admin] Cloud sync bypass / offline:', err.message);
  }
}

window.publishToCloud = async function() {
  const statusEl = document.getElementById('publish-status');
  const publishButton = document.getElementById('publish-cloud-btn');
  if (statusEl) statusEl.textContent = 'PUBLISHING TO CLOUD...';
  if (publishButton) publishButton.disabled = true;

  try {
    const db = await initFirebaseStore();
    await db.collection(CLOUD_CONTENT_COLLECTION).doc(CLOUD_CONTENT_DOCUMENT).set(getPortfolioData());
    if (statusEl) statusEl.textContent = 'LIVE: CHANGES PUBLISHED';
  } catch (err) {
    console.error('[Admin] Publish failed:', err);
    if (statusEl) statusEl.textContent = 'PUBLISH FAILED: CHECK FIRESTORE ACCESS';
  } finally {
    if (publishButton) publishButton.disabled = false;
  }
};

// 1. Delete Functions with Confirmation
window.deleteAdminItem = function(type, index) {
  const data = getPortfolioData();
  const itemTitle = data[type]?.[index]?.title || data[type]?.[index]?.company || data[type]?.[index]?.org || 'this item';
  
  if (!confirm(`Are you sure you want to remove "${itemTitle}"?`)) return;

  localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(data));
  data[type].splice(index, 1);
  savePortfolioData(data, true);
};

window.clearAllAdminData = function() {
  if (!confirm("⚠️ DANGER: This will delete ALL custom projects, experiences, and leadership you added via the console. Proceed?")) return;
  localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(getPortfolioData()));
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  renderDynamicContent();
  renderAdminManageList();
  alert("All admin additions cleared!");
};

window.undoAdminAction = function() {
  const snapshot = localStorage.getItem(ADMIN_UNDO_KEY);
  if (!snapshot) return;

  try {
    const data = JSON.parse(snapshot);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
    localStorage.removeItem(ADMIN_UNDO_KEY);
    renderDynamicContent();
    renderAdminManageList();
  } catch (err) {
    console.warn('[Admin] Could not restore the last change:', err.message);
  }
};

// 2. Render Existing Dynamic Items in Console for Easy Removal
function renderAdminManageList() {
  const container = document.getElementById('admin-manage-entries');
  if (!container) return;
  const undoButton = document.getElementById('admin-undo-btn');
  if (undoButton) undoButton.disabled = !localStorage.getItem(ADMIN_UNDO_KEY);

  const data = getPortfolioData();
  const totalItems = (data.projects?.length || 0) + (data.experiences?.length || 0) + (data.leadership?.length || 0);

  if (totalItems === 0) {
    container.innerHTML = '<div class="text-[10px] text-purple-400/50 italic py-2">No dynamic additions logged yet.</div>';
    return;
  }

  let html = '';

  if (data.projects?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mb-1">Projects</div>';
    html += data.projects.map((p, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2 rounded border border-synth-purple/20 text-[11px] mb-1">
        <span class="text-white truncate max-w-[280px] font-bold">${p.title}</span>
        <button type="button" onclick="deleteAdminItem('projects', ${idx})" class="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-[10px]">
          DELETE ✕
        </button>
      </div>
    `).join('');
  }

  if (data.experiences?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mt-3 mb-1">Work Experiences</div>';
    html += data.experiences.map((exp, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2 rounded border border-synth-purple/20 text-[11px] mb-1">
        <span class="text-white truncate max-w-[280px] font-bold">${exp.company} - ${exp.role}</span>
        <button type="button" onclick="deleteAdminItem('experiences', ${idx})" class="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-[10px]">
          DELETE ✕
        </button>
      </div>
    `).join('');
  }

  if (data.leadership?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mt-3 mb-1">Leadership</div>';
    html += data.leadership.map((l, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2 rounded border border-synth-purple/20 text-[11px] mb-1">
        <span class="text-white truncate max-w-[280px] font-bold">${l.org} - ${l.role}</span>
        <button type="button" onclick="deleteAdminItem('leadership', ${idx})" class="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-[10px]">
          DELETE ✕
        </button>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

// 3. Render Injected Elements into Page
const dynamicCarouselIndices = {};

function renderDynamicContent() {
  const data = getPortfolioData();
  Object.keys(dynamicCarouselIndices).forEach(index => delete dynamicCarouselIndices[index]);

  // Clear previous dynamic entries
  document.querySelectorAll('.dynamic-project-card, .dynamic-exp-card, .dynamic-lead-card').forEach(el => el.remove());

  // Injected Projects
  const projectGrid = document.querySelector('#view-projects .grid');
  if (projectGrid && data.projects?.length) {
    const dynamicHTML = data.projects.map((proj, idx) => {
      let previewHTML = '';
      if (proj.previewType === 'iframe' && proj.previewUrl) {
        previewHTML = `
          <div class="relative h-44 w-full overflow-hidden border-b border-synth-purple/30 bg-synth-bg">
            <iframe src="${proj.previewUrl}" class="h-full w-full border-0" loading="lazy"></iframe>
            <div class="absolute bottom-2 left-2 px-2 py-1 border border-cyan-400/40 bg-black/40 backdrop-blur-sm font-mono text-[10px] text-synth-cyan">LIVE_IFRAME</div>
          </div>`;
      } else {
        const coverImg = proj.coverImage || 'assets/img/Headshot.webp';
        previewHTML = `
          <div class="relative h-44 w-full overflow-hidden border-b border-synth-purple/30 bg-synth-panel/80">
            <img src="${coverImg}" alt="${proj.title}" class="h-full w-full object-cover object-center" onerror="this.onerror=null; this.src='assets/img/Headshot.webp'">
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-synth-card via-transparent to-transparent"></div>
            <div class="absolute bottom-2 left-2 px-2 py-1 border border-purple-400/40 bg-black/40 backdrop-blur-sm font-mono text-[10px] text-synth-cyan">PROJECT_IMAGE</div>
          </div>`;
      }

      let carouselHTML = '';
      if (proj.hasCarousel && (parseInt(proj.carouselCount, 10) || 0) > 0) {
        const prefix = proj.carouselPrefix || 'proj';
        const count = parseInt(proj.carouselCount, 10) || 1;
        const firstImage = `assets/img/${prefix}1.webp`;
        carouselHTML = `
          <div class="mt-3">
            <div class="relative flex items-center gap-3">
              <button type="button" onclick="stepDynamicCarousel(${idx}, -1)" aria-label="Previous ${proj.title} image" class="hud-chamfer-btn px-2 py-1 border border-synth-purple/50 bg-synth-panel/70 text-synth-cyan text-sm font-hud hover:border-synth-neonMagenta">&lt;-</button>
              <div class="relative flex-1 h-28 overflow-hidden rounded border border-synth-purple/30 bg-synth-panel/60 cursor-zoom-in" onclick="openDynamicLightbox(${idx})">
                <img id="dyn-carousel-img-${idx}" src="${firstImage}" alt="${proj.title} preview" class="h-full w-full object-cover transition-opacity duration-300" onerror="this.onerror=null; this.src='assets/img/Headshot.webp'">
              </div>
              <button type="button" onclick="stepDynamicCarousel(${idx}, 1)" aria-label="Next ${proj.title} image" class="hud-chamfer-btn px-2 py-1 border border-synth-purple/50 bg-synth-panel/70 text-synth-cyan text-sm font-hud hover:border-synth-neonMagenta">-&gt;</button>
            </div>
            <div class="flex justify-between items-center text-[10px] font-mono text-synth-purple/70 mt-1 px-1">
              <span>CLICK IMAGE TO EXPAND</span>
              <span id="dyn-carousel-counter-${idx}">1 / ${count}</span>
            </div>
          </div>`;
      }

      const cleanDesc = escapeHTML(proj.description || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join(' ');

      const tags = (proj.tags || []).map(tag => `<span class="px-2 py-0.5 bg-synth-purple/20 border border-synth-purple/40 text-[10px] font-mono text-synth-lavender whitespace-nowrap">${tag}</span>`).join('');

      return `
        <article class="dynamic-project-card hud-chamfer bg-synth-card border border-synth-cardBorder p-0 overflow-hidden hover:border-synth-neonMagenta transition group relative crt-overlay">
          ${previewHTML}
          <div class="p-6 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-synth-purple/20 pb-3">
              <span class="font-mono text-xs text-synth-cyan font-bold tracking-wider">[ DYN_PROJECT_${idx + 1} ]</span>
              <div class="flex flex-wrap items-center gap-1.5 justify-end">
                ${tags}
              </div>
            </div>
            <h3 class="font-hud font-bold text-2xl text-white group-hover:text-synth-neonMagenta transition">${proj.title}</h3>
            <p class="font-mono text-xs text-synth-lavender/90 leading-relaxed">${cleanDesc}</p>
            ${carouselHTML}
            <div class="flex items-center justify-between gap-3 pt-3 border-t border-synth-purple/10">
              ${proj.liveUrl ? `<a href="${proj.liveUrl}" target="_blank" rel="noopener noreferrer" class="font-hud font-semibold text-xs text-synth-cyan hover:text-white flex items-center gap-1">VIEW FULL ↗</a>` : '<span></span>'}
              ${proj.githubUrl ? `<a href="${proj.githubUrl}" target="_blank" rel="noopener noreferrer" class="font-hud font-semibold text-xs text-synth-lavender hover:text-white flex items-center gap-1">SOURCE CODE ↗</a>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    projectGrid.insertAdjacentHTML('afterbegin', dynamicHTML);
  }

  // Injected Experiences
  const expContainer = document.getElementById('sub-internships');
  if (expContainer && data.experiences?.length) {
    const expHTML = data.experiences.map(exp => `
      <div class="dynamic-exp-card hud-chamfer bg-synth-card border border-synth-cardBorder p-5">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <h3 class="font-mono text-sm font-bold text-white">${exp.company} | ${exp.role}</h3>
          <span class="text-[10px] font-mono text-synth-purple">${exp.duration} | ${exp.location}</span>
        </div>
        <p class="mt-2 font-mono text-[11px] text-synth-cyan">Skills: ${exp.skills}</p>
        <ul class="mt-3 space-y-2 font-mono text-xs text-synth-lavender/80 list-disc pl-5">
          ${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    expContainer.insertAdjacentHTML('afterbegin', expHTML);
  }

  // Injected Leadership
  const leadContainer = document.getElementById('sub-lastSeen');
  if (leadContainer && data.leadership?.length) {
    const leadHTML = data.leadership.map(item => `
      <div class="dynamic-lead-card hud-chamfer bg-synth-card border border-synth-cardBorder p-5">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <h3 class="font-mono text-sm font-bold text-white">${item.org} | ${item.role}</h3>
          <span class="text-[10px] font-mono text-synth-purple">${item.duration} | ${item.location}</span>
        </div>
        ${item.focus ? `<p class="mt-2 font-mono text-[11px] text-synth-cyan">Focus: ${item.focus}</p>` : ''}
        <ul class="mt-3 space-y-2 font-mono text-xs text-synth-lavender/80 list-disc pl-5">
          ${(item.bullets || []).map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    leadContainer.insertAdjacentHTML('afterbegin', leadHTML);
  }
}

window.stepDynamicCarousel = function(projectIndex, step) {
  const data = getPortfolioData();
  const project = data.projects?.[projectIndex];
  if (!project?.hasCarousel) return;

  const count = parseInt(project.carouselCount, 10) || 1;
  const prefix = project.carouselPrefix || 'proj';
  const currentIndex = dynamicCarouselIndices[projectIndex] || 0;
  dynamicCarouselIndices[projectIndex] = (currentIndex + step + count) % count;
  const currentNumber = dynamicCarouselIndices[projectIndex] + 1;
  const image = document.getElementById(`dyn-carousel-img-${projectIndex}`);
  const counter = document.getElementById(`dyn-carousel-counter-${projectIndex}`);

  if (image) image.src = `assets/img/${prefix}${currentNumber}.webp`;
  if (counter) counter.textContent = `${currentNumber} / ${count}`;
};

window.openDynamicLightbox = function(projectIndex) {
  const project = getPortfolioData().projects?.[projectIndex];
  if (!project?.hasCarousel || typeof window.openLightbox !== 'function') return;

  const count = parseInt(project.carouselCount, 10) || 1;
  const prefix = project.carouselPrefix || 'proj';
  const gallery = Array.from({ length: count }, (_, index) => `assets/img/${prefix}${index + 1}.webp`);
  window.openLightbox(gallery, dynamicCarouselIndices[projectIndex] || 0);
};

// 4. Modal Navigation & Visibility Gate
function checkAdminAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || window.location.protocol === 'file:';
  const hasAdminQuery = urlParams.get('admin') === 'true';

  const btn = document.getElementById('admin-trigger-btn');
  if (btn) {
    btn.style.display = (isLocalhost || hasAdminQuery) ? 'block' : 'none';
  }
}

window.toggleAdminModal = function() {
  const modal = document.getElementById('admin-modal');
  if (!modal) return;
  modal.classList.toggle('hidden');
  if (!modal.classList.contains('hidden')) {
    renderAdminManageList();
  }
};

window.switchAdminTab = function(tab) {
  ['projects', 'experiences', 'leadership', 'manage'].forEach(t => {
    document.getElementById(`admin-form-${t}`)?.classList.add('hidden');
    document.getElementById(`tab-btn-${t}`)?.classList.remove('border-b-2', 'border-synth-neonMagenta', 'text-white');
  });

  document.getElementById(`admin-form-${tab}`)?.classList.remove('hidden');
  document.getElementById(`tab-btn-${tab}`)?.classList.add('border-b-2', 'border-synth-neonMagenta', 'text-white');
};

// 5. Form Submit Handlers
window.submitAdminProject = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  data.projects.unshift({
    title: f.title.value,
    description: f.description.value,
    tags: f.tags.value.split(',').map(s => s.trim()).filter(Boolean),
    previewType: f.previewType.value,
    previewUrl: f.previewUrl.value || null,
    coverImage: f.coverImage.value || null,
    hasCarousel: f.hasCarousel.checked,
    carouselPrefix: f.carouselPrefix.value || 'proj',
    carouselCount: parseInt(f.carouselCount.value) || 0,
    liveUrl: f.liveUrl.value || null,
    githubUrl: f.githubUrl.value || null
  });

  savePortfolioData(data);
  f.reset();
  toggleAdminModal();
};

window.submitAdminExperience = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  data.experiences.unshift({
    company: f.company.value,
    role: f.role.value,
    duration: f.duration.value,
    location: f.location.value,
    skills: f.skills.value,
    bullets: f.bullets.value.split('\n').filter(line => line.trim())
  });

  savePortfolioData(data);
  f.reset();
  toggleAdminModal();
};

window.submitAdminLeadership = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  data.leadership.unshift({
    org: f.org.value,
    role: f.role.value,
    duration: f.duration.value,
    location: f.location.value,
    focus: f.focus.value || '',
    bullets: f.bullets.value.split('\n').filter(line => line.trim())
  });

  savePortfolioData(data);
  f.reset();
  toggleAdminModal();
};

window.exportAdminData = function() {
  const json = JSON.stringify(getPortfolioData(), null, 2);
  navigator.clipboard.writeText(json);
  alert('Portfolio JSON copied to clipboard!');
};

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  renderDynamicContent();
  fetchCloudContent();
});