const API = '';
let currentEpisode = null;
let tgUser = null;

// Telegram WebApp init
if (window.Telegram && Telegram.WebApp) {
  Telegram.WebApp.ready();
  tgUser = Telegram.WebApp.initDataUnsafe?.user || null;
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (name === 'episodes') loadEpisodes();
}

async function loadEpisodes() {
  const list = document.getElementById('episodes-list');
  const noEps = document.getElementById('no-episodes');
  list.innerHTML = '';
  try {
    const res = await fetch(API + '/api/episodes');
    const eps = await res.json();
    if (eps.length === 0) {
      noEps.style.display = 'block';
      return;
    }
    noEps.style.display = 'none';
    eps.forEach(ep => {
      const card = document.createElement('div');
      card.className = 'ep-card';
      card.onclick = () => selectEpisode(ep);
      card.innerHTML = `
        <div class="ep-num">${ep.number}</div>
        <div class="ep-info">
          <div class="ep-title">${ep.title || 'Episode ' + ep.number}</div>
        </div>
        <div class="ep-arrow">&#8250;</div>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    list.innerHTML = '<p style="color:#666;text-align:center;padding:40px">Failed to load episodes.</p>';
  }
}

async function selectEpisode(ep) {
  currentEpisode = ep;
  document.getElementById('join-title').textContent = 'Episode ' + ep.number + ' Locked';
  document.getElementById('download-box').style.display = 'none';
  document.querySelector('.join-card').style.display = 'block';
  document.getElementById('status-msg').className = 'status-msg';
  document.getElementById('status-msg').textContent = '';

  // Load settings for channel links
  try {
    const res = await fetch(API + '/api/settings');
    const settings = await res.json();
    const rjLink = settings.req2join_link || '';
    const dlLink = settings.link_channel || '';
    document.getElementById('btn-apply').href = rjLink || '#';
    document.getElementById('btn-apply').style.display = rjLink ? '' : 'none';
    document.getElementById('btn-download').href = dlLink || '#';
  } catch (e) {}

  showPage('join');
}

async function checkJoin() {
  const btn = document.getElementById('btn-check');
  const spinner = document.getElementById('spinner');
  const checkText = document.getElementById('check-text');
  const msg = document.getElementById('status-msg');

  if (!tgUser || !tgUser.id) {
    msg.className = 'status-msg show error';
    msg.textContent = 'Open this app inside Telegram to use this feature.';
    return;
  }

  btn.disabled = true;
  spinner.style.display = 'inline-block';
  checkText.textContent = 'Checking...';
  msg.className = 'status-msg show loading';
  msg.textContent = 'Verifying your join request...';

  try {
    const res = await fetch(API + '/api/check-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: tgUser.id })
    });
    const data = await res.json();

    if (data.inJoinRequests) {
      msg.className = 'status-msg show success';
      msg.textContent = 'Verified! You have access.';
      document.querySelector('.join-card').style.display = 'none';
      document.getElementById('download-box').style.display = 'block';
    } else {
      msg.className = 'status-msg show error';
      msg.textContent = 'Not found. Please apply to join first, then check again.';
    }
  } catch (e) {
    msg.className = 'status-msg show error';
    msg.textContent = 'Error checking status. Try again.';
  }

  btn.disabled = false;
  spinner.style.display = 'none';
  checkText.textContent = 'Check Status';
}
