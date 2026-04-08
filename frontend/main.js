import { renderSidebar } from './components/Sidebar.js';
import { renderPlayer } from './components/Player.js';
import { renderQueue } from './components/Queue.js';
import { renderNowPlayingDetail } from './components/NowPlayingDetail.js';
import { renderSearch, handleSearch } from './components/Search.js';
import { renderHome } from './components/NowPlaying.js';
import { renderLibrary } from './components/Library.js';
import { renderPlaylistView } from './components/PlaylistView.js';
import { initThemeSwitcher, getCurrentTheme } from './components/ThemeSwitcher.js';
import { viewTransition, showToast } from './utils/animations.js';
import { icons, debounce } from './utils/helpers.js';
import * as storage from './services/storage.js';
import player from './services/playerEngine.js';
import gsap from 'gsap';

const state = {
  currentView: 'home',
  currentPlaylistId: null,
  rightPanelOpen: false,
  searchQuery: '',
};

const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('top-bar');
const viewContainer = document.getElementById('view-container');
const rightPanel = document.getElementById('right-panel');
const nowPlayingDetail = document.getElementById('now-playing-detail');
const queuePanel = document.getElementById('queue-panel');
const playerBar = document.getElementById('player-bar');
const modalOverlay = document.getElementById('modal-overlay');
const contextMenu = document.getElementById('context-menu');
const toastContainer = document.getElementById('toast-container');

const themeSwitcher = initThemeSwitcher((newTheme) => {
  _renderSidebar();
  _renderTopBar();
  _renderView();
  if (state.rightPanelOpen) _renderRightPanel();
});

function _renderTopBar() {
  const theme = getCurrentTheme();
  const themeIcon = theme === 'dreadflow' ? icons.sun : icons.skull;
  const themeLabel = theme === 'dreadflow' ? 'Switch to MelodyFlow' : 'Switch to DreadFlow';

  topBar.innerHTML = `
    <div class="top-bar-nav">
      <button class="nav-btn" id="nav-back" title="Back">${icons.chevronLeft}</button>
      <button class="nav-btn" id="nav-forward" title="Forward">${icons.chevronRight}</button>
    </div>
    <div class="search-bar" id="top-search-bar">
      <span class="search-bar-icon">${theme === 'dreadflow' ? icons.eye : icons.search}</span>
      <input type="text" id="search-input" placeholder="${theme === 'dreadflow' ? 'Search artists, songs, podcasts...' : 'What do you want to play?'}" value="${state.searchQuery}" />
    </div>
    <div class="top-bar-right">
      <a href="https://forms.gle/hdTFXiSm79Zjiae88" target="_blank" class="feedback-btn" id="feedback-link">
        <div class="feedback-btn-icon">
          <img src="/frontend/assets/image.png" alt="Feedback" />
        </div>
        <span class="feedback-btn-text">Drop a suggestion</span>
      </a>
      <button class="theme-toggle-btn" id="theme-toggle" title="${themeLabel}">${themeIcon}</button>
      <div class="user-avatar" title="User">U</div>
    </div>
  `;

  
  const feedbackBtn = topBar.querySelector('.feedback-btn');
  const triggerNudge = () => {
    feedbackBtn.classList.add('nudge');
    setTimeout(() => feedbackBtn.classList.remove('nudge'), 2000);
  };
  
  
  if (!window.feedbackInterval) {
    window.feedbackInterval = setInterval(triggerNudge, 45000);
    
    setTimeout(triggerNudge, 5000);
  }

  
  const searchInput = topBar.querySelector('#search-input');
  const debouncedSearch = debounce((query) => {
    state.searchQuery = query;
    if (query.trim().length >= 2) {
      if (state.currentView !== 'search') {
        state.currentView = 'search';
        _renderView();
      } else {
        handleSearch(query, viewContainer, _showContextMenu);
      }
    } else if (state.currentView === 'search') {
      handleSearch('', viewContainer, _showContextMenu);
    }
  }, 400);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  searchInput.addEventListener('focus', () => {
    if (state.currentView !== 'search') {
      _navigate('search');
    }
  });

  
  topBar.querySelector('#theme-toggle')?.addEventListener('click', () => {
    themeSwitcher.toggle();
  });

  
  topBar.querySelector('#nav-back')?.addEventListener('click', () => {
    if (state.currentView === 'playlist') {
      _navigate('library');
    } else {
      _navigate('home');
    }
  });
}

