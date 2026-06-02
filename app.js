const API = 'https://script.google.com/macros/s/AKfycbz5bZI3j1HCOyAAPcUmQVTI0V8VKf7C4YyzLrM-NhnFctFYiG_yYsMam3fETwX45Pm2Sg/exec';

const CHARS_PER_PAGE = 320;

let currentChapter = 1;
let totalChapters = 1;
let currentChapterTitle = '';
let pages = [];
let currentPage = 0;
let isAnimating = false;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function splitIntoPages(content) {
  const raw = content.replace(/\\n/g, '\n');
  const paragraphs = raw.split(/\n+/).filter(p => p.trim());
  const result = [];
  let current = [];
  let count = 0;

  for (const p of paragraphs) {
    current.push(p);
    count += p.length;
    if (count >= CHARS_PER_PAGE) {
      result.push(current);
      current = [];
      count = 0;
    }
  }
  if (current.length) result.push(current);
  return result;
}

function renderPage(pageIndex) {
  const pageText = document.getElementById('page-text');
  const titleEl = document.getElementById('chapter-title-display');
  const pageNum = document.getElementById('page-num-display');
  const pageInfo = document.getElementById('page-info');

  titleEl.textContent = currentChapterTitle;
  pageText.innerHTML = pages[pageIndex]
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('');

  const totalPages = pages.length;
  pageNum.textContent = `— ${pageIndex + 1} —`;
  pageInfo.textContent = `第 ${currentChapter} 章　第 ${pageIndex + 1} 頁 / 共 ${totalPages} 頁`;

  document.getElementById('btn-prev').disabled = (currentChapter === 1 && pageIndex === 0);
  document.getElementById('btn-next').disabled = (currentChapter === totalChapters && pageIndex === totalPages - 1);
}

async function loadChapter(chapter) {
  const data = await fetchJSON(`${API}?action=novel&chapter=${chapter}`);
  totalChapters = data.total;
  currentChapterTitle = data.title;
  pages = splitIntoPages(data.content);
  document.getElementById('chapter-select').value = chapter;
  loadComments(chapter);
}

async function flipPage(direction) {
  if (isAnimating) return;
  isAnimating = true;

  const flipper = document.getElementById('page-flipper');
  const nextPageEl = document.getElementById('next-page-text');

  let nextPageIndex = currentPage + (direction === 'forward' ? 1 : -1);
  let nextChapter = currentChapter;

  if (direction === 'forward' && nextPageIndex >= pages.length) {
    nextChapter = currentChapter + 1;
    if (nextChapter > totalChapters) { isAnimating = false; return; }
    await loadChapter(nextChapter);
    nextPageIndex = 0;
  } else if (direction === 'backward' && nextPageIndex < 0) {
    nextChapter = currentChapter - 1;
    if (nextChapter < 1) { isAnimating = false; return; }
    await loadChapter(nextChapter);
    nextPageIndex = pages.length - 1;
  }

  nextPageEl.innerHTML = pages[nextPageIndex]
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('');

  const animClass = direction === 'forward' ? 'flipping-forward' : 'flipping-backward';
  flipper.classList.add(animClass);

  setTimeout(() => {
    currentChapter = nextChapter;
    currentPage = nextPageIndex;
    renderPage(currentPage);
  }, 300);

  setTimeout(() => {
    flipper.classList.remove(animClass);
    isAnimating = false;
  }, 620);
}

async function loadChapterList() {
  const data = await fetchJSON(`${API}?action=chapters`);
  const select = document.getElementById('chapter-select');
  select.innerHTML = '';
  data.chapters.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch.chapter;
    opt.textContent = `第 ${ch.chapter} 章　${ch.title}`;
    select.appendChild(opt);
  });
  select.addEventListener('change', async () => {
    const target = parseInt(select.value);
    await loadChapter(target);
    currentChapter = target;
    currentPage = 0;
    renderPage(0);
  });
}

async function loadComments(chapter) {
  const data = await fetchJSON(`${API}?action=comments&chapter=${chapter}`);
  const list = document.getElementById('comments-list');
  if (!data.comments.length) {
    list.innerHTML = '<p style="color:#445566;font-size:0.9rem">還沒有留言，來留下第一則吧！</p>';
    return;
  }
  list.innerHTML = data.comments.map(c => `
    <div class="comment-item">
      <div class="name">${escapeHtml(c.nickname)}</div>
      <div class="text">${escapeHtml(c.message)}</div>
      <div class="time">${new Date(c.timestamp).toLocaleString('zh-TW')}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.getElementById('btn-prev').addEventListener('click', () => flipPage('backward'));
document.getElementById('btn-next').addEventListener('click', () => flipPage('forward'));

document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('nickname').value.trim();
  const message  = document.getElementById('message').value.trim();
  if (!message) return;
  await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action: 'comment', chapter: currentChapter, nickname, message }),
  });
  document.getElementById('message').value = '';
  loadComments(currentChapter);
});

(async () => {
  await loadChapterList();
  await loadChapter(1);
  currentChapter = 1;
  currentPage = 0;
  renderPage(0);
})();
