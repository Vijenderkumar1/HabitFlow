/**
 * ============================================================
 *  HABITFLOW 2026 — script.js
 *  Modular vanilla JS. No dependencies.
 * ============================================================
 */

/* ─── CONSTANTS ──────────────────────────────────────────── */
const YEAR = new Date().getFullYear();
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DEFAULT_HABITS = [
  { id:'study',       icon:'📚',  name:'Self Study',   color:'#6366F1' },
  { id:'classes',     icon:'🏫',  name:'Classes',      color:'#8B5CF6' },
  { id:'assignments', icon:'📝',  name:'Assignments',  color:'#EC4899' },
  { id:'coding',      icon:'💻',  name:'Coding / Lab', color:'#10B981' },
  { id:'revision',    icon:'📖',  name:'Revision',     color:'#F59E0B' },
  { id:'gym',         icon:'🏋',  name:'Gym',          color:'#22C98A' },
  { id:'ground',      icon:'🏃',  name:'Ground',        color:'#3BAFE8' },
  { id:'handstand',   icon:'🤸',  name:'Handstand',     color:'#FF8C42' },
  { id:'yoga',        icon:'🧘',  name:'Yoga',          color:'#B47EFF' },
];

/* ─── STATE ──────────────────────────────────────────────── */
const State = {
  habits:       [],        // [{id,icon,name,color}]
  data:         {},        // {"YYYY-MM-DD": {habitId: bool, mood, water, studyHours, weight, duration, notes}}
  selectedDate: null,      // "YYYY-MM-DD"
  currentYear:  new Date().getFullYear(),
  currentMonth: 0,         // 0-11
  view:         'month',   // 'month' | 'year'
  filter:       'all',     // 'all' | habitId
  theme:        'dark',

  getUserKey() {
    return (typeof Auth !== 'undefined' && Auth.currentUser) ? `_${Auth.currentUser.sub}` : '';
  },

  loadUserData() {
    this.load();
    if (typeof Calendar !== 'undefined') Calendar.render();
    if (typeof Habits !== 'undefined')   Habits.render();
    if (typeof FilterBar !== 'undefined') FilterBar.render();
    if (typeof Stats !== 'undefined')    Stats.render();
    if (typeof UI !== 'undefined')       UI.renderSelectedDay();
  },

  load() {
    const key = this.getUserKey();
    let loaded = JSON.parse(localStorage.getItem(`hf_habits${key}`) || 'null');
    if (!loaded || loaded.length === 0) {
      this.habits = [...DEFAULT_HABITS];
    } else {
      DEFAULT_HABITS.forEach(dh => {
        if (!loaded.some(h => h.id === dh.id)) {
          loaded.push(dh);
        }
      });
      const academicIds = ['study', 'classes', 'assignments', 'coding', 'revision'];
      this.habits = loaded.sort((a, b) => {
        const aIndex = academicIds.indexOf(a.id);
        const bIndex = academicIds.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });
    }
    this.save();
    this.data   = JSON.parse(localStorage.getItem(`hf_data${key}`) || '{}');
    this.theme  = localStorage.getItem('hf_theme') || 'dark';
    this.currentYear  = parseInt(localStorage.getItem('hf_year')) || new Date().getFullYear();
    this.currentMonth = new Date().getMonth();
    this.selectedDate = todayStr();
  },
  save() {
    const key = this.getUserKey();
    localStorage.setItem(`hf_habits${key}`, JSON.stringify(this.habits));
    localStorage.setItem(`hf_data${key}`,   JSON.stringify(this.data));
    localStorage.setItem('hf_theme',         this.theme);
    localStorage.setItem('hf_year',          this.currentYear);
  },

  /** Get or init day record */
  getDay(dateStr) {
    if (!this.data[dateStr]) this.data[dateStr] = {};
    return this.data[dateStr];
  },

  /** Toggle a habit on a date */
  toggleHabit(dateStr, habitId) {
    const day = this.getDay(dateStr);
    day[habitId] = !day[habitId];
    this.save();
  },

  /** Count completed habits for a date */
  completedCount(dateStr) {
    const day = this.data[dateStr] || {};
    return this.habits.filter(h => day[h.id]).length;
  },

  /** Get completion level for a date: 'full' | 'partial' | 'none' */
  completionLevel(dateStr) {
    const c = this.completedCount(dateStr);
    if (c === 0) return 'none';
    if (c === this.habits.length) return 'full';
    return 'partial';
  },

  /** Total days a habit was completed */
  habitTotal(habitId) {
    return Object.values(this.data).filter(d => d[habitId]).length;
  },

  /** Current streak (consecutive days ending today or yesterday) */
  currentStreak() {
    const today = todayStr();
    let streak = 0, d = new Date();
    while (true) {
      const s = dateStr(d);
      if (s > today) { d.setDate(d.getDate()-1); continue; }
      if (this.completedCount(s) === 0) break;
      streak++; d.setDate(d.getDate()-1);
    }
    return streak;
  },

  /** Longest streak across the year */
  longestStreak() {
    let longest = 0, current = 0;
    const y = this.currentYear;
    for (let m=0;m<12;m++) {
      const days = daysInMonth(y, m);
      for (let d=1;d<=days;d++) {
        const s = dateStr(new Date(y,m,d));
        if (this.completedCount(s) > 0) { current++; longest = Math.max(longest,current); }
        else current = 0;
      }
    }
    return longest;
  },

  /** Overall completion % for the year up to today */
  overallPct() {
    const today = todayStr();
    const y = this.currentYear;
    let total=0, done=0;
    for (let m=0;m<12;m++) {
      const days = daysInMonth(y,m);
      for (let d=1;d<=days;d++) {
        const s = dateStr(new Date(y,m,d));
        if (s > today) break;
        total++;
        if (this.completedCount(s) > 0) done++;
      }
    }
    return total === 0 ? 0 : Math.round((done/total)*100);
  },
};

