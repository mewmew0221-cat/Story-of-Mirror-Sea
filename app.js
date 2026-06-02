const API = 'https://script.google.com/macros/s/AKfycbz5bZI3j1HCOyAAPcUmQVTI0V8VKf7C4YyzLrM-NhnFctFYiG_yYsMam3fETwX45Pm2Sg/exec';

let currentChapter = 1;
let totalChapters = 1;

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
  document.getElementById('chapter-select').value = chapter;

  const data = await fetchJSON(`${API}?action=novel&chapter=${chapter}`);
  totalChapters = data.total;

  document.getElementById('chapter-title').textContent = data.title;

  const imgEl = document.getElementById('chapter-image');
  imgEl.innerHTML = data.image_url
    ? `<img src="${data.image_url}" alt="插圖">`
    : '';

  const content = data.content.replace(/\\n/g, '\n');
  document.getElementById('chapter-content').innerHTML = marked.parse(content);

  document.getElementById('page-info').textContent = `第 ${chapter} 章 / 共 ${totalChapters} 章`;
  document.getElementById('btn-prev').disabled = chapter <= 1;
  document.getElementById('btn-next').disabled = chapter >= totalChapters;

  window.scrollTo(0, 0);
  loadComments(chapter);
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

document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentChapter > 1) loadChapter(currentChapter - 1);
});

document.getElementById('btn-next').addEventListener('click', () => {
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

// 初始化
loadChapterList().then(() => loadChapter(1));
