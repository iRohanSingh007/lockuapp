const API = '';
let adminKey = localStorage.getItem('admin_key') || '';

if (!adminKey) {
  adminKey = prompt('Enter Admin Key:');
  if (adminKey) localStorage.setItem('admin_key', adminKey);
}

function headers() {
  return { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'episodes') loadEpisodesList();
}

function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'admin-msg show ' + (ok ? 'ok' : 'err');
  setTimeout(() => el.classList.remove('show'), 3000);
}

async function loadSettings() {
  try {
    const res = await fetch(API + '/api/settings');
    const s = await res.json();
    document.getElementById('inp-req2join-user').value = s.req2join_username || '';
    document.getElementById('inp-req2join-link').value = s.req2join_link || '';
    document.getElementById('inp-link').value = s.link_channel || '';
  } catch (e) {}
}

async function saveChannels() {
  const rjUser = document.getElementById('inp-req2join-user').value.trim();
  const rjLink = document.getElementById('inp-req2join-link').value.trim();
  const link = document.getElementById('inp-link').value.trim();
  try {
    await fetch(API + '/api/settings/req2join_username', {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ value: rjUser })
    });
    await fetch(API + '/api/settings/req2join_link', {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ value: rjLink })
    });
    await fetch(API + '/api/settings/link_channel', {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ value: link })
    });
    showMsg('channel-msg', 'Channels saved!', true);
  } catch (e) {
    showMsg('channel-msg', 'Error saving.', false);
  }
}

async function saveEpisode() {
  const num = parseInt(document.getElementById('inp-ep-num').value);
  const title = document.getElementById('inp-ep-title').value.trim();
  const channel = document.getElementById('inp-ep-channel').value.trim();
  if (!num) return showMsg('ep-msg', 'Enter episode number.', false);

  const data = { number: num };
  if (title) data.title = title;
  if (channel) data.linkChannel = channel;

  try {
    await fetch(API + '/api/episodes', {
      method: 'POST', headers: headers(),
      body: JSON.stringify(data)
    });
    showMsg('ep-msg', 'Episode ' + num + ' saved!', true);
    document.getElementById('inp-ep-num').value = '';
    document.getElementById('inp-ep-title').value = '';
    document.getElementById('inp-ep-channel').value = '';
    loadEpisodesList();
  } catch (e) {
    showMsg('ep-msg', 'Error saving.', false);
  }
}

async function loadEpisodesList() {
  const container = document.getElementById('episodes-table');
  try {
    const res = await fetch(API + '/api/episodes');
    const eps = await res.json();
    if (eps.length === 0) {
      container.innerHTML = '<p style="color:#555;padding:16px">No episodes yet.</p>';
      return;
    }
    container.innerHTML = '<div class="ep-table">' + eps.map(ep => `
      <div class="ep-row">
        <div class="ep-row-num">${ep.number}</div>
        <div class="ep-row-title">${ep.title || 'Episode ' + ep.number}</div>
        <div class="ep-row-channel">${ep.linkChannel || '(global)'}</div>
        <div class="ep-row-actions">
          <button class="btn-sm" onclick="editEpisode(${ep.number})">Edit</button>
          <button class="btn-sm del" onclick="deleteEpisode(${ep.number})">Del</button>
        </div>
      </div>
    `).join('') + '</div>';
  } catch (e) {
    container.innerHTML = '<p style="color:#e50914;padding:16px">Failed to load.</p>';
  }
}

async function editEpisode(num) {
  try {
    const res = await fetch(API + '/api/episodes/' + num);
    const ep = await res.json();
    document.getElementById('inp-ep-num').value = ep.number;
    document.getElementById('inp-ep-title').value = ep.title || '';
    document.getElementById('inp-ep-channel').value = ep.linkChannel || '';
  } catch (e) {}
}

async function deleteEpisode(num) {
  if (!confirm('Delete Episode ' + num + '?')) return;
  try {
    await fetch(API + '/api/episodes/' + num, {
      method: 'DELETE', headers: headers()
    });
    loadEpisodesList();
  } catch (e) {}
}

// init
loadSettings();
loadEpisodesList();
