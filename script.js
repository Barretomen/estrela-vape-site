const ageGate = document.getElementById('ageGate');
const confirmAge = document.getElementById('confirmAge');
const leaveSite = document.getElementById('leaveSite');
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
const toTop = document.getElementById('toTop');
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.gallery-card');
const filterLinks = document.querySelectorAll('[data-filter-link]');
const openState = document.getElementById('openState');
const openDetail = document.getElementById('openDetail');
const statusClock = document.getElementById('statusClock');
const miniStatus = document.getElementById('miniStatus');
const liveDot = document.querySelector('.live-dot');

const TZ = 'Europe/Lisbon';
const MINUTE = 60 * 1000;

const schedule = {
  1: { start: '12:30', end: '20:00', label: 'Segunda-feira' },
  2: { start: '12:30', end: '20:00', label: 'Terça-feira' },
  3: { start: '12:30', end: '20:00', label: 'Quarta-feira' },
  4: { start: '12:30', end: '20:00', label: 'Quinta-feira' },
  5: { start: '12:30', end: '20:00', label: 'Sexta-feira' },
  6: { start: '14:00', end: '19:00', label: 'Sábado' },
  0: null
};

function pad(number) {
  return String(number).padStart(2, '0');
}

function lisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-PT', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, hour, minute, second, dayOfWeek };
}

function minutesFromTime(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function isoMonthDayFromDateUTC(date) {
  return `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDaysUTC(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function portugueseHolidays(year) {
  const fixed = new Set(['01-01', '04-25', '05-01', '06-10', '08-15', '10-05', '11-01', '12-01', '12-08', '12-25']);
  const easter = easterSunday(year);
  fixed.add(isoMonthDayFromDateUTC(addDaysUTC(easter, -2))); // Sexta-feira Santa
  fixed.add(isoMonthDayFromDateUTC(addDaysUTC(easter, 60))); // Corpo de Deus
  return fixed;
}

function isHoliday(parts) {
  return portugueseHolidays(parts.year).has(`${pad(parts.month)}-${pad(parts.day)}`);
}

function scheduleFor(parts) {
  if (isHoliday(parts)) return null;
  return schedule[parts.dayOfWeek];
}

function statusFor(date = new Date()) {
  const parts = lisbonParts(date);
  const daySchedule = scheduleFor(parts);
  const nowMinutes = parts.hour * 60 + parts.minute;

  if (!daySchedule) {
    return { open: false, parts, reason: isHoliday(parts) ? 'feriado' : 'dia encerrado', daySchedule };
  }

  const start = minutesFromTime(daySchedule.start);
  const end = minutesFromTime(daySchedule.end);
  const open = nowMinutes >= start && nowMinutes < end;
  return { open, parts, daySchedule, start, end, nowMinutes, reason: open ? 'aberto' : 'fora do horário' };
}

function nextOpeningText(from = new Date()) {
  for (let i = 0; i < 15; i++) {
    const probe = new Date(from.getTime() + i * 24 * 60 * MINUTE);
    const parts = lisbonParts(probe);
    const daySchedule = scheduleFor(parts);
    if (!daySchedule) continue;

    const nowMinutes = i === 0 ? parts.hour * 60 + parts.minute : 0;
    const start = minutesFromTime(daySchedule.start);
    if (i > 0 || nowMinutes < start) {
      const label = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : `${daySchedule.label}, ${pad(parts.day)}/${pad(parts.month)}`;
      return `Abre ${label} às ${daySchedule.start}.`;
    }
  }
  return 'Consulta a loja para confirmar o próximo horário de abertura.';
}

function updateRows(parts) {
  document.querySelectorAll('[data-day-row]').forEach(row => row.classList.remove('today'));
  if (isHoliday(parts)) {
    document.querySelector('[data-day-row="holiday"]')?.classList.add('today');
    return;
  }
  if (parts.dayOfWeek >= 1 && parts.dayOfWeek <= 5) document.querySelector('[data-day-row="weekday"]')?.classList.add('today');
  if (parts.dayOfWeek === 6) document.querySelector('[data-day-row="sat"]')?.classList.add('today');
  if (parts.dayOfWeek === 0) document.querySelector('[data-day-row="sun"]')?.classList.add('today');
}

function refreshStatus() {
  const status = statusFor();
  const { parts } = status;
  const now = `${pad(parts.hour)}:${pad(parts.minute)}`;
  statusClock.textContent = now;
  updateRows(parts);

  openState.classList.remove('open', 'closed');
  liveDot?.classList.remove('open', 'closed');

  if (status.open) {
    openState.textContent = 'aberta';
    openState.classList.add('open');
    liveDot?.classList.add('open');
    openDetail.textContent = `Hoje fecha às ${status.daySchedule.end}. Horário local de Portugal Continental.`;
    miniStatus.textContent = `Aberto agora · fecha às ${status.daySchedule.end}`;
  } else {
    openState.textContent = 'fechada';
    openState.classList.add('closed');
    liveDot?.classList.add('closed');
    const reason = status.reason === 'feriado' ? 'Hoje é feriado.' : 'Neste momento está fora do horário.';
    const next = nextOpeningText();
    openDetail.textContent = `${reason} ${next}`;
    miniStatus.textContent = `Fechado agora · ${next}`;
  }
}

function setFilter(filter) {
  filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  cards.forEach(card => {
    const match = filter === 'all' || card.dataset.category === filter;
    card.classList.toggle('hidden', !match);
  });
}

if (localStorage.getItem('estrela-age-ok') === 'true') {
  ageGate.classList.add('hidden');
} else {
  document.body.classList.add('no-scroll');
}

confirmAge?.addEventListener('click', () => {
  localStorage.setItem('estrela-age-ok', 'true');
  ageGate.classList.add('hidden');
  document.body.classList.remove('no-scroll');
});

leaveSite?.addEventListener('click', () => {
  window.location.href = 'about:blank';
});

navToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

filters.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

filterLinks.forEach(link => {
  link.addEventListener('click', () => {
    const filter = link.dataset.filterLink;
    setFilter(filter);
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

window.addEventListener('scroll', () => {
  toTop.classList.toggle('visible', window.scrollY > 640);
});

toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

refreshStatus();
setInterval(refreshStatus, 30 * 1000);
