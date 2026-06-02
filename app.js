const API = 'https://script.google.com/macros/s/AKfycbz5bZI3j1HCOyAAPcUmQVTI0V8VKf7C4YyzLrM-NhnFctFYiG_yYsMam3fETwX45Pm2Sg/exec';

let currentChapter = 1;
let totalChapters = 1;
let pages = [];
let currentPage = 0;
let isFlipping = false;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
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
  select.addEventListener('change', () => loadChapter(parseInt(select.value)));
}

async function loadChapter(chapter) {
  currentChapter = chapter;
  currentPage = 0;
  document.getElementById('chapter-select').value = chapter;

  const data = await fetchJSON(`${API}?action=novel&chapter=${chapter}`);
  totalChapters = data.total;

  const content = data.content.replace(/\\n/g, '\n');
  const html = marked.parse(content);

  // 分頁：把 HTML 內容切成段落陣列
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const paragraphs = Array.from(temp.children);

  // 每頁最多幾個段落
  const PER_PAGE = 6;
  pages = [];
  for (let i = 0; i < paragraphs.length; i += PER_PAGE) {
    pages.push(paragraphs.slice(i, i + PER_PAGE).map(p => p.outerHTML).join(''));
  }

  document.getElementById('book-title').textContent = data.title;
  renderPage(0);
  loadComments(chapter);
}

function renderPage(index, direction = null) {
  const bookPage = document.getElementById('book-page');

  if (direction && pages.length > 1) {
    // 翻頁動畫
    bookPage.classList.add(direction === 'next' ? 'flip-out-left' : 'flip-out-right');
    setTimeout(() => {
      bookPage.classList.remove('flip-out-left', 'flip-out-right');
      currentPage = index;
      bookPage.innerHTML = pages[index] || '';
      bookPage.classList.add(direction === 'next' ? 'flip-in-right' : 'flip-in-left');
      setTimeout(() => bookPage.classList.remove('flip-in-right', 'flip-in-left'), 400);
      updateControls();
      isFlipping = false;
    }, 350);
  } else {
    currentPage = index;
    bookPage.innerHTML = pages[index] || '';
    updateControls();
    isFlipping = false;
  }
}

function updateControls() {
  document.getElementById('page-info').textContent =
    `第 ${currentPage + 1} 頁 / 共 ${pages.length} 頁`;
  document.getElementById('btn-prev-page').disabled = currentPage <= 0;
  document.getElementById('btn-next-page').disabled = currentPage >= pages.length - 1;
  document.getElementById('btn-prev-chapter').disabled = currentChapter <= 1;
  document.getElementById('btn-next-chapter').disabled = currentChapter >= totalChapters;
}

function nextPage() {
  if (isFlipping) return;
  if (currentPage < pages.length - 1) {
    isFlipping = true;
    renderPage(currentPage + 1, 'next');
  }
}

function prevPage() {
  if (isFlipping) return;
  if (currentPage > 0) {
    isFlipping = true;
    renderPage(currentPage - 1, 'prev');
  }
}

async function loadComments(chapter) {
  const data = await fetchJSON(`${API}?action=comments&chapter=${chapter}`);
  const list = document.getElementById('comments-list');
  if (!data.comments.length) {
    list.innerHTML = '<p style="color:#666688">還沒有留言，來留下第一則吧！</p>';
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

// 鍵盤翻頁
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextPage();
  if (e.key === 'ArrowLeft') prevPage();
});

// 觸控滑動翻頁
let touchStartX = 0;
document.getElementById('book-page') && document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextPage();
    else prevPage();
  }
});

document.getElementById('btn-prev-page').addEventListener('click', prevPage);
document.getElementById('btn-next-page').addEventListener('click', nextPage);
document.getElementById('btn-prev-chapter').addEventListener('click', () => {
  if (currentChapter > 1) loadChapter(currentChapter - 1);
});
document.getElementById('btn-next-chapter').addEventListener('click', () => {
  if (currentChapter < totalChapters) loadChapter(currentChapter + 1);
});

document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('nickname').value.trim();
  const message = document.getElementById('message').value.trim();
  if (!message) return;
  await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action: 'comment', chapter: currentChapter, nickname, message }),
  });
  document.getElementById('message').value = '';
  loadComments(currentChapter);
});

loadChapterList().then(() => loadChapter(1));
