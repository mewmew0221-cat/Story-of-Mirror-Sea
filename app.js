const API = 'https://script.google.com/macros/s/AKfycbz5bZI3j1HCOyAAPcUmQVTI0V8VKf7C4YyzLrM-NhnFctFYiG_yYsMam3fETwX45Pm2Sg/exec';

let currentChapter = 1;
let totalChapters = 1;
let isAnimating = false;

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
  select.addEventListener('change', () => {
    const target = parseInt(select.value);
    const direction = target > currentChapter ? 'forward' : 'backward';
    flipToChapter(target, direction);
  });
}

async function fetchChapterData(chapter) {
  return await fetchJSON(`${API}?action=novel&chapter=${chapter}`);
}

function renderChapterContent(data) {
  const content = data.content.replace(/\\n/g, '\n');
  document.getElementById('chapter-title').textContent = data.title;

  const imgEl = document.getElementById('chapter-image');
  imgEl.innerHTML = data.image_url
    ? `<img src="${data.image_url}" alt="插圖">`
    : '';

  document.getElementById('chapter-content').innerHTML = marked.parse(content);
  document.getElementById('page-info').textContent = `第 ${data.chapter} 章 / 共 ${totalChapters} 章`;
  document.getElementById('btn-prev').disabled = data.chapter <= 1;
  document.getElementById('btn-next').disabled = data.chapter >= totalChapters;
  document.getElementById('chapter-select').value = data.chapter;
}

async function flipToChapter(chapter, direction = 'forward') {
  if (isAnimating) return;
  isAnimating = true;

  const wrapper = document.getElementById('page-wrapper');
  const outClass = direction === 'forward' ? 'page-flip-out' : 'page-flip-out-reverse';
  const inClass  = direction === 'forward' ? 'page-flip-in'  : 'page-flip-in-reverse';

  // 飛出動畫
  wrapper.classList.add(outClass);

  // 預先載入新章節
  const data = await fetchChapterData(chapter);
  currentChapter = chapter;
  totalChapters = data.total;

  await new Promise(r => setTimeout(r, 500));
  wrapper.classList.remove(outClass);

  // 渲染新內容
  renderChapterContent(data);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadComments(chapter);

  // 飛入動畫
  wrapper.classList.add(inClass);
  await new Promise(r => setTimeout(r, 500));
  wrapper.classList.remove(inClass);

  isAnimating = false;
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
  if (!isAnimating && currentChapter > 1)
    flipToChapter(currentChapter - 1, 'backward');
});

document.getElementById('btn-next').addEventListener('click', () => {
  if (!isAnimating && currentChapter < totalChapters)
    flipToChapter(currentChapter + 1, 'forward');
});

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

// 初始化
loadChapterList().then(() => flipToChapter(1, 'forward'));