/* ─── HELPERS ────────────────────────────────────────────── */
function daysInMonth(year, month) {
  return new Date(year, month+1, 0).getDate();
}
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return dateStr(new Date()); }
function goToday() {
  const today = todayStr();
  const d = new Date();
  State.currentYear  = d.getFullYear();
  State.currentMonth = d.getMonth();
  State.save();
  UI.setView('month');
  Calendar.selectDay(today, null);
  showToast('Jumped to today 📅');
}
function parseDateStr(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function formatDate(s) {
  if (!s) return '';
  const d = parseDateStr(s);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function genId() { return 'h_' + Math.random().toString(36).slice(2,8); }

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(msg, duration=2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

/* ─── RIPPLE ─────────────────────────────────────────────── */
function ripple(el) {
  el.classList.remove('ripple');
  void el.offsetWidth;
  el.classList.add('ripple');
  setTimeout(() => el.classList.remove('ripple'), 500);
}

/* ─── TOOLTIP ────────────────────────────────────────────── */
const Tooltip = {
  el: null,
  init() { this.el = document.getElementById('dayTooltip'); },
  show(e, dateStr) {
    if (!this.el) return;
    const day   = State.data[dateStr] || {};
    const label = formatDate(dateStr);
    const done  = State.habits.filter(h => day[h.id]);
    const mood  = day.mood || '';
    const water = day.water ? `💧 ${day.water}ml` : '';
    const study = day.studyHours ? `📚 Study: ${day.studyHours}h` : '';
    let html = `<div class="tooltip-title">${label} ${mood}</div>`;
    if (done.length === 0) html += '<span style="color:var(--text3)">No habits logged</span>';
    done.forEach(h => { html += `<div>${h.icon} ${h.name}</div>`; });
    if (study) html += `<div style="color:#6366F1;margin-top:3px;font-weight:600">${study}</div>`;
    if (water) html += `<div style="color:#3BAFE8;margin-top:2px">${water}</div>`;
    this.el.innerHTML = html;
    this.el.classList.add('show');
    this.move(e);
  },
  move(e) {
    if (!this.el) return;
    const x = e.clientX + 14;
    const y = e.clientY - 10;
    const rect = this.el.getBoundingClientRect();
    const safeX = Math.min(x, window.innerWidth  - rect.width  - 10);
    const safeY = Math.min(y, window.innerHeight - rect.height - 10);
    this.el.style.left = safeX + 'px';
    this.el.style.top  = safeY + 'px';
  },
  hide() {
    if (this.el) this.el.classList.remove('show');
  }
};

/* ─── CALENDAR RENDER ────────────────────────────────────── */
const Calendar = {
  render() {
    if (State.view === 'month') this.renderMonth();
    else this.renderYear();
  },

  renderMonth() {
    const y     = State.currentYear;
    const m     = State.currentMonth;
    const title = document.getElementById('calTitle');
    if (title) title.textContent = `${MONTH_NAMES[m]} ${y}`;
    const logoYear = document.getElementById('logoYear');
    if (logoYear) logoYear.textContent = y;

    const grid  = document.getElementById('daysGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
    const days     = daysInMonth(y, m);
    const today    = todayStr();

    // empty cells
    for (let i=0; i<firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'day-cell empty';
      grid.appendChild(el);
    }

    for (let d=1; d<=days; d++) {
      const s      = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell   = document.createElement('div');
      const dow    = new Date(y,m,d).getDay();
      const level  = State.completionLevel(s);
      const filter = State.filter;

      let classes = 'day-cell';
      if (s === today)             classes += ' today';
      if (s === State.selectedDate) classes += ' selected';
      if (dow === 0)               classes += ' sunday';
      if (level === 'full')        classes += ' done-full';
      else if (level === 'partial') classes += ' done-partial';

      // filter dim
      if (filter !== 'all') {
        const day = State.data[s] || {};
        if (!day[filter]) cell.style.opacity = '0.35';
      }

      cell.className = classes;
      cell.dataset.date = s;

      // day number
      const num = document.createElement('div');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);

      // habit dots
      const dotWrap = document.createElement('div');
      dotWrap.className = 'day-dots';
      const dayData = State.data[s] || {};
      State.habits.forEach(h => {
        if (dayData[h.id]) {
          const dot = document.createElement('div');
          dot.className = 'dot';
          dot.style.background = h.color;
          dotWrap.appendChild(dot);
        }
      });
      cell.appendChild(dotWrap);

      // events
      cell.addEventListener('click', () => this.selectDay(s, cell));
      cell.addEventListener('dblclick', () => UI.openDayPopup(s));
      cell.addEventListener('mouseenter', e => Tooltip.show(e, s));
      cell.addEventListener('mousemove',  e => Tooltip.move(e));
      cell.addEventListener('mouseleave', () => Tooltip.hide());

      grid.appendChild(cell);
    }
  },

  renderYear() {
    const grid = document.getElementById('yearGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const today = todayStr();
    const y     = State.currentYear;

    const yh = document.getElementById('yearHeading');
    if (yh) yh.textContent = `${y} — Year at a Glance`;
    const logoYear = document.getElementById('logoYear');
    if (logoYear) logoYear.textContent = y;

    for (let m=0; m<12; m++) {
      const wrap = document.createElement('div');
      wrap.className = 'mini-month glass-card';
      wrap.style.padding = '12px';

      const title = document.createElement('div');
      title.className = 'mini-month-title';
      title.textContent = MONTH_NAMES[m];
      wrap.appendChild(title);

      const mg = document.createElement('div');
      mg.className = 'mini-grid';

      // weekday headers
      DAY_NAMES.forEach((dn, i) => {
        const wd = document.createElement('div');
        wd.className = 'mini-wd';
        wd.textContent = dn[0];
        if (i===0) wd.style.color = 'var(--red)';
        mg.appendChild(wd);
      });

      const firstDay = new Date(y,m,1).getDay();
      for (let i=0; i<firstDay; i++) {
        const e = document.createElement('div'); e.className='mini-day empty'; mg.appendChild(e);
      }

      const days = daysInMonth(y,m);
      for (let d=1; d<=days; d++) {
        const s   = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const el  = document.createElement('div');
        const dow = new Date(y,m,d).getDay();
        const lvl = State.completionLevel(s);
        let cls   = 'mini-day';
        if (s===today)        cls+=' today';
        if (dow===0)          cls+=' sunday';
        if (lvl==='full')     cls+=' done-full';
        if (lvl==='partial')  cls+=' done-partial';
        el.className  = cls;
        el.textContent= d;
        el.title      = formatDate(s);
        el.addEventListener('click', () => {
          State.currentMonth = m;
          State.view = 'month';
          UI.setView('month');
          this.selectDay(s, null);
        });
        mg.appendChild(el);
      }

      wrap.appendChild(mg);
      grid.appendChild(wrap);
    }
  },

  selectDay(s, cellEl) {
    State.selectedDate = s;
    if (cellEl) ripple(cellEl);
    this.render();
    Habits.render();
    UI.renderSelectedDay();
  },

  goMonth(delta) {
    State.currentMonth += delta;
    if (State.currentMonth > 11) {
      State.currentMonth = 0;
      State.currentYear++;
    } else if (State.currentMonth < 0) {
      State.currentMonth = 11;
      State.currentYear--;
    }
    State.save();
    this.render();
    Stats.render();
  },

  goYear(delta) {
    State.currentYear += delta;
    State.save();
    this.render();
    Stats.render();
    showToast(`Calendar set to ${State.currentYear} 📅`);
  },
};

/* ─── HABITS PANEL ───────────────────────────────────────── */
const Habits = {
  render() {
    const list = document.getElementById('habitsList');
    if (!list) return;
    list.innerHTML = '';
    const s = State.selectedDate;

    State.habits.forEach(h => {
      const day     = s ? (State.data[s] || {}) : {};
      const checked = !!day[h.id];

      const item = document.createElement('div');
      item.className = 'habit-item' + (checked ? ' checked' : '');
      item.dataset.id = h.id;
      item.style.borderColor = checked ? h.color : 'transparent';
      item.innerHTML = `
        <span class="habit-icon">${h.icon}</span>
        <span class="habit-name">${h.name}</span>
        <div class="habit-check" style="background:${checked ? h.color : 'transparent'}">${checked ? '✓' : ''}</div>
        <button class="habit-del" data-id="${h.id}" title="Delete habit">✕</button>
      `;

      // Toggle habit on click
      item.addEventListener('click', e => {
        if (e.target.classList.contains('habit-del')) return;
        if (!State.selectedDate) { showToast('Select a date first 📅'); return; }
        State.toggleHabit(State.selectedDate, h.id);
        Calendar.render();
        this.render();
        Stats.render();
        showToast(`${h.icon} ${h.name} ${State.getDay(State.selectedDate)[h.id] ? 'logged ✓' : 'removed'}`);
      });

      // Delete habit
      item.querySelector('.habit-del').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`Delete "${h.name}"?`)) return;
        State.habits = State.habits.filter(x => x.id !== h.id);
        State.save();
        this.render();
        FilterBar.render();
        Stats.render();
        Calendar.render();
        showToast(`"${h.name}" removed`);
      });

      list.appendChild(item);
    });
  },

  addNew(icon, name, color) {
    if (!name.trim()) { showToast('Enter a habit name'); return false; }
    const id = genId();
    State.habits.push({ id, icon: icon||'⭐', name: name.trim(), color });
    State.save();
    this.render();
    FilterBar.render();
    Stats.render();
    return true;
  },
};

