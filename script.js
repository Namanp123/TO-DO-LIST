'use strict';

/* =========================================================
   DAYMARK - PERSONAL PLANNER
   ========================================================= */

/* ==================== HELPERS ==================== */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];


/* ==================== DATE FUNCTIONS ==================== */

function todayKey() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function keyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(key) {
  return dateFromKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}


/* ==================== DEFAULT DATA ==================== */

function createDefaultUser(username) {
  return {
    tasks: [],

    habits: [
      {
        id: 'water',
        name: 'Drink enough water',
        done: false
      },
      {
        id: 'move',
        name: 'Move for 10 minutes',
        done: false
      },
      {
        id: 'read',
        name: 'Read for 15 minutes',
        done: false
      }
    ],

    focusMinutes: 0,

    focusByDate: {},

    completedByDate: {},

    settings: {
      displayName: username,
      accent: '#698b61',
      accentDark: '#46643f',
      tint: '#e9f0e5',
      focusLength: 25
    }
  };
}


/* ==================== APPLICATION STATE ==================== */

let state;

try {
  state = JSON.parse(
    localStorage.getItem('daymarkState')
  );
} catch (error) {
  state = null;
}

if (!state) {
  state = {
    currentUser: null,
    accounts: {},
    data: {}
  };
}

let calendarDate = new Date();

let selectedDate = todayKey();

let timer = null;

let timerSeconds = 25 * 60;

let timerRunning = false;

let timerMinutes = 25;


/* ==================== STORAGE ==================== */

function saveState() {
  localStorage.setItem(
    'daymarkState',
    JSON.stringify(state)
  );
}


/* ==================== USER DATA ==================== */

function getUserData() {
  const username = state.currentUser;

  if (!username) {
    return null;
  }

  if (!state.data[username]) {
    state.data[username] =
      createDefaultUser(username);

    saveState();
  }

  const data = state.data[username];

  /* Safety for existing data */

  if (!Array.isArray(data.tasks)) {
    data.tasks = [];
  }

  if (!Array.isArray(data.habits)) {
    data.habits =
      createDefaultUser(username).habits;
  }

  if (!data.completedByDate) {
    data.completedByDate = {};
  }

  if (!data.focusByDate) {
    data.focusByDate = {};
  }

  if (!data.settings) {
    data.settings =
      createDefaultUser(username).settings;
  }

  if (!data.settings.displayName) {
    data.settings.displayName = username;
  }

  if (!data.settings.accent) {
    data.settings.accent = '#698b61';
  }

  if (!data.settings.accentDark) {
    data.settings.accentDark = '#46643f';
  }

  if (!data.settings.tint) {
    data.settings.tint = '#e9f0e5';
  }

  if (!data.settings.focusLength) {
    data.settings.focusLength = 25;
  }

  return data;
}


/* ==================== TOAST ==================== */

function showToast(message) {
  const toast = $('#toast');

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add('show');

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}


/* ==================== PAGE NAVIGATION ==================== */

function showPage(page) {
  $$('.page').forEach((element) => {
    element.classList.toggle(
      'active',
      element.id === `page-${page}`
    );
  });

  $$('.nav-link').forEach((element) => {
    element.classList.toggle(
      'active',
      element.dataset.page === page
    );
  });

  $('#breadcrumb').textContent =
    `Workspace / ${
      page.charAt(0).toUpperCase() +
      page.slice(1)
    }`;

  if (page === 'home') {
    renderHome();
  }

  if (page === 'calendar') {
    renderCalendar();
  }
}


/* ==================== OPEN APPLICATION ==================== */

function openApp() {
  $('#authScreen').classList.add('hidden');

  $('#app').classList.remove('hidden');

  const data = getUserData();

  const displayName =
    data.settings.displayName ||
    state.currentUser;

  $('#accountName').textContent =
    displayName;

  $('#avatar').textContent =
    displayName.charAt(0).toUpperCase();

  $('#settingsUsername').textContent =
    `Signed in as ${state.currentUser}`;

  $('#displayName').value =
    displayName;

  $('#focusLength').value =
    String(data.settings.focusLength || 25);

  applyTheme();

  updateDateUI();

  renderHome();

  renderCalendar();

  setTimerMinutes(
    Number(data.settings.focusLength || 25)
  );
}


