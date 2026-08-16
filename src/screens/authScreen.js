export function createAuthScreen({ eyebrow, title, description, content }) {
  const page = document.createElement('main');
  page.className = 'auth-page';
  page.innerHTML = `
    <section class="auth-panel">
      <a class="auth-brand" href="#/login" aria-label="Понемногу">
        <img src="/assets/avatar/fx/brand_mark.png" alt="" />
        <span>Понемногу</span>
      </a>
      <div class="auth-copy">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${content}
    </section>
  `;
  return page;
}

export function setFormStatus(form, message, type = 'error') {
  const status = form.querySelector('[data-form-status]');
  status.textContent = message;
  status.dataset.type = message ? type : '';
}

export function setFormPending(form, pending) {
  form.querySelectorAll('button').forEach((button) => {
    button.disabled = pending;
  });
  form.setAttribute('aria-busy', String(pending));
}
