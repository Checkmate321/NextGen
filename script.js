/* ==========================================================================
   NextGen Engineering — shared site behavior
   Loads the logo sprite + header.html / footer.html, then wires up the nav.
   Requires a local server: fetch() does not work over file://
   ========================================================================== */

(function () {
  'use strict';

  /* --- Shared includes --------------------------------------------------- */

  // Header and footer load in parallel; nav init waits for the header markup
  // to actually be in the DOM, otherwise the toggle button doesn't exist yet.
  function inject(url, targetSelector) {
    var target = document.querySelector(targetSelector);
    if (!target) return Promise.resolve(false);

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error(url + ' → ' + res.status);
        return res.text();
      })
      .then(function (html) {
        target.innerHTML = html;
        return true;
      })
      .catch(function (err) {
        console.error('[NextGen] Could not load ' + url + '.', err);
        console.error('[NextGen] If you opened this file directly, run a local server instead: python3 -m http.server 8000');
        return false;
      });
  }

  // The logo sprite defines #nextgen-mark, which pages reference through <use>
  // from the header, the 501(c)(3) box, and the lesson cards. It has to be in
  // the document itself: Safari does not resolve <use> across files.
  function injectSprite(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error(url + ' → ' + res.status);
        return res.text();
      })
      .then(function (svg) {
        var holder = document.createElement('div');
        holder.innerHTML = svg;
        document.body.insertBefore(holder, document.body.firstChild);
        return true;
      })
      .catch(function (err) {
        console.error('[NextGen] Could not load ' + url + '.', err);
        return false;
      });
  }

  /* --- Mobile nav toggle ------------------------------------------------- */

  var mobileQuery = window.matchMedia('(max-width: 720px)');

  function initNav() {
    var toggle = document.querySelector('.nav__toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.hidden = !open;
    }

    // The menu is only collapsible on small screens; on desktop it is always
    // visible and `hidden` must never be set.
    function syncToViewport() {
      if (mobileQuery.matches) {
        setOpen(false);
      } else {
        toggle.setAttribute('aria-expanded', 'false');
        nav.hidden = false;
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Tapping a link, pressing Escape, or clicking away closes the menu.
    nav.addEventListener('click', function (e) {
      if (mobileQuery.matches && e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!mobileQuery.matches) return;
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('#primary-nav') || e.target.closest('.nav__toggle')) return;
      setOpen(false);
    });

    mobileQuery.addEventListener('change', syncToViewport);
    syncToViewport();
  }

  /* --- Active page marker ------------------------------------------------ */

  function markActiveLink() {
    var here = location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav__link').forEach(function (link) {
      var target = link.getAttribute('href').split('#')[0];
      if (!target) return;
      // Plain "Home" should not light up when the URL is index.html#about.
      if (target === here && !(link.hash && link.hash !== location.hash)) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* --- Hero model --------------------------------------------------------- */

  // model-viewer has no reduced-motion handling of its own, so a spinning logo
  // would keep spinning for people who asked the OS to stop animation. The
  // model stays interactive either way — dragging it is a deliberate act.
  function initHeroModel() {
    var model = document.querySelector('.hero__model');
    if (!model) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function sync() {
      if (reduced.matches) {
        model.removeAttribute('auto-rotate');
      } else {
        model.setAttribute('auto-rotate', '');
      }
    }

    reduced.addEventListener('change', sync);
    sync();
  }

  /* --- Small conveniences ------------------------------------------------ */

  function setYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* --- Boot -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    var base = document.body.dataset.base || '';

    initHeroModel();

    var sprite = injectSprite(base + 'files/logo-sprite.svg');

    var header = inject(base + 'header.html', '[data-include="header"]').then(function (ok) {
      if (!ok) return;
      initNav();
      markActiveLink();
    });

    var footer = inject(base + 'footer.html', '[data-include="footer"]').then(function (ok) {
      if (ok) setYear();
    });

    Promise.all([sprite, header, footer]).then(function () {
      document.body.classList.add('is-ready');
    });
  });
})();