/* ==================== LOGOUT ==================== */

function logout() {
  stopTimer(false);

  state.currentUser = null;

  saveState();

  $('#app').classList.add('hidden');

  $('#authScreen').classList.remove('hidden');

  $('#authError').textContent = '';

  $('#authForm').reset();

  showToast('Logged out');
}


/* ==================== DATE UI ==================== */

function updateDateUI() {
  const now = new Date();

  $('#datePill').textContent =
    now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  $('#todayHeading').textContent =
    now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).toUpperCase();
}


/* ==================== WEEK STRIP ==================== */

function renderWeek() {
  const container = $('#weekStrip');

  container.innerHTML = '';

  const today = new Date();

  const day = today.getDay();

  const mondayOffset =
    day === 0 ? -6 : 1 - day;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);

    date.setDate(
      today.getDate() +
      mondayOffset +
      i
    );

    const key = keyFromDate(date);

    const done =
      getUserData()
        .completedByDate[key] || 0;

    const element =
      document.createElement('div');

    element.className =
      `week-day ${
        key === todayKey()
          ? 'today'
          : ''
      }`;

    element.innerHTML = `
      <small>
        ${date.toLocaleDateString(
          undefined,
          { weekday: 'short' }
        )}
      </small>

      <strong>
        ${date.getDate()}
      </strong>

      <em>
        ${done} done
      </em>
    `;

    container.appendChild(element);
  }
}


/* ==================== TODAY'S TASKS ==================== */

function getTodayTasks() {
  return getUserData()
    .tasks
    .filter(
      task => task.date === todayKey()
    );
}


/* ==================== ESCAPE HTML ==================== */

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      };

      return map[character];
    }
  );
}


/* ==================== RENDER TASKS ==================== */