function _renderSidebar() {
  renderSidebar(sidebar, {
    onNavigate: _navigate,
    onPlaylistSelect: _openPlaylist,
    onCreatePlaylist: _showCreatePlaylistModal,
    activeView: state.currentView,
    theme: getCurrentTheme(),
  });
}

function _navigate(view) {
  state.currentView = view;
  state.currentPlaylistId = null;
  _renderSidebar();
  _renderView();
}

function _renderView() {
  viewTransition(viewContainer, () => {
    switch (state.currentView) {
      case 'home':
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
        });
        break;
      case 'search':
        renderSearch(viewContainer, {
          onContextMenu: _showContextMenu,
          searchQuery: state.searchQuery,
        });
        break;
      case 'library':
        renderLibrary(viewContainer, {
          onPlaylistSelect: _openPlaylist,
          onContextMenu: _showContextMenu,
        });
        break;
      case 'playlist':
        renderPlaylistView(viewContainer, {
          playlistId: state.currentPlaylistId,
          onContextMenu: _showContextMenu,
          onBack: () => _navigate('library'),
        });
        break;
      default:
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
        });
    }
  });
}

function _openPlaylist(playlistId) {
  state.currentView = 'playlist';
  state.currentPlaylistId = playlistId;
  _renderSidebar();
  _renderView();
}

function _toggleRightPanel() {
  state.rightPanelOpen = !state.rightPanelOpen;
  if (state.rightPanelOpen) {
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  } else {
    gsap.to(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        rightPanel.classList.add('hidden');
        gsap.set(rightPanel, { x: 0, opacity: 1 });
      },
    });
  }
}

function _closeRightPanel() {
  if (!state.rightPanelOpen) return;
  state.rightPanelOpen = false;
  gsap.to(rightPanel, {
    x: 360,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      rightPanel.classList.add('hidden');
      gsap.set(rightPanel, { x: 0, opacity: 1 });
      const queueToggle = playerBar.querySelector('#queue-toggle-btn');
      if (queueToggle) queueToggle.classList.remove('active');
    },
  });
}

function _renderRightPanel() {
  renderNowPlayingDetail(nowPlayingDetail, {
    onClose: _closeRightPanel,
  });
  renderQueue(queuePanel);
}

player.on('songchange', () => {
  if (!state.rightPanelOpen) {
    state.rightPanelOpen = true;
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
    
    const queueToggle = playerBar.querySelector('#queue-toggle-btn');
    if (queueToggle) queueToggle.classList.add('active');
  }
});

function _renderPlayerBar() {
  renderPlayer(playerBar, {
    onQueueToggle: _toggleRightPanel,
    onSongClick: (song) => {
      if (!state.rightPanelOpen) _toggleRightPanel();
    },
    onContextMenu: _showContextMenu
  });
}

