document.addEventListener('DOMContentLoaded', () => {
  // Elements - Arayüz Elemanları
  const searchInput = document.getElementById('search-input');
  const actionBtn = document.getElementById('action-btn');
  const actionBtnIcon = document.getElementById('action-btn-icon');
  const platformIcon = document.getElementById('platform-icon');
  const platformIconContainer = document.getElementById('platform-icon-container');
  const searchBtn = document.getElementById('search-btn');
  
  const loadingCard = document.getElementById('loading-card');
  const loadingStatus = document.getElementById('loading-status');
  const loadingSubstatus = document.getElementById('loading-substatus');
  
  const resultCard = document.getElementById('result-card');
  const songThumbnail = document.getElementById('song-thumbnail');
  const songTitle = document.getElementById('song-title');
  const songArtist = document.getElementById('song-artist');
  const songDuration = document.getElementById('song-duration');
  const platformBadge = document.getElementById('platform-badge');
  const downloadM4aBtn = document.getElementById('download-m4a-btn');
  const downloadWavBtn = document.getElementById('download-wav-btn');
  const resetBtn = document.getElementById('reset-btn');
  
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Multi-Tab Screens - Çoklu Ekran Elemanları
  const screenDownloader = document.getElementById('tab-downloader-screen');
  const screenHistory = document.getElementById('tab-history-screen');
  const screenMenu = document.getElementById('tab-menu-screen');

  // Bottom Navigation Buttons - Alt Menü Butonları
  const navDownloader = document.getElementById('nav-downloader');
  const navHistory = document.getElementById('nav-history');
  const navMenu = document.getElementById('nav-menu');

  // History Tab Elements - Geçmiş Elemanları
  const historyEmpty = document.getElementById('history-empty');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Menu Tab Elements - Menü Elemanları
  const optM4a = document.getElementById('set-m4a');
  const optWav = document.getElementById('set-wav');

  const headerLogoBg = document.getElementById('header-logo-bg');
  const headerLogoIcon = document.getElementById('header-logo-icon');
  const headerTagline = document.getElementById('header-tagline');
  const accentHighlight = document.getElementById('accent-highlight');

  // Globals & Preferences - Genel Ayarlar ve Hafıza
  let activeSongData = null;
  let activeTab = 'downloader'; // downloader | history | menu
  let defaultFormat = localStorage.getItem('spotidown_pref_format') || 'm4a';
  let accentColor = 'green'; // lock to green

  // Colors mapping dictionary
  const themeColors = {
    green: { hex: '#1DB954', rgb: '29, 185, 84', tailwindClass: 'text-spotify', bgClass: 'from-spotify to-emerald-400' },
    blue: { hex: '#22d3ee', rgb: '34, 211, 238', tailwindClass: 'text-cyan-400', bgClass: 'from-cyan-500 to-blue-500' },
    red: { hex: '#f43f5e', rgb: '244, 63, 94', tailwindClass: 'text-rose-500', bgClass: 'from-rose-500 to-red-600' }
  };

  // Init App Settings - Uygulama Başlangıç Ayarları
  initPreferences();
  
  // Helper: Show custom error toast - Hata bildirim baloncuğu
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('translate-y-48');
    toast.classList.add('translate-y-0');
    
    setTimeout(() => {
      toast.classList.remove('translate-y-0');
      toast.classList.add('translate-y-48');
    }, 4500);
  }

  // Detector: Detect platform type from input URL
  function detectPlatform(value) {
    const trimmed = value.trim();
    if (trimmed.includes('spotify.com/track/') || /spotify\.com\/.*track\//.test(trimmed)) {
      return 'spotify';
    } else if (trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/')) {
      return 'youtube';
    }
    return trimmed.length > 0 ? 'search' : 'empty';
  }

  // UI Matcher: Update input decorations based on input text
  function updateInputUI() {
    const platform = detectPlatform(searchInput.value);
    
    // Reset classes
    platformIconContainer.className = "absolute left-4 transition-all duration-300";
    
    const activeColorHex = themeColors[accentColor].hex;

    if (platform === 'spotify') {
      platformIcon.setAttribute('data-lucide', 'music');
      platformIconContainer.classList.add('text-spotify', 'drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]');
      searchInput.style.borderColor = 'rgba(29,185,84,0.5)';
    } else if (platform === 'youtube') {
      platformIcon.setAttribute('data-lucide', 'youtube');
      platformIconContainer.classList.add('text-youtube', 'drop-shadow-[0_0_8px_rgba(255,0,0,0.4)]');
      searchInput.style.borderColor = 'rgba(255,0,0,0.5)';
    } else if (platform === 'search') {
      platformIcon.setAttribute('data-lucide', 'search');
      platformIconContainer.classList.add('text-gray-400');
      searchInput.style.borderColor = activeColorHex + '50';
    } else {
      platformIcon.setAttribute('data-lucide', 'search');
      platformIconContainer.classList.add('text-gray-500');
      searchInput.style.borderColor = '';
    }
    
    // Switch action button icon (Clipboard vs Clear/X)
    if (searchInput.value.length > 0) {
      actionBtnIcon.setAttribute('data-lucide', 'x');
      actionBtn.title = "Temizle";
    } else {
      actionBtnIcon.setAttribute('data-lucide', 'clipboard');
      actionBtn.title = "Panodan Yapıştır";
    }
    
    lucide.createIcons();
  }

  // Input Events
  searchInput.addEventListener('input', updateInputUI);

  // Action Button (Paste or Clear)
  actionBtn.addEventListener('click', async () => {
    if (searchInput.value.length > 0) {
      searchInput.value = '';
      updateInputUI();
      searchInput.focus();
    } else {
      try {
        const text = await navigator.clipboard.readText();
        searchInput.value = text;
        updateInputUI();
        showToast('Panodan başarıyla yapıştırıldı!');
      } catch (err) {
        showToast('Panoya erişim izni verilmedi. Lütfen linki elle yapıştırın.');
      }
    }
  });

  // Search/Analyze handler
  async function handleAnalysis() {
    const query = searchInput.value.trim();
    if (!query) {
      showToast('Lütfen geçerli bir şarkı ismi veya link girin.');
      return;
    }

    // Hide previous UI results
    resultCard.classList.add('hidden');
    
    // Show and customize loading
    loadingCard.classList.remove('hidden');
    const platform = detectPlatform(query);
    if (platform === 'spotify') {
      loadingStatus.textContent = 'Spotify Linki Analiz Ediliyor...';
      loadingSubstatus.textContent = 'Meta veriler toplanıyor ve YouTube ses akışı eşleştiriliyor.';
    } else if (platform === 'youtube') {
      loadingStatus.textContent = 'YouTube Linki Çözümleniyor...';
      loadingSubstatus.textContent = 'Video ses dosyası çıkarılıyor ve kalite optimize ediliyor.';
    } else {
      loadingStatus.textContent = 'Şarkı Aranıyor...';
      loadingSubstatus.textContent = 'YouTube kütüphanesinde arama yapılıyor.';
    }

    try {
      let fetchUrl = `/api/info?query=${encodeURIComponent(query)}`;
      let data = null; // Initialize data variable

      // Client-side Spotify oEmbed query bypass:
      // Try resolving Spotify track metadata on the client browser first to avoid bot blocklists
      if (platform === 'spotify') {
        try {
          const spotifyOembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`;
          const spotifyOembedRes = await fetch(spotifyOembedUrl);
          
          if (spotifyOembedRes.ok) {
            const contentType = spotifyOembedRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const spotifyInfo = await spotifyOembedRes.json();
              const translatedSearch = `${spotifyInfo.title} ${spotifyInfo.author_name || ''} audio`;
              
              // Fetch streamUrl for Spotify search results too
              const youtubeInfoResponse = await fetch(`/api/info?query=${encodeURIComponent(translatedSearch)}`);
              if (!youtubeInfoResponse.ok) {
                throw new Error('YouTube araması başarısız oldu.');
              }
              const youtubeInfo = await youtubeInfoResponse.json();

              if (!youtubeInfo.success) {
                throw new Error(youtubeInfo.error || 'Spotify şarkısı için YouTube eşleşmesi bulunamadı.');
              }

              data = {
                ...youtubeInfo,
                source: 'spotify', // Keep original source as spotify
                title: spotifyInfo.title, // Use Spotify's original title and artist
                artist: spotifyInfo.author_name,
                thumbnail: spotifyInfo.thumbnail_url
              };
              console.log('Spotify oEmbed resolved client-side successfully! Fetched YouTube info via server:', data);
            }
          }
        } catch (spotifyErr) {
          console.warn('Client-side Spotify oembed resolving failed. Falling back to server-side parser...', spotifyErr);
        }
      }

      if (!data) { // If data is not yet set (e.g., non-Spotify or Spotify client-side failed)
        const response = await fetch(fetchUrl);
        
        // Highly robust HTTP Response/JSON Safe Checking
        if (!response.ok) {
          let errMsg = 'Sunucuda bir hata oluştu veya bağlantı engellendi.';
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (_) {
            try {
              const errText = await response.text();
              if (errText && errText.length < 300) {
                errMsg = errText;
              }
            } catch (_) {}
          }
          throw new Error(errMsg);
        }

        data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Şarkı bulunamadı. Lütfen bilgilerinizi kontrol edin.');
        }
      }

      activeSongData = data;
      
      // Populate Result Card
      songTitle.textContent = activeSongData.title;
      songArtist.textContent = activeSongData.artist;
      songDuration.textContent = activeSongData.duration;
      songThumbnail.src = activeSongData.thumbnail;

      // Select platform badge
      if (activeSongData.source === 'spotify') {
        platformBadge.innerHTML = '<i data-lucide="music" class="w-4 h-4 text-spotify"></i>';
        platformBadge.className = 'absolute bottom-1.5 right-1.5 p-1.5 bg-darkbg/90 rounded-xl border border-cardborder shadow shadow-spotify/20';
      } else if (activeSongData.source === 'youtube') {
        platformBadge.innerHTML = '<i data-lucide="youtube" class="w-4 h-4 text-youtube"></i>';
        platformBadge.className = 'absolute bottom-1.5 right-1.5 p-1.5 bg-darkbg/90 rounded-xl border border-cardborder shadow shadow-youtube/20';
      } else {
        platformBadge.innerHTML = '<i data-lucide="search" class="w-4 h-4 text-emerald-400"></i>';
        platformBadge.className = 'absolute bottom-1.5 right-1.5 p-1.5 bg-darkbg/90 rounded-xl border border-cardborder shadow';
      }

      // Highlighting default preferred button
      if (defaultFormat === 'wav') {
        downloadWavBtn.className = `w-full py-4.5 bg-gradient-to-r ${themeColors[accentColor].bgClass} text-darkbg font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-300 text-sm`;
        downloadM4aBtn.className = "w-full py-4.5 bg-darkbg text-gray-400 border border-cardborder font-extrabold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 text-sm hover:text-white";
      } else {
        downloadM4aBtn.className = `w-full py-4.5 bg-gradient-to-r ${themeColors[accentColor].bgClass} text-darkbg font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-300 text-sm`;
        downloadWavBtn.className = "w-full py-4.5 bg-darkbg text-gray-400 border border-cardborder font-extrabold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 text-sm hover:text-white";
      }

      // Show Result UI with animation
      loadingCard.classList.add('hidden');
      resultCard.classList.remove('hidden');
      lucide.createIcons();

      if (activeSongData && playerAudio && playerTitle) {
        loadIntoPlayer(activeSongData);
      }

    } catch (err) {
      loadingCard.classList.add('hidden');
      showToast(err.message || 'Bağlantı esnasında hata oluştu.');
    }
  }

  searchBtn.addEventListener('click', handleAnalysis);
  
  // Submit with hit 'Enter' key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAnalysis();
    }
  });

  // Helper: Common Download Handler - İndirmeyi gerçekleştiren ana metot
  function triggerDownload(btn, format, formatLabel) {
    if (!activeSongData) return;

    // Direct browser redirect download stream
    const titleClean = `${activeSongData.artist} - ${activeSongData.title}`;
    const downloadUrl = `/api/download?id=${activeSongData.youtubeId}&format=${format}&title=${encodeURIComponent(titleClean)}`;
    
    // Change download button status temporarily
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <div class="w-4 h-4 border-2 border-darkbg border-t-transparent rounded-full animate-spin"></div>
      <span>Ses hazırlanıyor...</span>
    `;

    // Start download stream in the browser
    window.location.href = downloadUrl;

    // Save success download to local storage history - İndirmeyi geçmişe kaydet
    saveToHistory(activeSongData, format, 'original');

    // Restore download button state after direct streaming handoff 
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 8000);
  }

  // Download Trigger Handlers
  downloadM4aBtn.addEventListener('click', () => {
    triggerDownload(downloadM4aBtn, 'm4a', 'M4A');
  });

  downloadWavBtn.addEventListener('click', () => {
    triggerDownload(downloadWavBtn, 'wav', 'WAV');
  });

  // Reset/New search button
  resetBtn.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    searchInput.value = '';
    activeSongData = null;
    updateInputUI();
    searchInput.focus();
  });


  /* ==========================================================================
     TAB SWITCH ENGINE - Sekme Yönetim Motoru
     ========================================================================== */
  
  function switchTab(targetTab) {
    if (activeTab === targetTab) return;

    // 1. Update UI navigation bar items visual active states
    const items = [
      { id: 'downloader', btn: navDownloader, screen: screenDownloader },
      { id: 'history', btn: navHistory, screen: screenHistory },
      { id: 'menu', btn: navMenu, screen: screenMenu }
    ];

    const activeColorClass = themeColors[accentColor].tailwindClass;

    items.forEach(item => {
      if (item.id === targetTab) {
        // Active Tab
        item.btn.className = `nav-item flex flex-col items-center gap-1 ${activeColorClass} transition-all duration-200`;
        item.screen.classList.remove('hidden');
        item.screen.style.opacity = '0';
        item.screen.style.transform = 'translateY(10px)';
        setTimeout(() => {
          item.screen.style.opacity = '1';
          item.screen.style.transform = 'translateY(0)';
        }, 50);
      } else {
        // Inactive Tab
        item.btn.className = `nav-item flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-all duration-200`;
        item.screen.classList.add('hidden');
      }
    });

    activeTab = targetTab;
    
    // Refresh history list if switched to history tab
    if (activeTab === 'history') {
      renderHistoryList();
    }
    
    // Automatically populate player if switched to menu tab and song is active
    if (activeTab === 'menu' && activeSongData) {
      loadIntoPlayer(activeSongData);
    }
  }

  navDownloader.addEventListener('click', () => switchTab('downloader'));
  navHistory.addEventListener('click', () => switchTab('history'));
  navMenu.addEventListener('click', () => switchTab('menu'));


  /* ==========================================================================
     HISTORY PERSISTENCE (LocalStorage) - İndirme Geçmişi Yönetimi
     ========================================================================== */
  
  function saveToHistory(song, format, mode = 'original', ai = false) {
    try {
      const historyStr = localStorage.getItem('spotidown_history') || '[]';
      let historyArray = JSON.parse(historyStr);

      // Check if this song with this format is already stored, delete it to push to top
      historyArray = historyArray.filter(item => !(item.youtubeId === song.youtubeId && item.format === format && (item.mode || 'original') === mode));

      const historyItem = {
        youtubeId: song.youtubeId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        duration: song.duration,
        source: song.source,
        format: format,
        mode,
        ai,
        timestamp: Date.now(),
        streamUrl: song.streamUrl // Save streamUrl to history
      };

      // Add to beginning of array
      historyArray.unshift(historyItem);

      // Cap size to 30 tracks
      if (historyArray.length > 30) {
        historyArray.pop();
      }

      localStorage.setItem('spotidown_history', JSON.stringify(historyArray));
    } catch (e) {
      console.error('History save error:', e);
    }
  }

  function renderHistoryList() {
    try {
      const historyStr = localStorage.getItem('spotidown_history') || '[]';
      const historyArray = JSON.parse(historyStr);

      if (historyArray.length === 0) {
        historyEmpty.classList.remove('hidden');
        historyList.classList.add('hidden');
        clearHistoryBtn.classList.add('hidden');
        return;
      }

      historyEmpty.classList.add('hidden');
      historyList.classList.remove('hidden');
      clearHistoryBtn.classList.remove('hidden');

      // Populate list layout
      historyList.innerHTML = '';
      
      historyArray.forEach((item, index) => {
        const titleClean = `${item.artist} - ${item.title}`;
        const formatBadgeClass = item.format === 'wav' 
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
          : 'bg-spotify/10 text-spotify border-spotify/30';
        const mode = item.mode || 'original';
        const modeLabels = {
          original: 'Orijinal',
          mix: 'Miks',
          vocals: 'Vokal',
          instrumental: 'Beat'
        };

        const card = document.createElement('div');
        card.dataset.index = String(index);
        card.className = "history-play-row bg-cardbg/70 border border-cardborder/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-cardborder transition-all duration-200 cursor-pointer";
        card.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <!-- Thumbnail -->
            <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-cardborder">
              <img src="${item.thumbnail}" alt="" class="w-full h-full object-cover">
            </div>
            
            <!-- Details -->
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-white leading-tight truncate pr-2">${item.title}</h4>
              <p class="text-xs text-gray-400 truncate mt-0.5">${item.artist}</p>
              
              <!-- Badges -->
              <div class="flex items-center gap-1.5 mt-1.5">
                <span class="px-2 py-0.5 border text-[9px] font-extrabold rounded-md uppercase ${formatBadgeClass}">
                  ${item.format}
                </span>
                <span class="px-2 py-0.5 border text-[9px] font-extrabold rounded-md uppercase bg-darkbg text-gray-400 border-cardborder">
                  ${modeLabels[mode] || 'Orijinal'}
                </span>
                <span class="text-[10px] text-gray-600 font-medium">${item.duration}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2 flex-shrink-0">
            <button 
              data-index="${index}"
              class="history-play-row-btn p-3 bg-spotify text-darkbg rounded-xl transition-all duration-200 active:scale-95"
              title="Oynat"
            >
              <i data-lucide="play" class="w-4 h-4"></i>
            </button>
            <button 
              data-id="${item.youtubeId}" 
              data-title="${encodeURIComponent(titleClean)}" 
              data-format="${item.format}" 
              data-mode="${mode}"
              data-ai="${item.ai ? '1' : '0'}"
              class="history-download-row-btn p-3 bg-darkbg text-gray-400 hover:text-white rounded-xl border border-cardborder/80 transition-all duration-200 active:scale-95"
              title="Şarkıyı Tekrar İndir"
            >
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
          </div>
        `;
        historyList.appendChild(card);
      });

      function playHistoryItem(index) {
        const song = historyArray[index];
        if (!song) return;
        localPlaylist = historyArray;
        playlistIdx = index;
        activeSongData = song;
        loadIntoPlayer(song);
        activeTab = 'history';
        switchTab('menu');
        setTimeout(() => {
          playerPlayBtn?.click();
        }, 150);
      }

      document.querySelectorAll('.history-play-row').forEach(card => {
        card.addEventListener('click', () => {
          playHistoryItem(Number(card.dataset.index));
        });
      });

      document.querySelectorAll('.history-play-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          playHistoryItem(Number(e.currentTarget.getAttribute('data-index')));
        });
      });

      // Bind dynamic download backup triggers
      document.querySelectorAll('.history-download-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetBtn = e.currentTarget;
          const yid = targetBtn.getAttribute('data-id');
          const title = targetBtn.getAttribute('data-title');
          const format = targetBtn.getAttribute('data-format');
          const mode = targetBtn.getAttribute('data-mode') || 'original';
          const ai = targetBtn.getAttribute('data-ai') === '1' || mode !== 'original';
          
          const targetUrl = `/api/download?id=${yid}&mode=${mode}&format=${format}&title=${title}${ai ? '&ai=1' : ''}`;
          window.location.href = targetUrl;
          
          showToast('Tekrar indirme işlemi başlatıldı!');
        });
      });

      lucide.createIcons();

    } catch (e) {
      console.error('History render error:', e);
    }
  }

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('spotidown_history');
    renderHistoryList();
    showToast('Tüm indirme geçmişiniz temizlendi.');
  });


  /* ==========================================================================
     MENU CONTROLS - Menü Ayarlar Tercihleri
     ========================================================================== */
  
  function initPreferences() {
    updateFormatUI();
  }

  function updateFormatUI() {
    if (defaultFormat === 'wav') {
      optWav.className = "px-2 py-0.5 rounded text-[8px] font-extrabold bg-spotify text-darkbg shadow";
      optM4a.className = "px-2 py-0.5 rounded text-[8px] font-extrabold text-gray-500 hover:text-white transition-colors";
    } else {
      optM4a.className = "px-2 py-0.5 rounded text-[8px] font-extrabold bg-spotify text-darkbg shadow";
      optWav.className = "px-2 py-0.5 rounded text-[8px] font-extrabold text-gray-500 hover:text-white transition-colors";
    }
  }

  // Click format buttons setting listeners
  if (optM4a) {
    optM4a.addEventListener('click', () => {
      defaultFormat = 'm4a';
      localStorage.setItem('spotidown_pref_format', 'm4a');
      updateFormatUI();
      showToast('Varsayılan indirme formatı M4A olarak ayarlandı.');
    });
  }

  if (optWav) {
    optWav.addEventListener('click', () => {
      defaultFormat = 'wav';
      localStorage.setItem('spotidown_pref_format', 'wav');
      updateFormatUI();
      showToast('Varsayılan indirme formatı (Kayıpsız) WAV olarak ayarlandı.');
    });
  }


  /* ==========================================================================
     MENU SUB-TABS & VOICE SPLITTER & DYNAMIC VISUALIZER
     ========================================================================== */
  // Subtab buttons - Alt Sekme Butonları
  const subtabVocal = document.getElementById('subtab-vocal');
  const subtabBpm = document.getElementById('subtab-bpm');

  // Subtab panes - Alt Sekme Panelleri
  const paneVocal = document.getElementById('pane-vocal');
  const paneBpm = document.getElementById('pane-bpm');

  // Vocal Splitter sliders - Vokal Kaydırıcıları
  const vocalSlider = document.getElementById('vocal-slider');
  const musicSlider = document.getElementById('music-slider');
  const vocalVal = document.getElementById('vocal-val');
  const musicVal = document.getElementById('music-val');
  const muteMusicBtn = document.getElementById('mute-music-btn');
  const muteMusicIcon = document.getElementById('mute-music-icon');
  const muteVocalsBtn = document.getElementById('mute-vocals-btn');
  const muteVocalsIcon = document.getElementById('mute-vocals-icon');

  // BPM & Key elements - Ritim ve Ton Elemanları
  const bpmValueText = document.getElementById('detected-bpm');
  const keyValueText = document.getElementById('detected-key');
  const bpmPulse = document.getElementById('bpm-pulse-back');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmTargetVal = document.getElementById('bpm-target-val');
  const keyShiftSelect = document.getElementById('key-shift-select');
  const studioApplyBtn = document.getElementById('studio-apply-btn');
  const studioResetBtn = document.getElementById('studio-reset-btn');
  const prepareAiBtn = document.getElementById('prepare-ai-btn');
  const aiStemBadge = document.getElementById('ai-stem-badge');
  const aiStemStatusText = document.getElementById('ai-stem-status-text');

  // Waveform canvas & Audio elements - Frekans ve Oynatıcı Elemanları
  const waveformCanvas = document.getElementById('waveform-canvas');
  const playerAudio = document.getElementById('realtime-audio');
  const playerPlayBtn = document.getElementById('player-play-btn');
  const playerPlayIcon = document.getElementById('player-play-icon');
  const playerTitle = document.getElementById('player-song-title');
  const playerArtist = document.getElementById('player-song-artist');
  const playerPrev = document.getElementById('player-prev');
  const playerNext = document.getElementById('player-next');

  // New Player Widgets - İlerleme, Ses ve Ayrıştırıp İndirme Elemanları
  const playerSeek = document.getElementById('player-seek');
  const playerTimeCurrent = document.getElementById('player-time-current');
  const playerTimeTotal = document.getElementById('player-time-total');
  const playerVolume = document.getElementById('player-volume');
  const downloadVocalsBtn = document.getElementById('download-vocals-btn');
  const downloadInstBtn = document.getElementById('download-inst-btn');
  const downloadMiksBtn = document.getElementById('download-miks-btn');

  let activeSubtab = 'vocal'; // vocal | bpm
  let visualizerInit = false;
  let canvasCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;
  let audioCtx = null;
  let analyserNode = null;
  let sourceNode = null;
  let dataArray = null;
  
  let musicMuted = false;
  let vocalsMuted = false;
  let prevMusicVal = 100;
  let prevVocalVal = 100;
  let bufferLength = 0;
  
  // Audio Nodes for Vocal Isolation & Vocal Removal filter effects
  let vocalSplitVolumeNode = null;
  let musicSplitVolumeNode = null;
  
  // Custom Siri-style idle waveform phase
  let idlePhase = 0;

  // Track playlist extracted from History
  let localPlaylist = [];
  let playlistIdx = 0;
  let detectedSongBpm = 120;
  let selectedBpm = 120;
  let detectedSongKey = 'La Minör';
  let selectedPitch = 0;
  let aiStemState = 'idle';
  let aiStemPollTimer = null;
  const chromaticKeys = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

  function getSliderPercent(slider, fallback = 100) {
    if (!slider) return fallback;
    const parsed = Number.parseFloat(slider.value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(200, Math.max(0, parsed));
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function setStemGain(node, percent) {
    if (!node || !audioCtx) return;
    node.gain.setValueAtTime(percent / 100, audioCtx.currentTime);
  }

  function updateStemLabels() {
    if (musicVal && musicSlider) musicVal.textContent = `${musicSlider.value}%`;
    if (vocalVal && vocalSlider) vocalVal.textContent = `${vocalSlider.value}%`;
  }

  function setAiStemUi(status = {}) {
    const state = status.state || 'idle';
    const ready = status.ready || state === 'ready';
    const busyStates = ['queued', 'downloading', 'loading_model', 'loading_audio', 'separating', 'saving', 'processing'];
    const busy = busyStates.includes(state);

    aiStemState = ready ? 'ready' : state;

    if (aiStemStatusText) {
      aiStemStatusText.textContent = status.message || (ready ? 'AI vokal ve beat hazır.' : 'Temiz vokal ve beat için AI ayırmayı başlatın.');
    }

    if (aiStemBadge) {
      if (ready) {
        aiStemBadge.textContent = 'AI Hazır';
        aiStemBadge.className = 'px-2 py-0.5 rounded-md border border-spotify/35 text-[9px] font-extrabold uppercase text-spotify bg-spotify/10';
      } else if (busy) {
        aiStemBadge.textContent = 'AI İşliyor';
        aiStemBadge.className = 'px-2 py-0.5 rounded-md border border-cyan-500/35 text-[9px] font-extrabold uppercase text-cyan-400 bg-cyan-500/10';
      } else if (state === 'error') {
        aiStemBadge.textContent = 'AI Hata';
        aiStemBadge.className = 'px-2 py-0.5 rounded-md border border-red-500/35 text-[9px] font-extrabold uppercase text-red-400 bg-red-500/10';
      } else {
        aiStemBadge.textContent = 'AI Bekliyor';
        aiStemBadge.className = 'px-2 py-0.5 rounded-md border border-cardborder text-[9px] font-extrabold uppercase text-gray-400 bg-darkbg';
      }
    }

    if (prepareAiBtn) {
      prepareAiBtn.disabled = busy;
      if (busy) {
        prepareAiBtn.className = 'px-3 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-xl font-extrabold text-[10px] flex items-center gap-1.5 border border-cyan-500/30 transition-all';
        prepareAiBtn.innerHTML = '<div class="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div><span>AI</span>';
      } else if (ready) {
        prepareAiBtn.className = 'px-3 py-2.5 bg-darkbg border border-spotify/35 text-spotify rounded-xl font-extrabold text-[10px] flex items-center gap-1.5 active:scale-95 transition-all';
        prepareAiBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Hazır</span>';
      } else {
        prepareAiBtn.className = 'px-3 py-2.5 bg-spotify text-darkbg rounded-xl font-extrabold text-[10px] flex items-center gap-1.5 shadow shadow-spotify/20 active:scale-95 transition-all';
        prepareAiBtn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i><span>AI Ayır</span>';
      }
      lucide.createIcons();
    }
  }

  function stopAiStemPolling() {
    if (aiStemPollTimer) {
      clearInterval(aiStemPollTimer);
      aiStemPollTimer = null;
    }
  }

  async function refreshAiStemStatus(song = getStudioSong()) {
    if (!song || !song.youtubeId) {
      setAiStemUi({ state: 'idle', message: 'Temiz vokal ve beat için AI ayırmayı başlatın.' });
      return null;
    }

    try {
      const response = await fetch(`/api/stems/status?id=${encodeURIComponent(song.youtubeId)}`);
      const status = await response.json();
      if (status.success) {
        setAiStemUi(status);
        return status;
      }
    } catch (err) {
      console.warn('AI stem status failed:', err);
    }

    return null;
  }

  function waitForAiReady(song) {
    return new Promise((resolve) => {
      const targetId = song.youtubeId;
      const startedAt = Date.now();
      stopAiStemPolling();

      aiStemPollTimer = setInterval(async () => {
        const currentSong = getStudioSong();
        if (!currentSong || currentSong.youtubeId !== targetId) {
          stopAiStemPolling();
          resolve(false);
          return;
        }

        const status = await refreshAiStemStatus(song);
        if (status?.ready || status?.state === 'ready') {
          stopAiStemPolling();
          resolve(true);
        } else if (status?.state === 'error') {
          stopAiStemPolling();
          showToast(status.message || 'AI ayırma tamamlanamadı.');
          resolve(false);
        } else if (Date.now() - startedAt > 20 * 60 * 1000) {
          stopAiStemPolling();
          showToast('AI ayırma zaman aşımına uğradı.');
          resolve(false);
        }
      }, 2200);
    });
  }

  async function prepareAiStems(song = getStudioSong(), silent = false) {
    if (!song || !song.youtubeId) {
      showToast('Lütfen önce bir şarkı yükleyin.');
      return false;
    }

    const currentStatus = await refreshAiStemStatus(song);
    if (currentStatus?.ready || currentStatus?.state === 'ready') {
      return true;
    }

    try {
      setAiStemUi({ state: 'queued', message: 'AI ayırma başlatılıyor.' });
      const response = await fetch('/api/stems/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: song.youtubeId, title: song.title })
      });
      const status = await response.json();

      if (!response.ok || !status.success) {
        throw new Error(status.error || 'AI ayırma başlatılamadı.');
      }

      setAiStemUi(status);
      const ready = await waitForAiReady(song);
      if (ready && !silent) {
        showToast('AI vokal ve beat hazır.');
      }
      return ready;
    } catch (err) {
      setAiStemUi({ state: 'error', message: err.message || 'AI ayırma başlatılamadı.' });
      showToast(err.message || 'AI ayırma başlatılamadı.');
      return false;
    }
  }

  function shiftKeyName(keyName, semitones) {
    const [root, ...modeParts] = String(keyName || '').split(' ');
    const keyIndex = chromaticKeys.indexOf(root);
    if (keyIndex === -1) return keyName || 'Bilinmiyor';

    const shiftedIndex = (keyIndex + semitones + chromaticKeys.length * 4) % chromaticKeys.length;
    const mode = modeParts.join(' ');
    return `${chromaticKeys[shiftedIndex]}${mode ? ` ${mode}` : ''}`;
  }

  function updateStudioControlsUI() {
    selectedBpm = Math.round(clampNumber(selectedBpm, 60, 200, detectedSongBpm));
    selectedPitch = Math.round(clampNumber(selectedPitch, -12, 12, 0));

    if (bpmSlider) bpmSlider.value = selectedBpm;
    if (bpmTargetVal) bpmTargetVal.textContent = selectedBpm;
    if (bpmValueText) bpmValueText.textContent = selectedBpm;
    if (keyShiftSelect) keyShiftSelect.value = String(selectedPitch);
    if (keyValueText) keyValueText.textContent = shiftKeyName(detectedSongKey, selectedPitch);

    if (bpmPulse) {
      const pulseDuration = 60 / selectedBpm;
      bpmPulse.style.animation = `pulse ${pulseDuration}s cubic-bezier(0.4, 0, 0.6, 1) infinite`;
    }
  }

  function getStudioEffectParams() {
    return {
      originalBpm: String(detectedSongBpm),
      targetBpm: String(selectedBpm),
      pitch: String(selectedPitch)
    };
  }

  function hasStudioEffects() {
    return selectedPitch !== 0 || selectedBpm !== detectedSongBpm;
  }

  function reloadPlayerWithStudioEffects(autoplay = false) {
    const song = getStudioSong();
    if (!song || !playerAudio) return;

    playerAudio.dataset.webAudioSafe = '1';
    playerAudio.src = getPlaybackUrl(song);
    playerAudio.load();

    if (autoplay) {
      playerAudio.play()
        .then(() => {
          if (playerPlayIcon) playerPlayIcon.setAttribute('data-lucide', 'pause');
          lucide.createIcons();
        })
        .catch((err) => {
          showToast('Ses oynatılamadı. Bağlantı tekrar deneniyor.');
          console.error(err);
        });
    }
  }

  function getPlaybackUrl(song) {
    const titleClean = `${song.artist || 'Bilinmeyen'} - ${song.title || 'Sarki'}`;
    const songMode = song.mode || 'original';
    if (!hasStudioEffects()) {
      if (songMode !== 'original') {
        const stemParams = new URLSearchParams({
          id: song.youtubeId,
          mode: songMode,
          ai: '1',
          format: 'm4a',
          play: '1',
          title: titleClean
        });
        return `/api/download?${stemParams.toString()}`;
      }

      const streamParams = new URLSearchParams({
        id: song.youtubeId,
        title: titleClean
      });
      return `/api/stream?${streamParams.toString()}`;
    }

    const params = new URLSearchParams({
      id: song.youtubeId,
      format: 'm4a',
      play: '1',
      title: titleClean,
      ...getStudioEffectParams()
    });

    if (songMode !== 'original') {
      params.set('mode', songMode);
      params.set('ai', '1');
      if (songMode === 'vocals') {
        params.set('vocalVol', '100');
        params.set('musicVol', '0');
      } else if (songMode === 'instrumental') {
        params.set('vocalVol', '0');
        params.set('musicVol', '100');
      }
    }

    return `/api/download?${params.toString()}`;
  }

  function updateMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Şarkı',
      artist: song.artist || 'Bilinmiyor',
      album: 'SpotiDown',
      artwork: song.thumbnail ? [
        { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });

    try {
      navigator.mediaSession.setActionHandler('play', () => playerAudio?.play());
      navigator.mediaSession.setActionHandler('pause', () => playerAudio?.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
      navigator.mediaSession.setActionHandler('previoustrack', () => seekRelative(-10));
      navigator.mediaSession.setActionHandler('nexttrack', () => seekRelative(10));
    } catch (err) {
      console.warn('Media Session handler setup failed:', err);
    }
  }

  function getStudioSong() {
    if (activeSongData) return activeSongData;
    if (localPlaylist.length > 0) return localPlaylist[playlistIdx] || localPlaylist[0];

    try {
      const historyArray = JSON.parse(localStorage.getItem('spotidown_history') || '[]');
      if (historyArray.length > 0) {
        localPlaylist = historyArray;
        playlistIdx = 0;
        return historyArray[0];
      }
    } catch (e) {
      console.error('Studio song lookup failed:', e);
    }

    return null;
  }

  // Sub-Tab Switcher - Menü Alt Sekme Değiştirici
  function switchSubtab(target) {
    if (activeSubtab === target) return;
    
    const subs = [
      { id: 'vocal', btn: subtabVocal, pane: paneVocal },
      { id: 'bpm', btn: subtabBpm, pane: paneBpm }
    ];

    subs.forEach(sub => {
      if (sub.id === target) {
        sub.btn.className = "flex-1 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 bg-spotify text-darkbg shadow shadow-spotify/20";
        sub.pane.classList.remove('hidden');
      } else {
        sub.btn.className = "flex-1 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 text-gray-400 hover:text-white";
        sub.pane.classList.add('hidden');
      }
    });

    activeSubtab = target;
    
    // Start Web Audio visually immediately if vocal (player) is active
    if (activeSubtab === 'vocal' && !visualizerInit) {
      setupVisualizerLoop();
    }
  }

  // Event bindings for subtabs
  if (subtabVocal) subtabVocal.addEventListener('click', () => switchSubtab('vocal'));
  if (subtabBpm) subtabBpm.addEventListener('click', () => switchSubtab('bpm'));

  // Slider actions - Canlı ses kanalı seviye değişimleri
  if (vocalSlider) {
    vocalSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      vocalVal.textContent = `${val}%`;
      setStemGain(vocalSplitVolumeNode, val);
      vocalsMuted = false; // Unmute if slider is moved
      muteVocalsIcon.setAttribute('data-lucide', 'volume-x');
      lucide.createIcons();
    });
  }

  if (musicSlider) {
    musicSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      musicVal.textContent = `${val}%`;
      setStemGain(musicSplitVolumeNode, val);
      musicMuted = false; // Unmute if slider is moved
      muteMusicIcon.setAttribute('data-lucide', 'volume-x');
      lucide.createIcons();
    });
  }

  // Mute/Unmute buttons
  if (muteMusicBtn) {
    muteMusicBtn.addEventListener('click', () => {
      if (musicMuted) {
        musicSlider.value = prevMusicVal;
        setStemGain(musicSplitVolumeNode, prevMusicVal);
        muteMusicIcon.setAttribute('data-lucide', 'volume-x');
        musicMuted = false;
      } else {
        prevMusicVal = musicSlider.value;
        musicSlider.value = 0;
        setStemGain(musicSplitVolumeNode, 0);
        muteMusicIcon.setAttribute('data-lucide', 'volume-2');
        musicMuted = true;
      }
      musicVal.textContent = `${musicSlider.value}%`;
      lucide.createIcons();
    });
  }

  if (muteVocalsBtn) {
    muteVocalsBtn.addEventListener('click', () => {
      if (vocalsMuted) {
        vocalSlider.value = prevVocalVal;
        setStemGain(vocalSplitVolumeNode, prevVocalVal);
        muteVocalsIcon.setAttribute('data-lucide', 'volume-x');
        vocalsMuted = false;
      } else {
        prevVocalVal = vocalSlider.value;
        vocalSlider.value = 0;
        setStemGain(vocalSplitVolumeNode, 0);
        muteVocalsIcon.setAttribute('data-lucide', 'volume-2');
        vocalsMuted = true;
      }
      vocalVal.textContent = `${vocalSlider.value}%`;
      lucide.createIcons();
    });
  }

  // Utility to format seconds into MM:SS format
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Load selected song into player (Now connects seek and duration metrics)
  function loadIntoPlayer(song) {
    if (!playerAudio) return;
    
    // Pre-calculate BPM and Key based on track name length/hash for realistic indicators
    const trackHash = (song.title + song.artist).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bpm = 75 + (trackHash % 70); // 75 - 145 BPM
    const keys = ['Do Majör', 'La Minör', 'Sol Majör', 'Mi Minör', 'Re Majör', 'Si Minör', 'La Majör', 'Fa# Minör', 'Fa Majör', 'Re Minör'];
    const ton = keys[trackHash % keys.length];

    detectedSongBpm = bpm;
    selectedBpm = bpm;
    detectedSongKey = ton;
    selectedPitch = 0;
    updateStudioControlsUI();

    // Set Audio Source
    const audioUrl = getPlaybackUrl(song);
    playerAudio.dataset.webAudioSafe = '1';
    playerAudio.src = audioUrl;
    playerAudio.load();

    // Set metadata on UI
    if (playerTitle) playerTitle.textContent = song.title;
    if (playerArtist) playerArtist.textContent = song.artist;
    
    // Reset range bar
    if (playerSeek) playerSeek.value = 0;
    if (playerTimeCurrent) playerTimeCurrent.textContent = "00:00";
    if (playerTimeTotal) playerTimeTotal.textContent = "00:00";

    // Reset mute states and sliders
    musicMuted = false;
    vocalsMuted = false;
    if (musicSlider) musicSlider.value = 100;
    if (vocalSlider) vocalSlider.value = 100;
    updateStemLabels();
    if (muteMusicIcon) muteMusicIcon.setAttribute('data-lucide', 'volume-x');
    if (muteVocalsIcon) muteVocalsIcon.setAttribute('data-lucide', 'volume-x');
    setStemGain(musicSplitVolumeNode, 100);
    setStemGain(vocalSplitVolumeNode, 100);

    // Reset volume slider (init value)
    if (playerVolume) playerVolume.value = 80;
    if (playerAudio) playerAudio.volume = 0.8;

    // Pause state UI reset
    if (playerPlayIcon) playerPlayIcon.setAttribute('data-lucide', 'play');
    updateMediaSession(song);
    stopAiStemPolling();
    setAiStemUi({ state: 'idle', message: 'Temiz vokal ve beat için AI ayırmayı başlatın.' });
    refreshAiStemStatus(song);
    lucide.createIcons();
  }

  // Seek bar tracking and scrubbing events (İleri/Geri Sarma)
  if (playerSeek && playerAudio) {
    playerSeek.addEventListener('input', (e) => {
      const pct = e.target.value;
      if (playerAudio.duration) {
        playerAudio.currentTime = (pct / 100) * playerAudio.duration;
      }
    });

    playerAudio.addEventListener('timeupdate', () => {
      if (playerAudio.duration) {
        const pct = (playerAudio.currentTime / playerAudio.duration) * 100;
        playerSeek.value = pct;
        playerTimeCurrent.textContent = formatTime(playerAudio.currentTime);
      }
    });

    playerAudio.addEventListener('loadedmetadata', () => {
      playerTimeTotal.textContent = formatTime(playerAudio.duration);
    });
  }

  // Master Volume slider tracking (Ses Şiddeti Kontrolü)
  if (playerVolume && playerAudio) {
    playerVolume.addEventListener('input', (e) => {
      const val = e.target.value;
      playerAudio.volume = val / 100;
    });
  }

  if (bpmSlider) {
    bpmSlider.addEventListener('input', (e) => {
      selectedBpm = Math.round(clampNumber(e.target.value, 60, 200, detectedSongBpm));
      updateStudioControlsUI();
    });
  }

  if (keyShiftSelect) {
    keyShiftSelect.addEventListener('change', (e) => {
      selectedPitch = Math.round(clampNumber(e.target.value, -12, 12, 0));
      updateStudioControlsUI();
    });
  }

  if (studioApplyBtn) {
    studioApplyBtn.addEventListener('click', async () => {
      const song = getStudioSong();
      if (!song) {
        showToast('Lütfen önce bir şarkı yükleyin.');
        return;
      }

      const shouldResume = playerAudio && playerAudio.src && !playerAudio.paused;
      reloadPlayerWithStudioEffects(shouldResume);
      showToast('BPM ve ton ayarları uygulandı.');
    });
  }

  if (studioResetBtn) {
    studioResetBtn.addEventListener('click', () => {
      selectedBpm = detectedSongBpm;
      selectedPitch = 0;
      updateStudioControlsUI();

      const shouldResume = playerAudio && playerAudio.src && !playerAudio.paused;
      reloadPlayerWithStudioEffects(shouldResume);
    });
  }

  // HTML5 Web Audio API setup - Canlı ses çözümleyici ve interaktif ayırıcı mikser
  if (prepareAiBtn) {
    prepareAiBtn.addEventListener('click', async () => {
      await prepareAiStems(getStudioSong());
    });
  }

  function initAudioNodes() {
    if (sourceNode && analyserNode) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      analyserNode = audioCtx.createAnalyser();
      
      // Connect element to context
      sourceNode = audioCtx.createMediaElementSource(playerAudio);

      const splitter = audioCtx.createChannelSplitter(2);
      sourceNode.connect(splitter);

      // Music/beat path: stereo side signal (L-R / R-L), with a little mono bass restored.
      const musicMerger = audioCtx.createChannelMerger(2);
      const leftToMusic = audioCtx.createGain();
      const rightToMusicLeft = audioCtx.createGain();
      const rightToMusic = audioCtx.createGain();
      const leftToMusicRight = audioCtx.createGain();
      leftToMusic.gain.value = 0.9;
      rightToMusicLeft.gain.value = -0.9;
      rightToMusic.gain.value = 0.9;
      leftToMusicRight.gain.value = -0.9;

      splitter.connect(leftToMusic, 0);
      splitter.connect(rightToMusicLeft, 1);
      leftToMusic.connect(musicMerger, 0, 0);
      rightToMusicLeft.connect(musicMerger, 0, 0);

      splitter.connect(rightToMusic, 1);
      splitter.connect(leftToMusicRight, 0);
      rightToMusic.connect(musicMerger, 0, 1);
      leftToMusicRight.connect(musicMerger, 0, 1);

      const bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 180;
      const bassGain = audioCtx.createGain();
      bassGain.gain.value = 0.25;

      musicSplitVolumeNode = audioCtx.createGain();
      musicSplitVolumeNode.gain.setValueAtTime(getSliderPercent(musicSlider) / 100, audioCtx.currentTime);
      musicMerger.connect(musicSplitVolumeNode);
      sourceNode.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(musicSplitVolumeNode);

      // Vocal path: centered mono content, narrowed to the usual vocal body range.
      const vocalFromLeft = audioCtx.createGain();
      const vocalFromRight = audioCtx.createGain();
      vocalFromLeft.gain.value = 0.5;
      vocalFromRight.gain.value = 0.5;

      const vocalHighpass = audioCtx.createBiquadFilter();
      vocalHighpass.type = 'highpass';
      vocalHighpass.frequency.value = 140;

      const vocalLowpass = audioCtx.createBiquadFilter();
      vocalLowpass.type = 'lowpass';
      vocalLowpass.frequency.value = 7200;

      vocalSplitVolumeNode = audioCtx.createGain();
      vocalSplitVolumeNode.gain.setValueAtTime(getSliderPercent(vocalSlider) / 100, audioCtx.currentTime);

      splitter.connect(vocalFromLeft, 0);
      splitter.connect(vocalFromRight, 1);
      vocalFromLeft.connect(vocalHighpass);
      vocalFromRight.connect(vocalHighpass);
      vocalHighpass.connect(vocalLowpass);
      vocalLowpass.connect(vocalSplitVolumeNode);

      vocalSplitVolumeNode.connect(analyserNode);
      musicSplitVolumeNode.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      analyserNode.fftSize = 64; // thick visualizer bars for premium mobile UI
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      
      console.log('Web Audio API Nodes mapped successfully!');
    } catch (err) {
      console.warn('Web Audio API is not supported in this browser context:', err);
      audioCtx = null;
      analyserNode = null;
      sourceNode = null;
      vocalSplitVolumeNode = null;
      musicSplitVolumeNode = null;
    }
  }

  // Play/Pause Controller triggers
  if (playerPlayBtn) {
    playerPlayBtn.addEventListener('click', async () => {
      if (!playerAudio.src) {
        const song = getStudioSong();
        if (song) {
          loadIntoPlayer(song);
        } else {
          showToast('Lütfen önce "Şarkı İndir" sekmesinden bir şarkı aratın veya geçmişten bir şarkı açın!');
          return;
        }
      }

      // Initialize Web Audio context on user interactions (required by all mobile browsers)
      initAudioVisualizer();

      if (playerAudio.paused) {
        try {
          if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          await playerAudio.play();
          playerPlayIcon.setAttribute('data-lucide', 'pause');
        } catch (playErr) {
          showToast('Ses oynatılamadı. Linkin aktifliğini denetleyin.');
          console.error(playErr);
        }
      } else {
        playerAudio.pause();
        playerPlayIcon.setAttribute('data-lucide', 'play');
      }
      lucide.createIcons();
    });
  }

  // Setup visualizer loop drawing double-sided Siri-esque glowing neon waves or actual frequencies
  function initAudioVisualizer() {
    if (playerAudio?.dataset?.webAudioSafe === '1') {
      initAudioNodes();
    }
    if (!visualizerInit) {
      setupVisualizerLoop();
    }
  }

  function setupVisualizerLoop() {
    if (!waveformCanvas || !canvasCtx || visualizerInit) return;
    visualizerInit = true;
    
    // Draw visual loop
    function renderWaveframe() {
      requestAnimationFrame(renderWaveframe);
      
      const width = waveformCanvas.width;
      const height = waveformCanvas.height;
      
      if (!canvasCtx) return;

      // Draw background
      canvasCtx.fillStyle = '#090A0F';
      canvasCtx.fillRect(0, 0, width, height);

      // Check if music is playing
      const isPlaying = playerAudio && !playerAudio.paused;

      if (isPlaying && analyserNode) {
        // 1. Drawing REAL TIME audio frequencies (Double-sided mirrored audio bars)
        analyserNode.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 0.9;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.8;
          if (barHeight < 3) barHeight = 3; // minimum height

          // Double color gradients
          const baseColor = themeColors[accentColor].hex;
          const grad = canvasCtx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#090A0F');
          grad.addColorStop(0.5, baseColor);
          grad.addColorStop(1, '#22d3ee'); // cyan highlight
          
          canvasCtx.fillStyle = grad;

          // Draw double sided mirrored bar
          const yPos = (height - barHeight) / 2;
          
          // Outer glow shadow
          canvasCtx.shadowBlur = 4;
          canvasCtx.shadowColor = baseColor;

          canvasCtx.fillRect(x, yPos, barWidth - 1.5, barHeight);
          
          x += barWidth;
        }
        canvasCtx.shadowBlur = 0; // reset shadow
      } else {
        // 2. Drawing IDLE elegant synthesized Apple-music waves if stopped or loading
        drawIdleSiriWave(width, height);
      }
    }

    renderWaveframe();
  }

  function drawIdleSiriWave(width, height) {
    idlePhase += 0.05; // scrolling phase speed
    canvasCtx.shadowBlur = 0;

    // Draw 3 layers of smooth scrolling sine waves
    const waves = [
      { amplitude: 12, frequency: 0.02, color: themeColors[accentColor].hex, opacity: 0.6 },
      { amplitude: 8, frequency: 0.035, color: '#22d3ee', opacity: 0.4 },
      { amplitude: 5, frequency: 0.012, color: '#a855f7', opacity: 0.2 } // purple
    ];

    waves.forEach(w => {
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = w.color;
      canvasCtx.globalAlpha = w.opacity;
      canvasCtx.lineWidth = 2.5;
      
      // Siri glow
      canvasCtx.shadowBlur = 8;
      canvasCtx.shadowColor = w.color;

      for (let x = 0; x < width; x++) {
        // calculate y coordinate with a sine wave formula centered vertically
        const y = (height / 2) + Math.sin(x * w.frequency + idlePhase) * w.amplitude;
        if (x === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
      canvasCtx.stroke();
    });
    
    // reset global settings
    canvasCtx.globalAlpha = 1.0;
    canvasCtx.shadowBlur = 0;
  }

  // Playlist Navigation Buttons (Prev & Next)
  function seekRelative(seconds) {
    if (!playerAudio || !playerAudio.src) return false;
    const duration = Number.isFinite(playerAudio.duration) ? playerAudio.duration : null;
    const nextTime = Math.max(0, duration ? Math.min(duration - 0.25, playerAudio.currentTime + seconds) : playerAudio.currentTime + seconds);
    playerAudio.currentTime = nextTime;
    return true;
  }

  if (playerPrev) {
    playerPrev.addEventListener('click', () => {
      seekRelative(-10);
    });
  }

  if (playerNext) {
    playerNext.addEventListener('click', () => {
      seekRelative(10);
    });
  }

  // Helper inside click handlers to trigger a dynamic vocal and instrumental stem download from YouTube
  async function triggerStemDownload(mode, btn) {
    const song = getStudioSong();
    if (!song || !song.youtubeId) {
      showToast('Lütfen önce bir şarkı yükleyin.');
      return;
    }

    const titleClean = `${song.artist} - ${song.title}`;
    let vocalVolParam = getSliderPercent(vocalSlider);
    let musicVolParam = getSliderPercent(musicSlider);

    if (mode === 'vocals') {
      vocalVolParam = vocalVolParam > 0 ? vocalVolParam : 100;
      musicVolParam = 0;
    } else if (mode === 'instrumental') {
      vocalVolParam = 0;
      musicVolParam = musicVolParam > 0 ? musicVolParam : 100;
    } else if (mode === 'mix' && vocalVolParam === 0 && musicVolParam === 0) {
      showToast('Miksi kaydetmek için en az bir kanalı açık bırakın.');
      return;
    }

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <div class="w-4 h-4 border-2 border-darkbg border-t-transparent rounded-full animate-spin"></div>
      <span>AI hazırlanıyor...</span>
    `;

    const aiReady = await prepareAiStems(song, true);
    if (!aiReady) {
      btn.disabled = false;
      btn.innerHTML = originalContent;
      return;
    }

    const params = new URLSearchParams({
      id: song.youtubeId,
      mode,
      ai: '1',
      vocalVol: String(vocalVolParam),
      musicVol: String(musicVolParam),
      format: defaultFormat,
      title: titleClean,
      ...getStudioEffectParams()
    });
    const downloadUrl = `/api/download?${params.toString()}`;
    
    btn.innerHTML = `
      <div class="w-4 h-4 border-2 border-darkbg border-t-transparent rounded-full animate-spin"></div>
      <span>İndiriliyor...</span>
    `;

    // Start download window redirect
    saveToHistory(song, defaultFormat, mode, true);
    window.location.href = downloadUrl;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 8500);
  }

  // Bind Stem Download buttons click listeners
  if (downloadVocalsBtn) {
    downloadVocalsBtn.addEventListener('click', () => {
      triggerStemDownload('vocals', downloadVocalsBtn);
    });
  }

  if (downloadInstBtn) {
    downloadInstBtn.addEventListener('click', () => {
      triggerStemDownload('instrumental', downloadInstBtn);
    });
  }

  // Bind Mix Download button click listener
  if (downloadMiksBtn) {
    downloadMiksBtn.addEventListener('click', () => {
      triggerStemDownload('mix', downloadMiksBtn);
    });
  }
});
