// =============================================================================
// ADMIN CONSOLE: MULTI-TAB PORTFOLIO MANAGEMENT + DELETE / UNDO SYSTEM
// =============================================================================

const ADMIN_STORAGE_KEY = 'banimut_admin_content';
const ADMIN_UNDO_KEY = 'banimut_admin_undo';
const ADMIN_STAGED_DELTA_KEY = 'banimut_admin_staged_delta';
const CLOUD_CONTENT_COLLECTION = 'site_content';
const CLOUD_CONTENT_DOCUMENT = 'portfolio';
const DEFAULT_SKILLS = {
  'Languages & Engines': ['Python', 'JavaScript', 'Java', 'HTML/CSS', 'Relational SQL', 'Ursina Engine'],
  'Data & Analytics': ['Pandas', 'NumPy', 'Matplotlib', 'A/B Testing', 'Google Analytics', 'Spreadsheets'],
  'Frameworks & Platforms': ['Streamlit', 'Firebase', 'Web Components', 'LLMs', 'AI Workflows'],
  'Tooling & QA': ['Git', 'GitHub', 'Software QA', 'Code Review', 'Testing', 'Reporting']
};

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
    const raw = JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY)) || {};
    const customSkills = raw.customSkills && typeof raw.customSkills === 'object' && !Array.isArray(raw.customSkills)
      ? raw.customSkills
      : {};
    return {
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      experiences: Array.isArray(raw.experiences) ? raw.experiences : [],
      leadership: Array.isArray(raw.leadership) ? raw.leadership : [],
      customSkills
    };
  } catch {
    return { projects: [], experiences: [], leadership: [], customSkills: {} };
  }
}

