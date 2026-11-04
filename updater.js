'use strict';
(() => {
  const base = new URL('./', location.href);
  const files = ['index.html', 'game.js', 'style.css', 'updater.js'];
  let baseline = null, checking = false, pending = false, reloading = false, lastCheck = 0;
  const banner = document.createElement('div');
  banner.id = 'updateStatus';
  banner.setAttribute('role', 'status');
  banner.hidden = true;
  document.body.appendChild(banner);
  const freshURL = file => {
    const url = new URL(file, base);
    url.searchParams.set('_release', Date.now().toString());
    return url;
  };
  async function signature(file) {
    const url = freshURL(file);
    let response = await fetch(url, {method:'HEAD', cache:'no-store'});
    let isHead = true;
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {cache:'no-store'}); isHead = false;
    }
    if (!response.ok) throw new Error('Update check unavailable');
    const tag = response.headers.get('etag');
    if (tag) return tag;
    if (isHead) response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw new Error('Update check unavailable');
    const body = await response.text();
    let hash = 2166136261;
    for (let i=0;i<body.length;i++) hash = Math.imul(hash ^ body.charCodeAt(i),16777619);
    return hash.toString(16);
  }
  function applyPending() {
    if (!pending || reloading) return;
    if (typeof window.canApplyGameUpdate !== 'function' || !window.canApplyGameUpdate()) return;
    reloading = true;
    banner.hidden = false;
    banner.textContent = '새 버전을 불러오는 중…';
    const url = new URL(location.href);
    url.searchParams.set('_updated',Date.now().toString());
    location.replace(url.href);
  }
  async function check() {
    if (checking || pending || document.hidden) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const current = await Promise.all(files.map(signature));
      if (baseline && current.some((value,i)=>value!==baseline[i])) {
        pending = true;
        banner.hidden = false;
        banner.textContent = '업데이트 준비됨 · 타이틀로 돌아오면 자동 적용';
        applyPending();
      } else if (!baseline) baseline = current;
    } catch (_) {
      // Keep playing if the connection or deployment is temporarily unavailable.
    } finally { checking = false; }
  }
  const stylesheet = document.querySelector('link[rel="stylesheet"]');
  if (stylesheet) stylesheet.href = freshURL('style.css').href;
  const script = document.createElement('script');
  script.src = freshURL('game.js').href;
  script.onload = () => {
    const clean = new URL(location.href);
    if (clean.searchParams.has('_updated')) {
      clean.searchParams.delete('_updated');
      history.replaceState(null,'',clean.href);
    }
    check();
    setInterval(check,60000);
    setInterval(applyPending,1000);
    const checkOnReturn = () => {
      if (!document.hidden && Date.now()-lastCheck>15000) check();
    };
    addEventListener('focus',checkOnReturn);
    document.addEventListener('visibilitychange',checkOnReturn);
  };
  script.onerror = () => {
    banner.hidden = false;
    banner.textContent = '게임을 불러오지 못했습니다. 연결을 확인한 뒤 새로고침해 주세요.';
  };
  document.body.appendChild(script);
})();
