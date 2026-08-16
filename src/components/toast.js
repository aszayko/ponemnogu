export function createToastController() {
  const region = document.createElement('div');
  region.className = 'app-toast-region';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  let hideTimer = null;

  function show(message, tone = 'purple') {
    if (!message) return;
    window.clearTimeout(hideTimer);

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.dataset.tone = tone;
    toast.textContent = message;
    region.replaceChildren(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    hideTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        if (toast.parentElement === region) toast.remove();
      }, 180);
    }, 3800);
  }

  return { element: region, show };
}