function getStagedDelta() {
  const delta = Number.parseInt(localStorage.getItem(ADMIN_STAGED_DELTA_KEY) || '0', 10);
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

function updatePendingBadge() {
  const delta = getStagedDelta();
  const badge = document.getElementById('admin-pending-badge');
  const tooltip = document.getElementById('admin-pending-tooltip');
  const tooltipText = document.getElementById('admin-pending-tooltip-text');

  if (badge) {
    badge.textContent = delta >= 5 ? '5+' : String(delta);
    badge.classList.toggle('hidden', delta === 0);
    badge.classList.toggle('flex', delta > 0);
  }

  if (tooltip) tooltip.classList.toggle('hidden', delta === 0);
  if (tooltipText) tooltipText.textContent = `${delta} PENDING CHANGE${delta === 1 ? '' : 'S'}`;
}

function incrementStagedDelta() {
  localStorage.setItem(ADMIN_STAGED_DELTA_KEY, String(getStagedDelta() + 1));
  updatePendingBadge();
}

function clearStagedDelta() {
  localStorage.removeItem(ADMIN_STAGED_DELTA_KEY);
  updatePendingBadge();
}

function savePortfolioData(data, preserveUndo = false) {
  if (!preserveUndo) localStorage.removeItem(ADMIN_UNDO_KEY);
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
  incrementStagedDelta();
  renderDynamicContent();
  renderAdminManageList();
}

function renderSkillsMatrix(data = getPortfolioData()) {
  const container = document.getElementById('skills-matrix-grid');
  if (!container) return;

  const matrix = Object.fromEntries(
    Object.entries(DEFAULT_SKILLS).map(([category, skills]) => [category, new Set(skills)])
  );
  matrix['Project Tech & Engines'] = new Set();

  Object.entries(data.customSkills || {}).forEach(([category, skills]) => {
    if (!matrix[category]) matrix[category] = new Set();
    (Array.isArray(skills) ? skills : []).forEach(skill => {
      if (typeof skill === 'string' && skill.trim()) matrix[category].add(skill.trim());
    });
  });

  const projectTech = matrix['Project Tech & Engines'] || new Set();
  (data.projects || []).forEach(project => {
    (Array.isArray(project.tags) ? project.tags : []).forEach(tag => {
      if (typeof tag === 'string' && tag.trim()) projectTech.add(tag.trim());
    });
  });
  if (projectTech.size) matrix['Project Tech & Engines'] = projectTech;

  const categories = Object.entries(matrix).filter(([, skills]) => skills.size);
  container.innerHTML = categories.map(([category, skills]) => `
    <div>
      <span class="text-white text-[10px] uppercase font-bold block mb-1 tracking-[0.18em]">${escapeHTML(category)}</span>
      <div class="flex flex-wrap gap-1.5 text-[11px]">
        ${Array.from(skills, skill => `<span class="px-2 py-0.5 border border-synth-purple/30 bg-synth-purple/10 text-synth-lavender rounded-sm hover:border-synth-cyan transition-colors">${escapeHTML(skill)}</span>`).join('')}
      </div>
    </div>
  `).join('');

  const totalSkills = categories.reduce((total, [, skills]) => total + skills.size, 0);
  const countEl = document.getElementById('skills-count-indicator');
  if (countEl) countEl.textContent = `[ ${totalSkills} VERIFIED ]`;
}

function refreshSkillCategoryOptions() {
  const select = document.querySelector('#admin-form-skills [name="category"]');
  if (!select) return;

  const selected = select.value;
  const categories = new Set([
    ...Object.keys(DEFAULT_SKILLS),
    'Project Tech & Engines',
    ...Object.keys(getPortfolioData().customSkills || {})
  ]);
  select.innerHTML = [
    ...Array.from(categories, category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}${category === 'Project Tech & Engines' ? ' (Dynamic)' : ''}</option>`),
    '<option value="__custom__">+ Create New Category...</option>'
  ].join('');
  if (categories.has(selected)) select.value = selected;
}

async function fetchCloudContent() {
  try {
    const db = await initFirebaseStore();
    const snapshot = await db.collection(CLOUD_CONTENT_COLLECTION).doc(CLOUD_CONTENT_DOCUMENT).get();
    if (!snapshot.exists || getStagedDelta() > 0) return;

    const cloudData = snapshot.data() || {};
    const data = {
      projects: Array.isArray(cloudData.projects) ? cloudData.projects : [],
      experiences: Array.isArray(cloudData.experiences) ? cloudData.experiences : [],
      leadership: Array.isArray(cloudData.leadership) ? cloudData.leadership : [],
      customSkills: cloudData.customSkills && typeof cloudData.customSkills === 'object' && !Array.isArray(cloudData.customSkills)
        ? cloudData.customSkills
        : {}
    };
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
    renderDynamicContent();
    renderAdminManageList();
  } catch (err) {
    console.warn('[Admin] Cloud sync bypass / offline:', err.message);
  } finally {
    updatePendingBadge();
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
    clearStagedDelta();
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
  if (!confirm("⚠️ DANGER: This will delete ALL custom projects, experiences, leadership, and skills you added via the console. Proceed?")) return;
  localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(getPortfolioData()));
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  incrementStagedDelta();
  renderDynamicContent();
  renderAdminManageList();
  alert("All admin additions cleared!");
};

window.undoAdminAction = function() {
  const snapshot = localStorage.getItem(ADMIN_UNDO_KEY);
  if (!snapshot) return;

  try {
    const data = JSON.parse(snapshot);
    savePortfolioData(data);
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
  const customSkillCount = Object.values(data.customSkills || {}).reduce(
    (total, skills) => total + (Array.isArray(skills) ? skills.length : 0),
    0
  );
  const totalItems = (data.projects?.length || 0) + (data.experiences?.length || 0) + (data.leadership?.length || 0) + customSkillCount;

  if (totalItems === 0) {
    container.innerHTML = '<div class="text-[10px] text-purple-400/50 italic py-2">No dynamic additions logged yet.</div>';
    return;
  }

  let html = '';

  if (data.projects?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mb-2">Projects</div>';
    html += data.projects.map((p, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2.5 rounded border border-synth-purple/20 text-xs mb-2">
        <span class="text-white truncate max-w-[210px] font-bold font-mono">${escapeHTML(p.title)}</span>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="editAdminItem('projects', ${idx})" class="text-synth-cyan hover:text-white font-mono font-bold px-2 py-1 rounded bg-synth-panel/80 border border-synth-cyan/40 text-[10px] transition">
            ✎ EDIT
          </button>
          <button type="button" onclick="deleteAdminItem('projects', ${idx})" class="text-red-400 hover:text-red-300 font-mono font-bold px-2 py-1 rounded bg-red-950/40 border border-red-500/30 text-[10px] transition">
            DELETE ✕
          </button>
        </div>
      </div>
    `).join('');
  }

  if (data.experiences?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mt-3 mb-2">Experiences</div>';
    html += data.experiences.map((exp, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2.5 rounded border border-synth-purple/20 text-xs mb-2">
        <span class="text-white truncate max-w-[210px] font-bold font-mono">${escapeHTML(exp.company)} - ${escapeHTML(exp.role)}</span>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="editAdminItem('experiences', ${idx})" class="text-synth-cyan hover:text-white font-mono font-bold px-2 py-1 rounded bg-synth-panel/80 border border-synth-cyan/40 text-[10px] transition">
            ✎ EDIT
          </button>
          <button type="button" onclick="deleteAdminItem('experiences', ${idx})" class="text-red-400 hover:text-red-300 font-mono font-bold px-2 py-1 rounded bg-red-950/40 border border-red-500/30 text-[10px] transition">
            DELETE ✕
          </button>
        </div>
      </div>
    `).join('');
  }

  if (data.leadership?.length) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mt-3 mb-2">Leadership</div>';
    html += data.leadership.map((l, idx) => `
      <div class="flex items-center justify-between bg-synth-bg/60 p-2.5 rounded border border-synth-purple/20 text-xs mb-2">
        <span class="text-white truncate max-w-[210px] font-bold font-mono">${escapeHTML(l.org)} - ${escapeHTML(l.role)}</span>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="editAdminItem('leadership', ${idx})" class="text-synth-cyan hover:text-white font-mono font-bold px-2 py-1 rounded bg-synth-panel/80 border border-synth-cyan/40 text-[10px] transition">
            ✎ EDIT
          </button>
          <button type="button" onclick="deleteAdminItem('leadership', ${idx})" class="text-red-400 hover:text-red-300 font-mono font-bold px-2 py-1 rounded bg-red-950/40 border border-red-500/30 text-[10px] transition">
            DELETE ✕
          </button>
        </div>
      </div>
    `).join('');
  }

  if (customSkillCount) {
    html += '<div class="text-synth-cyan font-bold text-[10px] uppercase border-b border-synth-purple/20 pb-1 mt-3 mb-1">Custom Skills</div>';
    Object.entries(data.customSkills || {}).forEach(([category, skills]) => {
      (Array.isArray(skills) ? skills : []).forEach((skill, index) => {
        html += `
          <div class="flex items-center justify-between bg-synth-bg/60 p-1.5 rounded border border-synth-purple/20 text-[11px] mb-1">
            <span class="text-white truncate max-w-[260px]"><span class="text-synth-purple text-[10px]">[${escapeHTML(category)}]</span> ${escapeHTML(skill)}</span>
            <button type="button" data-skill-category="${escapeHTML(category)}" data-skill-index="${index}" class="admin-delete-skill text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-[9px]" aria-label="Delete ${escapeHTML(skill)}">&#10005;</button>
          </div>
        `;
      });
    });
  }

  container.innerHTML = html;
  container.querySelectorAll('.admin-delete-skill').forEach(button => {
    button.addEventListener('click', () => deleteAdminSkill(button.dataset.skillCategory, Number(button.dataset.skillIndex)));
  });
}

window.deleteAdminSkill = function(category, index) {
  const data = getPortfolioData();
  const skills = data.customSkills[category];
  if (!Array.isArray(skills) || index < 0 || index >= skills.length) return;

  localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(data));
  skills.splice(index, 1);
  if (!skills.length) delete data.customSkills[category];
  savePortfolioData(data, true);
};

// 3. Render Injected Elements into Page
const dynamicCarouselIndices = {};

function renderDynamicContent() {
  const data = getPortfolioData();
  renderSkillsMatrix(data);
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
          <div class="relative h-72 sm:h-80 w-full overflow-hidden border-b border-synth-purple/30 bg-synth-bg">
            <iframe
              src="${escapeHTML(proj.previewUrl)}"
              class="h-full w-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
            <div class="absolute bottom-2 left-2 px-2 py-0.5 border border-cyan-400/40 bg-black/60 backdrop-blur-sm font-mono text-[9px] text-synth-cyan pointer-events-none">LIVE_IFRAME</div>
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

      const tags = (proj.tags || []).slice(0, 4).map(tag => `<span class="px-2 py-0.5 bg-synth-purple/20 border border-synth-purple/40 text-[10px] font-mono text-synth-lavender whitespace-nowrap">${escapeHTML(tag)}</span>`).join('');

      return `
        <article class="dynamic-project-card hud-chamfer bg-synth-card border border-synth-cardBorder p-0 overflow-hidden hover:border-synth-neonMagenta transition group relative crt-overlay flex flex-col justify-between">
          ${previewHTML}
          <div class="p-6 space-y-4 flex-1">
            <div class="flex flex-wrap items-center justify-end gap-1.5 border-b border-synth-purple/20 pb-3">
  ${tags}
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
    refreshSkillCategoryOptions();
  }
};

window.switchAdminTab = function(tab) {
  if (currentEditingItem && currentEditingItem.type !== tab) {
    resetFormMode(currentEditingItem.type);
  }

  ['projects', 'experiences', 'leadership', 'skills', 'manage'].forEach(t => {
    document.getElementById(`admin-form-${t}`)?.classList.add('hidden');
    document.getElementById(`tab-btn-${t}`)?.classList.remove('border-b-2', 'border-synth-neonMagenta', 'text-white');
    document.getElementById(`tab-btn-${t}`)?.classList.add('text-synth-lavender/60');
  });

  document.getElementById(`admin-form-${tab}`)?.classList.remove('hidden');
  document.getElementById(`tab-btn-${tab}`)?.classList.remove('text-synth-lavender/60');
  document.getElementById(`tab-btn-${tab}`)?.classList.add('border-b-2', 'border-synth-neonMagenta', 'text-white');
  if (tab === 'skills') refreshSkillCategoryOptions();
};

document.addEventListener('change', event => {
  if (event.target?.name !== 'category') return;
  document.getElementById('custom-cat-wrapper')?.classList.toggle('hidden', event.target.value !== '__custom__');
});

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

window.submitAdminSkill = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = getPortfolioData();
  const selectedCategory = form.elements.namedItem('category').value;
  const category = selectedCategory === '__custom__'
    ? form.elements.namedItem('customCategory').value.trim()
    : selectedCategory;

  if (!category) {
    alert('Please provide a name for the new category.');
    return;
  }

  const skills = form.elements.namedItem('skillNames').value.split(',').map(skill => skill.trim()).filter(Boolean);
  if (!skills.length) return;
  if (!Array.isArray(data.customSkills[category])) data.customSkills[category] = [];

  const existing = new Set([
    ...(DEFAULT_SKILLS[category] || []),
    ...data.customSkills[category]
  ].map(skill => skill.toLocaleLowerCase()));
  skills.forEach(skill => {
    if (!existing.has(skill.toLocaleLowerCase())) {
      data.customSkills[category].push(skill);
      existing.add(skill.toLocaleLowerCase());
    }
  });

  savePortfolioData(data);
  form.reset();
  document.getElementById('custom-cat-wrapper')?.classList.add('hidden');
  switchAdminTab('manage');
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
  updatePendingBadge();
  checkAdminAccess();
  renderDynamicContent();
  fetchCloudContent();
});
// Tracks the item currently being edited, if any.
let currentEditingItem = null;