/* ─── FILTER BAR ──────────────────────────────────────────── */
const FilterBar = {
  render() {
    const bar = document.getElementById('filterBar');
    if (!bar) return;
    // Remove dynamic buttons, keep first two children (label + All)
    const static_count = 2;
    while (bar.children.length > static_count) bar.removeChild(bar.lastChild);

    State.habits.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (State.filter === h.id ? ' active' : '');
      btn.textContent = `${h.icon} ${h.name}`;
      btn.dataset.filter = h.id;
      btn.style.setProperty('--h-color', h.color);
      btn.addEventListener('click', () => {
        State.filter = h.id;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Calendar.render();
      });
      bar.appendChild(btn);
    });

    // Wire "All" button
    const allBtn = bar.querySelector('[data-filter="all"]');
    if (allBtn) {
      allBtn.className = 'filter-btn' + (State.filter === 'all' ? ' active' : '');
      allBtn.onclick = () => {
        State.filter = 'all';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        Calendar.render();
      };
    }
  },
};

/* ─── STATS ───────────────────────────────────────────────── */
const Stats = {
  render() {
    this.renderCards();
    this.renderHeatmap();
  },

  renderCards() {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const totalDays = (() => {
      const today = todayStr();
      let t=0;
      for(let m=0;m<12;m++){
        for(let d=1;d<=daysInMonth(YEAR,m);d++){
          const s=`${YEAR}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if(s<=today) t++;
        }
      }
      return Math.max(t,1);
    })();

    // Habit cards
    State.habits.forEach(h => {
      const total = State.habitTotal(h.id);
      const pct   = Math.round((total/totalDays)*100);
      grid.appendChild(this.makeCard(h.icon, total, `${h.name} Days`, pct, h.color));
    });

    // Summary cards
    const pct     = State.overallPct();
    const streak  = State.currentStreak();
    const longest = State.longestStreak();

    grid.appendChild(this.makeCard('📈', pct+'%',  'Overall Completion', pct,     'var(--accent)'));
    grid.appendChild(this.makeCard('🔥', streak,   'Current Streak',     Math.min(streak*5,100), '#FF8C42'));
    grid.appendChild(this.makeCard('🏆', longest,  'Longest Streak',     Math.min(longest*4,100),'var(--yellow)'));
    grid.appendChild(this.makeCard('📅', totalDays,'Days Tracked',       Math.min(Math.round(totalDays/365*100),100),'var(--green)'));
  },

  makeCard(icon, value, label, pct, color) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-icon">${icon}</div>
      <div class="stat-value" style="background:linear-gradient(90deg,${color},${color}99);-webkit-background-clip:text;background-clip:text">${value}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:0%;background:linear-gradient(90deg,${color},${color}99)" data-target="${Math.min(pct,100)}"></div>
        </div>
      </div>
    `;
    // animate bar
    setTimeout(() => {
      const fill = card.querySelector('.stat-bar-fill');
      if (fill) fill.style.width = fill.dataset.target + '%';
    }, 100);
    return card;
  },

  renderHeatmap() {
    const hm = document.getElementById('heatmap');
    if (!hm) return;
    hm.innerHTML = '';

    // Render all weeks of the year
    const start = new Date(YEAR, 0, 1);
    const startDow = start.getDay(); // day of week for Jan 1

    // pad start
    let week = document.createElement('div');
    week.className = 'heatmap-week';
    for (let i=0; i<startDow; i++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell hm-0';
      week.appendChild(cell);
    }

    for (let m=0; m<12; m++) {
      const days = daysInMonth(YEAR, m);
      for (let d=1; d<=days; d++) {
        const s   = `${YEAR}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cnt = State.completedCount(s);
        const lvl = cnt === 0 ? 0
                  : cnt <= 1  ? 1
                  : cnt <= 2  ? 2
                  : cnt <= 3  ? 3 : 4;

        const cell = document.createElement('div');
        cell.className = `heatmap-cell hm-${lvl}`;
        cell.title = `${formatDate(s)}: ${cnt} habits`;
        cell.addEventListener('click', () => {
          State.currentMonth = m;
          State.view = 'month';
          UI.setView('month');
          Calendar.selectDay(s, null);
        });
        cell.addEventListener('mouseenter', e => Tooltip.show(e, s));
        cell.addEventListener('mousemove',  e => Tooltip.move(e));
        cell.addEventListener('mouseleave', () => Tooltip.hide());

        week.appendChild(cell);

        const dow = new Date(YEAR,m,d).getDay();
        if (dow === 6) { // Saturday — end of week
          hm.appendChild(week);
          week = document.createElement('div');
          week.className = 'heatmap-week';
        }
      }
    }
    if (week.children.length > 0) hm.appendChild(week);
  },
};

/* ─── UI ──────────────────────────────────────────────────── */
const UI = {
  init() {
    this.bindNav();
    this.bindTheme();
    this.bindSearch();
    this.bindExport();
    this.bindPopup();
    this.bindAddHabit();
    this.bindSaveDay();
    this.bindKeyboard();
    this.bindNotification();
    this.bindWater();
    this.applyTheme();
  },

  setView(v) {
    State.view = v;
    document.getElementById('monthView').classList.toggle('hidden', v !== 'month');
    document.getElementById('yearView' ).classList.toggle('hidden', v !== 'year');
    document.getElementById('calControls').classList.toggle('hidden', v !== 'month');
    document.getElementById('btnMonthView').classList.toggle('active', v === 'month');
    document.getElementById('btnYearView' ).classList.toggle('active', v === 'year');
    Calendar.render();
  },

  bindNav() {
    document.getElementById('prevMonth').addEventListener('click', () => Calendar.goMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => Calendar.goMonth(+1));
    const pY = document.getElementById('prevYear');
    if (pY) pY.addEventListener('click', () => Calendar.goYear(-1));
    const nY = document.getElementById('nextYear');
    if (nY) nY.addEventListener('click', () => Calendar.goYear(+1));
    const pYV = document.getElementById('prevYearView');
    if (pYV) pYV.addEventListener('click', () => Calendar.goYear(-1));
    const nYV = document.getElementById('nextYearView');
    if (nYV) nYV.addEventListener('click', () => Calendar.goYear(+1));
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) todayBtn.addEventListener('click', () => goToday());
    const jumpTodayBtn = document.getElementById('jumpTodayBtn');
    if (jumpTodayBtn) jumpTodayBtn.addEventListener('click', () => goToday());
    document.getElementById('btnMonthView').addEventListener('click', () => this.setView('month'));
    document.getElementById('btnYearView' ).addEventListener('click', () => this.setView('year'));
  },

  bindTheme() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      State.theme = State.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
      State.save();
    });
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', State.theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = State.theme === 'dark' ? '🌙' : '☀️';
  },

  bindSearch() {
    const inp = document.getElementById('searchInput');
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.searchDate(inp.value.trim());
    });
  },

  searchDate(query) {
    query = query.replace(/\s+/g,' ').trim();
    let d = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(query)) {
      d = new Date(query + 'T00:00:00');
    } else {
      const months = MONTH_NAMES.map(m => m.toLowerCase());
      const parts  = query.split(' ');
      let dayN, monthN, yearN;
      parts.forEach(p => {
        const num = parseInt(p);
        if (!isNaN(num) && num >= 1 && num <= 31 && !dayN)   dayN  = num;
        if (!isNaN(num) && num >= 1900 && num <= 2100)        yearN = num;
        const mi = months.indexOf(p.toLowerCase());
        if (mi !== -1) monthN = mi;
      });
      const targetYear = yearN || State.currentYear;
      if (dayN !== undefined && monthN !== undefined) {
        d = new Date(targetYear, monthN, dayN);
      }
    }

    if (!d || isNaN(d.getTime())) {
      showToast('Date not found. Try "20 July 2026" or "2026-07-20"'); return;
    }

    State.currentYear  = d.getFullYear();
    State.currentMonth = d.getMonth();
    State.save();
    const s = dateStr(d);
    this.setView('month');
    Calendar.selectDay(s, null);
    showToast(`📅 Jumped to ${formatDate(s)}`);
    document.getElementById('searchInput').value = '';
  },

  bindExport() {
    const btn  = document.getElementById('exportMenuBtn');
    const drop = document.getElementById('exportDropdown');
    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('open'); });
    document.addEventListener('click', () => drop.classList.remove('open'));
  },

  openDayPopup(s) {
    const overlay = document.getElementById('dayPopupOverlay');
    const title   = document.getElementById('popupDate');
    const habits  = document.getElementById('popupHabits');

    title.textContent   = formatDate(s);
    habits.innerHTML    = '';
    overlay.dataset.date = s;

    const day = State.data[s] || {};
    State.habits.forEach(h => {
      const row = document.createElement('div');
      row.className = 'popup-habit-row';
      row.innerHTML = `
        <input type="checkbox" id="ph_${h.id}" data-id="${h.id}" ${day[h.id]?'checked':''}>
        <span>${h.icon}</span>
        <label for="ph_${h.id}" style="cursor:pointer;flex:1">${h.name}</label>
      `;
      habits.appendChild(row);
    });

    overlay.classList.remove('hidden');
  },

  bindPopup() {
    document.getElementById('popupClose').addEventListener('click',  () => {
      document.getElementById('dayPopupOverlay').classList.add('hidden');
    });
    document.getElementById('dayPopupOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget)
        e.currentTarget.classList.add('hidden');
    });
    document.getElementById('savePopupBtn').addEventListener('click', () => {
      const s   = document.getElementById('dayPopupOverlay').dataset.date;
      const day = State.getDay(s);
      document.querySelectorAll('#popupHabits input[type=checkbox]').forEach(cb => {
        day[cb.dataset.id] = cb.checked;
      });
      State.save();
      Calendar.render();
      Habits.render();
      Stats.render();
      document.getElementById('dayPopupOverlay').classList.add('hidden');
      showToast('✓ Changes saved');
    });
  },

  bindAddHabit() {
    const overlay = document.getElementById('addHabitOverlay');
    document.getElementById('addHabitBtn').addEventListener('click',   () => overlay.classList.remove('hidden'));
    document.getElementById('addHabitClose').addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', e => { if (e.target===e.currentTarget) overlay.classList.add('hidden'); });

    // Preset chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const icon  = chip.dataset.icon;
        const name  = chip.dataset.name;
        const color = chip.dataset.color;
        document.getElementById('newHabitIcon').value  = icon;
        document.getElementById('newHabitName').value  = name;
        document.getElementById('newHabitColor').value = color;
      });
    });

    document.getElementById('saveHabitBtn').addEventListener('click', () => {
      const icon  = document.getElementById('newHabitIcon').value.trim() || '⭐';
      const name  = document.getElementById('newHabitName').value;
      const color = document.getElementById('newHabitColor').value;
      if (Habits.addNew(icon, name, color)) {
        overlay.classList.add('hidden');
        document.getElementById('newHabitIcon').value = '';
        document.getElementById('newHabitName').value = '';
        showToast(`${icon} "${name}" added!`);
        Calendar.render();
      }
    });
  },

  renderSelectedDay() {
    const s   = State.selectedDate;
    const lbl = document.getElementById('selectedDateLabel');
    const jumpBtn = document.getElementById('jumpTodayBtn');
    const today   = todayStr();

    if (lbl) {
      if (s) {
        const isToday = s === today;
        lbl.innerHTML = `${formatDate(s)} ${isToday ? '<span class="today-badge">TODAY</span>' : ''}`;
        if (jumpBtn) jumpBtn.classList.toggle('hidden', isToday);
      } else {
        lbl.textContent = 'Select a day';
        if (jumpBtn) jumpBtn.classList.add('hidden');
      }
    }

    if (!s) return;
    const day = State.data[s] || {};

    // Mood
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === day.mood);
    });

    // Water
    document.querySelectorAll('.water-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.ml) === day.water);
    });
    const waterVal = document.getElementById('waterVal');
    if (waterVal) waterVal.textContent = day.water ? `${day.water} ml` : '— ml';

    // Study Hours
    document.querySelectorAll('.study-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.hrs) === day.studyHours);
    });
    const sInp = document.getElementById('studyHoursInput');
    if (sInp) sInp.value = day.studyHours || '';

    // Weight / Duration / Notes
    const wInp = document.getElementById('weightInput');
    const dInp = document.getElementById('durationInput');
    const nInp = document.getElementById('dayNotes');
    if (wInp) wInp.value = day.weight || '';
    if (dInp) dInp.value = day.duration || '';
    if (nInp) nInp.value = day.notes || '';
  },

  bindSaveDay() {
    // Mood buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!State.selectedDate) { showToast('Select a date first 📅'); return; }
        const day = State.getDay(State.selectedDate);
        day.mood = day.mood === btn.dataset.mood ? null : btn.dataset.mood;
        State.save();
        this.renderSelectedDay();
        showToast(`Mood: ${day.mood || 'cleared'}`);
      });
    });

    // Water buttons
    document.querySelectorAll('.water-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!State.selectedDate) { showToast('Select a date first 📅'); return; }
        const day  = State.getDay(State.selectedDate);
        const ml   = parseInt(btn.dataset.ml);
        day.water  = day.water === ml ? null : ml;
        State.save();
        this.renderSelectedDay();
      });
    });

    // Study buttons
    document.querySelectorAll('.study-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!State.selectedDate) { showToast('Select a date first 📅'); return; }
        const day = State.getDay(State.selectedDate);
        const hrs = parseFloat(btn.dataset.hrs);
        day.studyHours = day.studyHours === hrs ? null : hrs;
        State.save();
        this.renderSelectedDay();
      });
    });

    // Save day button
    document.getElementById('saveDayBtn').addEventListener('click', () => {
      if (!State.selectedDate) { showToast('Select a date first 📅'); return; }
      const day = State.getDay(State.selectedDate);
      day.studyHours = parseFloat(document.getElementById('studyHoursInput').value) || null;
      day.weight     = parseFloat(document.getElementById('weightInput').value) || null;
      day.duration   = parseInt(document.getElementById('durationInput').value) || null;
      day.notes      = document.getElementById('dayNotes').value.trim() || null;
      State.save();
      showToast('✓ Day saved');
    });

    // Reset day button
    document.getElementById('resetDayBtn').addEventListener('click', () => {
      if (!State.selectedDate) return;
      if (!confirm(`Reset all data for ${formatDate(State.selectedDate)}?`)) return;
      delete State.data[State.selectedDate];
      State.save();
      Calendar.render();
      Habits.render();
      Stats.render();
      this.renderSelectedDay();
      showToast('Day reset');
    });
  },

  bindWater() {
    // handled in bindSaveDay
  },

  bindKeyboard() {
    document.addEventListener('keydown', e => {
      // ⌘K / Ctrl+K → focus search
      if ((e.metaKey||e.ctrlKey) && e.key==='k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      // Arrow keys navigate month
      if (e.key === 'ArrowLeft'  && !e.target.matches('input,textarea')) Calendar.goMonth(-1);
      if (e.key === 'ArrowRight' && !e.target.matches('input,textarea')) Calendar.goMonth(+1);
      // T = jump to today
      if (e.key === 't' && !e.target.matches('input,textarea')) {
        const today = todayStr();
        State.currentMonth = new Date().getMonth();
        UI.setView('month');
        Calendar.selectDay(today, null);
        showToast('Jumped to today 📅');
      }
      // Esc = close popups
      if (e.key === 'Escape') {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        document.getElementById('exportDropdown').classList.remove('open');
      }
    });
  },

  bindNotification() {
    document.getElementById('notifBtn').addEventListener('click', () => {
      if (!('Notification' in window)) { showToast('Notifications not supported'); return; }
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          showToast('Notifications enabled! 🔔');
          // Schedule daily reminder
          const now   = new Date();
          const target= new Date(); target.setHours(9,0,0,0);
          if (now > target) target.setDate(target.getDate()+1);
          const delay = target-now;
          setTimeout(() => {
            new Notification('HabitFlow 2026', {
              body: "Don't forget today's habits! 💪",
              icon: '📅'
            });
          }, delay);
        }
      });
    });
  },
};

/* ─── EXPORT & APP DOWNLOADS ─────────────────────────────── */
const App = {
  downloadAPK() {
    const a = document.createElement('a');
    a.href = './HabitFlow.apk';
    a.download = 'HabitFlow.apk';
    a.click();
    showToast('📱 Downloading HabitFlow.apk installer...');
  },

  installPWA() {
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.click();
  },

  exportCSV() {
    const rows = [['Date','Habit','Completed','Mood','Study(hrs)','Water(ml)','Weight(kg)','Duration(min)','Notes']];
    Object.entries(State.data).sort().forEach(([date, day]) => {
      State.habits.forEach(h => {
        rows.push([
          date, h.name, day[h.id] ? 'Yes' : 'No',
          day.mood||'', day.studyHours||'', day.water||'', day.weight||'', day.duration||'', day.notes||''
        ]);
      });
    });
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    this._download(blob, `habitflow_${State.currentYear}.csv`);
    showToast('📊 CSV exported');
  },

  exportPDF() {
    window.print();
    showToast('🖨 Print dialog opened');
  },

  backupJSON() {
    const data = { habits: State.habits, data: State.data, exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    this._download(blob, `habitflow_backup_${State.currentYear}.json`);
    showToast('💾 Backup saved');
  },

  restoreJSON() {
    document.getElementById('restoreFileInput').click();
  },

  resetYear() {
    if (!confirm(`Reset ALL data for year ${State.currentYear}? This cannot be undone.`)) return;
    const prefix = `${State.currentYear}-`;
    Object.keys(State.data).forEach(k => {
      if (k.startsWith(prefix)) delete State.data[k];
    });
    State.save();
    Calendar.render();
    Stats.render();
    UI.renderSelectedDay();
    showToast(`Year ${State.currentYear} reset ✓`);
  },

  _download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

/* ─── PRINT BUTTON ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  // JSON restore
  document.getElementById('restoreFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (obj.habits) State.habits = obj.habits;
        if (obj.data)   State.data   = obj.data;
        State.save();
        Calendar.render();
        Habits.render();
        FilterBar.render();
        Stats.render();
        showToast('✓ Backup restored!');
      } catch(err) {
        showToast('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
});

/* ─── GOOGLE AUTH & USER SYNC ───────────────────────────── */
const Auth = {
  currentUser: null,

  init() {
    this.currentUser = JSON.parse(localStorage.getItem('hf_google_user') || 'null');
    this.render();

    const gBtn = document.getElementById('googleAuthBtn');
    if (gBtn) gBtn.addEventListener('click', () => this.openModal());

    const cBtn = document.getElementById('googleAuthClose');
    if (cBtn) cBtn.addEventListener('click', () => this.closeModal());

    const sBtn = document.getElementById('signOutBtn');
    if (sBtn) sBtn.addEventListener('click', () => this.signOut());

    const overlay = document.getElementById('googleAuthOverlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal();
      });
    }

    window.handleGoogleCredentialResponse = (response) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        this.onSignInSuccess({
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          sub: payload.sub,
          picture: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.email)}`
        });
      } catch(e) {
        showToast('Google Sign-in failed');
      }
    };
  },

  openModal() {
    const overlay = document.getElementById('googleAuthOverlay');
    if (overlay) overlay.classList.remove('hidden');
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.prompt();
      } catch(e){}
    }
  },

  closeModal() {
    const overlay = document.getElementById('googleAuthOverlay');
    if (overlay) overlay.classList.add('hidden');
  },

  quickLogin(name, email) {
    const sub = 'g_' + btoa(email).replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    const picture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
    this.onSignInSuccess({ name, email, sub, picture });
  },

  handleCustomFormSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('googleEmailInput').value.trim();
    const name  = document.getElementById('googleNameInput').value.trim() || email.split('@')[0];
    if (!email) return;
    this.quickLogin(name, email);
  },

  onSignInSuccess(user) {
    this.currentUser = user;
    localStorage.setItem('hf_google_user', JSON.stringify(user));
    showToast(`Welcome, ${user.name}! ☁️ Account Synced`);
    this.closeModal();
    this.render();
    State.loadUserData();
  },

  signOut() {
    if (!confirm('Sign out of your Google Account?')) return;
    this.currentUser = null;
    localStorage.removeItem('hf_google_user');
    showToast('Signed out of Google Account');
    this.render();
    State.loadUserData();
  },

  render() {
    const gBtn   = document.getElementById('googleAuthBtn');
    const uProf  = document.getElementById('userProfile');
    const uAvatar= document.getElementById('userAvatar');
    const uName  = document.getElementById('userName');

    if (this.currentUser) {
      if (gBtn) gBtn.classList.add('hidden');
      if (uProf) uProf.classList.remove('hidden');
      if (uAvatar) uAvatar.src = this.currentUser.picture;
      if (uName) uName.textContent = this.currentUser.name;
    } else {
      if (gBtn) gBtn.classList.remove('hidden');
      if (uProf) uProf.classList.add('hidden');
    }
  }
};

/* ─── PWA APP INSTALL PROMPT ────────────────────────────── */
let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installAppBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredPwaPrompt) {
        showToast('App is ready! Tap "Add to Home Screen" on mobile 📲');
        return;
      }
      deferredPwaPrompt.prompt();
      const choice = await deferredPwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('HabitFlow App installed! 🎉');
        btn.classList.add('hidden');
      }
      deferredPwaPrompt = null;
    });
  }
});

/* ─── BOOT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  State.load();
  Tooltip.init();
  UI.init();
  FilterBar.render();
  Calendar.render();
  Habits.render();
  Stats.render();

  // Always select today's date on boot
  State.selectedDate = todayStr();
  State.currentMonth = new Date().getMonth();
  UI.renderSelectedDay();
  Calendar.render();
  Habits.render();

  // Scroll-animate stat bars on first view
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) Stats.render();
    });
  }, { threshold: 0.1 });
  const sg = document.getElementById('statsGrid');
  if (sg) io.observe(sg);

  // Keyboard shortcut hint
  console.log('HabitFlow Keyboard Shortcuts:\n  ← → : Navigate months\n  T   : Jump to today\n  ⌘K  : Focus search\n  Esc : Close popups');
});
