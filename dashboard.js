// ==== CONFIG ====
const CLIENT_ID = '1376180153654448180';
const REDIRECT_URI = window.location.origin + '/';
const API_URL = 'https://fallai-manager.netlify.app'; // z.B. https://meineapi.de

// ==== OAUTH2 ====
const SCOPE = 'identify guilds';
const DISCORD_API = 'https://discord.com/api';

function getAccessTokenFromUrl() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#access_token=')) {
    const params = new URLSearchParams(hash.substr(1));
    return params.get('access_token');
  }
  return null;
}

function loginWithDiscord() {
  const url = `${DISCORD_API}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPE)}`;
  window.location.href = url;
}

function logout() {
  window.location.hash = '';
  window.location.reload();
}

async function fetchUserGuilds(token) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function fetchUser(token) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// ==== UI ====
document.getElementById('login-btn').onclick = loginWithDiscord;

const token = getAccessTokenFromUrl();
if (token) {
  document.getElementById('login-area').style.display = 'none';
  document.getElementById('dashboard').style.display = '';
  main(token);
}

async function main(token) {
  // Lade User-Info
  const user = await fetchUser(token);

  // Lade Guilds
  let guilds = await fetchUserGuilds(token);

  // Lade Bot-Guilds von deiner API (dein Bot muss eine Route bereitstellen, z.B. /api/botguilds)
  const botGuildsRes = await fetch(`${API_URL}/api/botguilds`);
  const botGuilds = await botGuildsRes.json();

  // Filtere: Nur gemeinsame Guilds, wo der User Admin ist
  const adminGuilds = guilds.filter(g =>
    (parseInt(g.permissions) & 0x8) &&
    botGuilds.includes(g.id)
  );

  // Zeige Serverliste
  const serversDiv = document.getElementById('servers');
  serversDiv.innerHTML = '';
  adminGuilds.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'server-card';
    card.style.animationDelay = (i * 0.1) + 's';

    card.innerHTML = `
      <div class="server-info">
        <img class="server-icon" src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
        <span class="server-name">${g.name}</span>
      </div>
      <button class="control-btn" onclick="openControl('${g.id}', '${g.name}')">Steuern</button>
    `;
    serversDiv.appendChild(card);
  });
}

// ==== Server-Steuerung (z.B. User kicken) ====
window.openControl = function(guildId, guildName) {
  const userId = prompt(`User-ID, die du auf ${guildName} kicken willst:`);
  if (!userId) return;
  const reason = prompt("Grund für Kick:");
  fetch(`${API_URL}/api/kick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guild_id: guildId, user_id: userId, reason })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      alert('User wurde gekickt!');
    } else {
      alert('Fehler: ' + (data.msg || 'Unbekannter Fehler'));
    }
  });
};