function resetFormMode(type) {
  currentEditingItem = null;
  const form = document.getElementById(`admin-form-${type}`);
  if (!form) return;
  form.reset();

  const submitBtn = form.querySelector('button[type="submit"]');
  const addLabels = {
    projects: '+ DEPLOY PROJECT',
    experiences: '+ LOG EXPERIENCE',
    leadership: '+ LOG LEADERSHIP'
  };
  if (submitBtn) submitBtn.textContent = addLabels[type];
}

window.editAdminItem = function(type, index) {
  const data = getPortfolioData();
  const item = data[type]?.[index];
  if (!item) return;

  if (currentEditingItem) resetFormMode(currentEditingItem.type);
  window.switchAdminTab(type);

  const form = document.getElementById(`admin-form-${type}`);
  if (!form) return;

  currentEditingItem = { type, index };
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '💾 UPDATE & PREVIEW CHANGES';

  if (type === 'projects') {
    form.title.value = item.title || '';
    form.description.value = item.description || '';
    form.tags.value = (item.tags || []).join(', ');
    form.previewType.value = item.previewType || 'image';
    form.previewUrl.value = item.previewUrl || '';
    form.coverImage.value = item.coverImage || '';
    form.hasCarousel.checked = !!item.hasCarousel;
    form.carouselPrefix.value = item.carouselPrefix || 'proj';
    form.carouselCount.value = item.carouselCount || 0;
    form.liveUrl.value = item.liveUrl || '';
    form.githubUrl.value = item.githubUrl || '';
  } else if (type === 'experiences') {
    form.company.value = item.company || '';
    form.role.value = item.role || '';
    form.duration.value = item.duration || '';
    form.location.value = item.location || '';
    form.skills.value = item.skills || '';
    form.bullets.value = (item.bullets || []).join('\n');
  } else if (type === 'leadership') {
    form.org.value = item.org || '';
    form.role.value = item.role || '';
    form.duration.value = item.duration || '';
    form.location.value = item.location || '';
    form.focus.value = item.focus || '';
    form.bullets.value = (item.bullets || []).join('\n');
  }
};