function renderTasks() {
  const list = $('#taskList');

  const tasks = getTodayTasks();

  list.innerHTML = '';

  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty">
        No tasks for today.
        Add one small thing to get started.
      </div>
    `;

    return;
  }

  tasks.forEach((task) => {
    const row =
      document.createElement('div');

    row.className =
      `task-row ${
        task.done ? 'done' : ''
      }`;

    row.innerHTML = `
      <input
        class="task-check"
        type="checkbox"
        ${task.done ? 'checked' : ''}
        aria-label="Complete task"
      >

      <span class="task-name"></span>

      <span class="tag ${
        task.category === 'Health'
          ? 'health'
          : ''
      }">
        ${escapeHtml(
          task.category || 'Personal'
        )}
      </span>
    `;

    row.querySelector(
      '.task-name'
    ).textContent = task.name;

    row.querySelector(
      '.task-check'
    ).addEventListener(
      'change',
      (event) => {
        task.done =
          event.target.checked;

        updateCompletedCount();

        saveState();

        renderHome();

        renderCalendar();
      }
    );

    list.appendChild(row);
  });
}


/* ==================== COMPLETED COUNT ==================== */

function updateCompletedCount() {
  const tasks = getTodayTasks();

  getUserData().completedByDate[
    todayKey()
  ] =
    tasks.filter(
      task => task.done
    ).length;

  saveState();
}

function updateCompletedCountFor(dateKey) {
  getUserData().completedByDate[dateKey] =
    getUserData()
      .tasks
      .filter(
        task =>
          task.date === dateKey &&
          task.done
      )
      .length;
}


/* ==================== HABITS ==================== */

function renderHabits() {
  const list = $('#habitList');

  list.innerHTML = '';

  getUserData().habits.forEach(
    (habit) => {
      const row =
        document.createElement('div');

      row.className =
        `task-row ${
          habit.done ? 'done' : ''
        }`;

      row.innerHTML = `
        <input
          class="task-check"
          type="checkbox"
          ${habit.done ? 'checked' : ''}
        >

        <span class="task-name"></span>
      `;

      row.querySelector(
        '.task-name'
      ).textContent = habit.name;

      row.querySelector(
        '.task-check'
      ).addEventListener(
        'change',
        (event) => {
          habit.done =
            event.target.checked;

          saveState();

          renderHome();
        }
      );

      list.appendChild(row);
    }
  );
}


/* ==================== WEEKLY CHART ==================== */

function renderChart() {
  const chart = $('#weeklyChart');

  chart.innerHTML = '';

  const today = new Date();

  const day = today.getDay();

  const mondayOffset =
    day === 0 ? -6 : 1 - day;

  const values = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);

    date.setDate(
      today.getDate() +
      mondayOffset +
      i
    );

    const key =
      keyFromDate(date);

    values.push({
      key,
      day:
        date.toLocaleDateString(
          undefined,
          {
            weekday: 'short'
          }
        ).slice(0, 1),
      count:
        getUserData()
          .completedByDate[key] || 0
    });
  }

  const max =
    Math.max(
      1,
      ...values.map(
        value => value.count
      )
    );

  values.forEach((value) => {
    const column =
      document.createElement('div');

    column.className =
      'chart-column';

    const bar =
      document.createElement('div');

    bar.className =
      `chart-bar ${
        value.key === todayKey()
          ? 'current'
          : ''
      }`;

    bar.style.height =
      `${Math.max(
        5,
        value.count / max * 100
      )}%`;

    const label =
      document.createElement('small');

    label.textContent =
      value.day;

    column.appendChild(bar);

    column.appendChild(label);

    chart.appendChild(column);
  });
}


/* ==================== STREAK ==================== */

function calculateStreak() {
  let streak = 0;

  const date = new Date();

  while (true) {
    const key =
      keyFromDate(date);

    const done =
      getUserData()
        .completedByDate[key] || 0;

    if (!done) {
      break;
    }

    streak++;

    date.setDate(
      date.getDate() - 1
    );
  }

  return streak;
}


/* ==================== HOME ==================== */

function renderHome() {
  if (!state.currentUser) {
    return;
  }

  const data = getUserData();

  const tasks = getTodayTasks();

  const completed =
    tasks.filter(
      task => task.done
    ).length;

  const progress =
    tasks.length
      ? Math.round(
          completed /
          tasks.length *
          100
        )
      : 0;

  const habitsDone =
    data.habits.filter(
      habit => habit.done
    ).length;

  $('#taskCount').textContent =
    `${completed} / ${tasks.length}`;

  $('#taskPercent').textContent =
    tasks.length
      ? `${progress}% complete`
      : 'For today';

  $('#progressText').textContent =
    `${progress}%`;

  $('#progressFill').style.width =
    `${progress}%`;

  $('#focusCount').textContent =
    `${data.focusMinutes || 0} min`;

  $('#habitCount').textContent =
    `${habitsDone} / ${data.habits.length}`;

  $('#streakCount').textContent =
    `${calculateStreak()} days`;

  renderWeek();

  renderTasks();

  renderHabits();

  renderChart();
}


/* ==================== ADD TASK ==================== */

function addTask() {
  const name =
    prompt('Task name:');

  if (!name || !name.trim()) {
    return;
  }

  const category =
    prompt(
      'Category (Personal, Health, Study, Work):',
      'Personal'
    ) || 'Personal';

  const dateInput =
    prompt(
      'Date (YYYY-MM-DD):',
      selectedDate || todayKey()
    ) || todayKey();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    showToast(
      'Please use YYYY-MM-DD for the date.'
    );

    return;
  }

  const task = {
    id: Date.now(),
    name: name.trim(),
    category:
      category.trim() || 'Personal',
    date: dateInput,
    done: false
  };

  getUserData().tasks.push(task);

  saveState();

  renderHome();

  renderCalendar();

  showToast('Task added');
}


/* ==================== CALENDAR ==================== */

function renderCalendar() {
  if (!state.currentUser) {
    return;
  }

  const grid =
    $('#calendarGrid');

  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  $('#monthTitle').textContent =
    calendarDate.toLocaleDateString(
      undefined,
      {
        month: 'long',
        year: 'numeric'
      }
    );

  grid.innerHTML = '';

  const weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun'
  ];

  weekdays.forEach((name) => {
    const label =
      document.createElement('div');

    label.className =
      'calendar-label';

    label.textContent =
      name;

    grid.appendChild(label);
  });

  const first =
    new Date(
      year,
      month,
      1
    );

  const firstDay =
    (first.getDay() + 6) % 7;

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const previousMonthDays =
    new Date(
      year,
      month,
      0
    ).getDate();

  for (let i = 0; i < 42; i++) {
    let dateNumber =
      i - firstDay + 1;

    let date;

    let muted = false;

    if (dateNumber < 1) {
      date =
        new Date(
          year,
          month - 1,
          previousMonthDays +
          dateNumber
        );

      muted = true;
    }

    else if (
      dateNumber > daysInMonth
    ) {
      date =
        new Date(
          year,
          month + 1,
          dateNumber -
          daysInMonth
        );

      muted = true;
    }

    else {
      date =
        new Date(
          year,
          month,
          dateNumber
        );
    }

    const key =
      keyFromDate(date);

    const day =
      document.createElement('button');

    day.type = 'button';

    day.className =
      `calendar-day
       ${muted ? 'muted-day' : ''}
       ${key === todayKey() ? 'today' : ''}
       ${key === selectedDate ? 'selected' : ''}`;

    const number =
      document.createElement('span');

    number.textContent =
      date.getDate();

    day.appendChild(number);

    const tasks =
      getUserData()
        .tasks
        .filter(
          task =>
            task.date === key
        )
        .slice(0, 3);

    tasks.forEach((task) => {
      const event =
        document.createElement('span');

      event.className =
        'calendar-event';

      event.textContent =
        task.name;

      day.appendChild(event);
    });

    day.addEventListener(
      'click',
      () => {
        selectedDate = key;

        renderCalendar();
      }
    );

    grid.appendChild(day);
  }

  renderAgenda();
}


/* ==================== CALENDAR AGENDA ==================== */

function renderAgenda() {
  $('#selectedDateTitle').textContent =
    formatDate(selectedDate);

  const agenda =
    $('#calendarAgenda');

  const tasks =
    getUserData()
      .tasks
      .filter(
        task =>
          task.date === selectedDate
      );

  agenda.innerHTML = '';

  if (!tasks.length) {
    agenda.innerHTML = `
      <div class="empty">
        No tasks planned for this day.
      </div>
    `;

    return;
  }

  tasks.forEach((task) => {
    const row =
      document.createElement('div');

    row.className =
      `task-row ${
        task.done ? 'done' : ''
      }`;

    row.innerHTML = `
      <input
        class="task-check"
        type="checkbox"
        ${task.done ? 'checked' : ''}
      >

      <span class="task-name"></span>

      <span class="tag ${
        task.category === 'Health'
          ? 'health'
          : ''
      }">
        ${escapeHtml(task.category)}
      </span>
    `;

    row.querySelector(
      '.task-name'
    ).textContent =
      task.name;

    row.querySelector(
      '.task-check'
    ).addEventListener(
      'change',
      (event) => {
        task.done =
          event.target.checked;

        updateCompletedCountFor(
          task.date
        );

        saveState();

        renderCalendar();

        renderHome();
      }
    );

    agenda.appendChild(row);
  });
}


/* ==================== THEME ==================== */

function applyTheme() {
  const settings =
    getUserData().settings;

  document.documentElement
    .style
    .setProperty(
      '--accent',
      settings.accent
    );

  document.documentElement
    .style
    .setProperty(
      '--accent-dark',
      settings.accentDark
    );

  document.documentElement
    .style
    .setProperty(
      '--tint',
      settings.tint
    );
}


function setTheme(button) {
  const data =
    getUserData();

  data.settings.accent =
    button.dataset.color;

  data.settings.accentDark =
    button.dataset.dark;

  data.settings.tint =
    button.dataset.tint;

  saveState();

  applyTheme();

  showToast(
    `${button.getAttribute(
      'aria-label'
    )} theme selected`
  );
}


/* ==================== TIMER ==================== */

function updateTimerDisplay() {
  const minutes =
    Math.floor(
      timerSeconds / 60
    )
      .toString()
      .padStart(2, '0');

  const seconds =
    (timerSeconds % 60)
      .toString()
      .padStart(2, '0');

  $('#timerDisplay').textContent =
    `${minutes}:${seconds}`;
}


function stopTimer(countFocus = false) {
  if (timer) {
    clearInterval(timer);
  }

  timer = null;

  if (
    countFocus &&
    state.currentUser
  ) {
    const data =
      getUserData();

    data.focusMinutes =
      (data.focusMinutes || 0) +
      timerMinutes;

    const key =
      todayKey();

    data.focusByDate[key] =
      (data.focusByDate[key] || 0) +
      timerMinutes;

    saveState();

    renderHome();
  }

  timerRunning = false;
}


function resetTimer() {
  stopTimer(false);

  timerSeconds =
    timerMinutes * 60;

  updateTimerDisplay();

  $('#timerStart').textContent =
    'Start focus';

  $('#timerStatus').textContent =
    'Ready when you are';
}


function startTimer() {
  if (timerRunning) {
    stopTimer(false);

    $('#timerStart').textContent =
      'Start focus';

    $('#timerStatus').textContent =
      'Paused';

    return;
  }

  if (timerSeconds <= 0) {
    resetTimer();
  }

  timerRunning = true;

  $('#timerStart').textContent =
    'Pause';

  $('#timerStatus').textContent =
    'Focus in progress';

  timer = setInterval(
    () => {
      timerSeconds--;

      updateTimerDisplay();

      if (timerSeconds <= 0) {
        stopTimer(true);

        $('#timerStart').textContent =
          'Start focus';

        $('#timerStatus').textContent =
          'Session complete — nice work!';

        showToast(
          `${timerMinutes}-minute session complete`
        );

        resetTimer();
      }
    },
    1000
  );
}


function setTimerMinutes(minutes) {
  timerMinutes =
    Number(minutes);

  resetTimer();

  $$('.mode').forEach(
    button => {
      button.classList.toggle(
        'active',
        Number(
          button.dataset.minutes
        ) === timerMinutes
      );
    }
  );
}


/* ==================== INITIALIZATION ==================== */

function init() {

  /* ---------- AUTH FORM ---------- */

  $('#authForm').addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      const username =
        $('#authUsername')
          .value
          .trim();

      const password =
        $('#authPassword')
          .value;

      $('#authError').textContent =
        '';

      if (
        username.length < 3 ||
        password.length < 4
      ) {
        $('#authError').textContent =
          'Username must be at least 3 characters and password at least 4 characters.';

        return;
      }

      /*
        If account does not exist,
        create it.
      */

      if (!state.accounts[username]) {

        state.accounts[username] =
          password;

        state.currentUser =
          username;

        saveState();

        openApp();

        showToast(
          'Account created'
        );

        return;
      }

      /*
        Existing account:
        check password.
      */

      if (
        state.accounts[username] !==
        password
      ) {
        $('#authError').textContent =
          'Incorrect username or password.';

        return;
      }

      state.currentUser =
        username;

      saveState();

      openApp();

      showToast(
        'Welcome back!'
      );
    }
  );


  /* ---------- AUTH SWITCH ---------- */

  $('#authSwitch').addEventListener(
    'click',
    () => {

      const creating =
        $('#authSubmit').textContent ===
        'Sign in';

      $('#authSubmit').textContent =
        creating
          ? 'Create account'
          : 'Sign in';

      $('#authTitle').textContent =
        creating
          ? 'Create your space.'
          : 'Welcome back.';

      $('#authSubtitle').textContent =
        creating
          ? 'Set up your personal planner.'
          : 'Sign in to continue with your day.';

      $('#authSwitchText').textContent =
        creating
          ? 'Already have an account?'
          : 'New to Daymark?';

      $('#authSwitch').textContent =
        creating
          ? 'Sign in'
          : 'Create an account';

      $('#authPassword').autocomplete =
        creating
          ? 'new-password'
          : 'current-password';

      $('#authError').textContent =
        '';
    }
  );


  /* ---------- NAVIGATION ---------- */

  $$('.nav-link').forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          showPage(
            button.dataset.page
          );

        }
      );

    }
  );


  /* ---------- SIDEBAR FOCUS BUTTON ---------- */

  $$('[data-goto]').forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          showPage(
            button.dataset.goto
          );

        }
      );

    }
  );


  /* ---------- ADD TASK ---------- */

  $('#addTaskButton')
    .addEventListener(
      'click',
      addTask
    );

  $('#calendarAddButton')
    .addEventListener(
      'click',
      addTask
    );


  /* ---------- CLEAR COMPLETED ---------- */

  $('#clearDoneButton')
    .addEventListener(
      'click',
      () => {

        const data =
          getUserData();

        const oldLength =
          data.tasks.length;

        data.tasks =
          data.tasks.filter(
            task =>
              !(
                task.date === todayKey() &&
                task.done
              )
          );

        updateCompletedCount();

        saveState();

        renderHome();

        renderCalendar();

        if (
          data.tasks.length ===
          oldLength
        ) {
          showToast(
            'No completed tasks'
          );
        } else {
          showToast(
            'Completed tasks cleared'
          );
        }
      }
    );


  /* ---------- CALENDAR NAVIGATION ---------- */

  $('#prevMonth')
    .addEventListener(
      'click',
      () => {

        calendarDate.setMonth(
          calendarDate.getMonth() - 1
        );

        renderCalendar();

      }
    );


  $('#nextMonth')
    .addEventListener(
      'click',
      () => {

        calendarDate.setMonth(
          calendarDate.getMonth() + 1
        );

        renderCalendar();

      }
    );


  /* ---------- LOGOUT ---------- */

  $('#logoutButton')
    .addEventListener(
      'click',
      logout
    );

  $('#settingsLogout')
    .addEventListener(
      'click',
      logout
    );


  /* ---------- ACCENT COLORS ---------- */

  $$('.swatch').forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          setTheme(button);

        }
      );

    }
  );


  /* ---------- DISPLAY NAME ---------- */

  $('#displayName')
    .addEventListener(
      'change',
      () => {

        const value =
          $('#displayName')
            .value
            .trim();

        if (!value) {
          return;
        }

        getUserData()
          .settings
          .displayName =
          value;

        saveState();

        $('#accountName')
          .textContent =
          value;

        $('#avatar')
          .textContent =
          value
            .charAt(0)
            .toUpperCase();

        showToast(
          'Display name updated'
        );
      }
    );


  /* ---------- FOCUS LENGTH ---------- */

  $('#focusLength')
    .addEventListener(
      'change',
      () => {

        const minutes =
          Number(
            $('#focusLength').value
          );

        getUserData()
          .settings
          .focusLength =
          minutes;

        saveState();

        if (!timerRunning) {
          setTimerMinutes(
            minutes
          );
        }

        showToast(
          `Focus length set to ${minutes} minutes`
        );
      }
    );


  /* ---------- TIMER MODES ---------- */

  $$('.mode').forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          setTimerMinutes(
            button.dataset.minutes
          );

        }
      );

    }
  );


  /* ---------- TIMER CONTROLS ---------- */

  $('#timerStart')
    .addEventListener(
      'click',
      startTimer
    );

  $('#timerReset')
    .addEventListener(
      'click',
      resetTimer
    );


  /* ---------- RESTORE LOGIN ---------- */

  if (
    state.currentUser &&
    state.accounts[state.currentUser]
  ) {

    openApp();

  } else {

    updateDateUI();

    resetTimer();

  }

}


/* ==================== START APPLICATION ==================== */

document.addEventListener(
  'DOMContentLoaded',
  init
);