function _showContextMenu(event, song) {
  const playlists = storage.getPlaylists();

  let playlistSubmenu = '';
  if (playlists.length > 0) {
    playlistSubmenu = `
      <div class="context-submenu">
        <div class="context-menu-item">
          ${icons.plus} Add to Playlist ${icons.chevronRight}
        </div>
        <div class="context-submenu-list">
          ${playlists
            .map(
              (pl) =>
                `<div class="context-menu-item" data-action="add-to-playlist" data-playlist-id="${pl.id}">${pl.name}</div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  const isLiked = storage.isLiked(song.id);

  contextMenu.innerHTML = `
    <div class="context-menu-item" data-action="play">${icons.play} Play</div>
    <div class="context-menu-item" data-action="queue">${icons.plus} Add to Queue</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="like">${isLiked ? icons.heartFilled : icons.heart} ${isLiked ? 'Remove from Liked' : 'Like'}</div>
    ${playlistSubmenu}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="create-playlist-add">${icons.plus} New Playlist with Song</div>
  `;

  
  const x = Math.min(event.clientX, window.innerWidth - 220);
  const y = Math.min(event.clientY, window.innerHeight - 300);
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');

  
  contextMenu.querySelectorAll('[data-action]').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      switch (action) {
        case 'play':
          player.playSong(song);
          break;
        case 'queue':
          player.addToQueue(song);
          showToast(toastContainer, `Added "${song.title}" to queue`);
          break;
        case 'like':
          const liked = storage.toggleLike(song);
          showToast(toastContainer, liked ? `Liked "${song.title}"` : `Removed from Liked`);
          break;
        case 'add-to-playlist': {
          const plId = item.dataset.playlistId;
          const added = storage.addSongToPlaylist(plId, song);
          const pl = storage.getPlaylistById(plId);
          showToast(
            toastContainer,
            added ? `Added to "${pl?.name}"` : `Already in "${pl?.name}"`
          );
          _renderSidebar();
          break;
        }
        case 'create-playlist-add':
          const newPl = storage.createPlaylist(`My Playlist`);
          storage.addSongToPlaylist(newPl.id, song);
          showToast(toastContainer, `Created playlist with "${song.title}"`);
          _renderSidebar();
          break;
      }
      contextMenu.classList.add('hidden');
    });
  });
}

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden');
  }
});

function _showCreatePlaylistModal() {
  modalOverlay.classList.remove('hidden');
  const input = document.getElementById('playlist-name-input');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

document.getElementById('modal-cancel')?.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

document.getElementById('modal-create')?.addEventListener('click', () => {
  const input = document.getElementById('playlist-name-input');
  const name = input.value.trim();
  if (name) {
    storage.createPlaylist(name);
    modalOverlay.classList.add('hidden');
    _renderSidebar();
    showToast(toastContainer, `Created "${name}"`);
  }
});

document.getElementById('playlist-name-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('modal-create')?.click();
  }
  if (e.key === 'Escape') {
    modalOverlay.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      player.togglePlay();
      break;
    case 'ArrowRight':
      if (e.ctrlKey) player.next();
      break;
    case 'ArrowLeft':
      if (e.ctrlKey) player.prev();
      break;
  }
});

document.addEventListener('mousemove', (e) => {
  if (getCurrentTheme() === 'dreadflow') {
    document.body.style.setProperty('--cursor-x', `${e.clientX}px`);
    document.body.style.setProperty('--cursor-y', `${e.clientY}px`);
  }
});

document.addEventListener('mouseover', (e) => {
  if (getCurrentTheme() === 'dreadflow') {
    if (e.target.closest('button, .nav-item, .playlist-item, .song-card, input, a, .progress-bar-container, .volume-slider')) {
      document.documentElement.setAttribute('data-cursor-hover', 'true');
    }
  }
});

document.addEventListener('mouseout', (e) => {
  if (getCurrentTheme() === 'dreadflow') {
    if (e.target.closest('button, .nav-item, .playlist-item, .song-card, input, a, .progress-bar-container, .volume-slider')) {
      document.documentElement.setAttribute('data-cursor-hover', 'false');
    }
  }
});

function init() {
  _renderTopBar();
  _renderSidebar();
  _renderPlayerBar();
  _renderView();

  console.log(
    `%c🎵 ${getCurrentTheme() === 'dreadflow' ? 'DreadFlow' : 'MelodyFlow'} initialized`,
    'color: #00f0ff; font-size: 14px; font-weight: bold;'
  );
}

init();