window.submitAdminProject = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  const payload = {
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
  };

  const editing = currentEditingItem?.type === 'projects' && data.projects[currentEditingItem.index];
  if (editing) {
    localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(data));
    data.projects[currentEditingItem.index] = payload;
  } else {
    data.projects.unshift(payload);
  }

  savePortfolioData(data, !!editing);
  f.reset();
  resetFormMode('projects');
  window.switchAdminTab('manage');
};

window.submitAdminExperience = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  const payload = {
    company: f.company.value,
    role: f.role.value,
    duration: f.duration.value,
    location: f.location.value,
    skills: f.skills.value,
    bullets: f.bullets.value.split('\n').filter(line => line.trim())
  };

  const editing = currentEditingItem?.type === 'experiences' && data.experiences[currentEditingItem.index];
  if (editing) {
    localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(data));
    data.experiences[currentEditingItem.index] = payload;
  } else {
    data.experiences.unshift(payload);
  }

  savePortfolioData(data, !!editing);
  f.reset();
  resetFormMode('experiences');
  window.switchAdminTab('manage');
};

window.submitAdminLeadership = function(e) {
  e.preventDefault();
  const f = e.target;
  const data = getPortfolioData();

  const payload = {
    org: f.org.value,
    role: f.role.value,
    duration: f.duration.value,
    location: f.location.value,
    focus: f.focus.value || '',
    bullets: f.bullets.value.split('\n').filter(line => line.trim())
  };

  const editing = currentEditingItem?.type === 'leadership' && data.leadership[currentEditingItem.index];
  if (editing) {
    localStorage.setItem(ADMIN_UNDO_KEY, JSON.stringify(data));
    data.leadership[currentEditingItem.index] = payload;
  } else {
    data.leadership.unshift(payload);
  }

  savePortfolioData(data, !!editing);
  f.reset();
  resetFormMode('leadership');
  window.switchAdminTab('manage');
};