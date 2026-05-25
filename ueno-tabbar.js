(function () {
  if (window.self !== window.top || new URLSearchParams(location.search).get('embedded') === '1') {
    return;
  }

  const APPS = [
    { label: 'Home', href: '上野清掃2.1.html' },
    { label: '計量', href: 'index_3-16.html' },
    { label: '物件表', href: 'index_2-3_bukken.html' },
    { label: '列選択', href: 'index_2-4_colview.html' },
    { label: 'メモ', href: 'index_5-1.html' }
  ];
  const EXTRA_KEY = 'ueno_seisou_tabbar_extra_v1';
  const BAR_HEIGHT = 52;

  function currentFile() {
    const file = decodeURIComponent(location.pathname.split('/').pop() || '');
    return file || '上野清掃2.1.html';
  }

  function loadExtraTabs() {
    try {
      const tabs = JSON.parse(localStorage.getItem(EXTRA_KEY) || '[]');
      return Array.isArray(tabs) ? tabs : [];
    } catch (e) {
      return [];
    }
  }

  function saveExtraTabs(tabs) {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(tabs));
  }

  function addStyles() {
    if (document.getElementById('ueno-global-tabbar-style')) return;
    const style = document.createElement('style');
    style.id = 'ueno-global-tabbar-style';
    style.textContent = `
      body { padding-top: ${BAR_HEIGHT}px !important; }
      body > .header,
      body > #app-header,
      body > header {
        top: ${BAR_HEIGHT}px !important;
      }
      body > #toolbar {
        top: ${BAR_HEIGHT + 46}px !important;
      }
      body > #colPanel {
        top: ${BAR_HEIGHT + 88}px !important;
      }
      .ueno-global-tabbar {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: ${BAR_HEIGHT}px !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        padding: 7px 9px !important;
        background: linear-gradient(180deg, rgba(248,251,255,0.97), rgba(224,236,250,0.97)) !important;
        border: none !important;
        border-bottom: 1px solid #b8cce4 !important;
        border-radius: 0 !important;
        box-shadow: 0 2px 10px rgba(15, 74, 128, 0.22) !important;
        backdrop-filter: blur(12px) !important;
        font-family: 'Hiragino Sans', 'Meiryo', sans-serif !important;
        -webkit-text-size-adjust: 100%;
      }
      .ueno-tab-list {
        flex: 1 !important;
        display: flex !important;
        gap: 6px !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        -webkit-overflow-scrolling: touch !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
      }
      .ueno-tab-list::-webkit-scrollbar { display: none; }
      .ueno-tab,
      .ueno-tab-add {
        border: 1px solid #adc4df !important;
        font-family: inherit !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        -webkit-tap-highlight-color: transparent !important;
        background-image: none !important;
      }
      .ueno-tab {
        min-width: 72px !important;
        max-width: 118px !important;
        height: 38px !important;
        padding: 0 10px !important;
        border-radius: 11px !important;
        background: #fff !important;
        color: #31506f !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .ueno-tab.active {
        background: linear-gradient(135deg, #1a6eb5, #0f4a80) !important;
        color: #fff !important;
        border-color: #0f4a80 !important;
        box-shadow: 0 2px 8px rgba(15, 74, 128, 0.24) !important;
      }
      .ueno-tab-add {
        width: 38px !important;
        height: 38px !important;
        flex: 0 0 38px !important;
        border-radius: 50% !important;
        background: #fff !important;
        color: #0f4a80 !important;
        font-size: 24px !important;
        line-height: 1 !important;
        border: 1px solid #adc4df !important;
      }
      @media (max-width: 420px) {
        .ueno-global-tabbar { height: 50px !important; padding: 6px 7px !important; gap: 5px !important; }
        body { padding-top: 50px !important; }
        body > .header,
        body > #app-header,
        body > header { top: 50px !important; }
        body > #toolbar { top: 96px !important; }
        body > #colPanel { top: 138px !important; }
        .ueno-tab { min-width: 64px !important; max-width: 104px !important; height: 37px !important; padding: 0 8px !important; font-size: 11px !important; }
        .ueno-tab-add { width: 37px !important; height: 37px !important; flex-basis: 37px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildTab(tab) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ueno-tab${tab.href === currentFile() ? ' active' : ''}`;
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      if (tab.href !== currentFile()) location.href = tab.href;
    });
    return button;
  }

  function render() {
    addStyles();
    const old = document.getElementById('uenoGlobalTabbar');
    if (old) old.remove();

    const bar = document.createElement('nav');
    bar.id = 'uenoGlobalTabbar';
    bar.className = 'ueno-global-tabbar';
    bar.setAttribute('aria-label', 'ソフト切替タブ');

    const list = document.createElement('div');
    list.className = 'ueno-tab-list';
    [...APPS, ...loadExtraTabs()].forEach((tab) => list.appendChild(buildTab(tab)));

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'ueno-tab-add';
    add.setAttribute('aria-label', 'タブを追加');
    add.textContent = '+';
    add.addEventListener('click', () => {
      const tabs = loadExtraTabs();
      const file = currentFile();
      const app = APPS.find((item) => item.href === file);
      tabs.push({ label: `Tab ${tabs.length + 1}`, href: file, base: app ? app.label : file });
      saveExtraTabs(tabs);
      render();
    });

    bar.appendChild(list);
    bar.appendChild(add);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
