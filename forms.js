/* ==========================================================================
   NextGen Engineering — sign-up page
   Tab switching plus Web3Forms submission with inline success/error states.
   ========================================================================== */

(function () {
  'use strict';

  var ENDPOINT = 'https://api.web3forms.com/submit';

  var EMAIL = 'hello@nextgenengineering.org';
  var MAILTO = '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>';

  var CONFIRMATIONS = {
    student: {
      heading: 'Thanks — we got the sign-up.',
      message: 'We’ll email the parent or guardian address you gave us within a few days ' +
               'with next steps and upcoming session dates.'
    },
    presentation: {
      heading: 'Thanks — we got your request.',
      message: 'We’ll be in touch within a few days to talk through dates, topics, and what ' +
               'we’ll bring. If it’s time-sensitive, email us directly at ' + MAILTO + '.'
    },
    sponsor: {
      heading: 'Thanks — we got your inquiry.',
      message: 'We’ll follow up within a few days with our EIN, a W-9, and a written ' +
               'acknowledgment for your records. Questions in the meantime? Email us at ' +
               MAILTO + '.'
    }
  };

  /* --- Tabs --------------------------------------------------------------- */

  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    if (!tabs.length) return;

    function select(name, focusTab) {
      tabs.forEach(function (tab) {
        var active = tab.dataset.form === name;
        tab.setAttribute('aria-selected', String(active));
        // Only the selected tab stays in the tab order; arrow keys move between them.
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
        if (active && focusTab) tab.focus();
      });

      // Keep the URL shareable so footer and CTA links land on the right form.
      var url = new URL(location.href);
      if (name === 'student') url.searchParams.delete('form');
      else url.searchParams.set('form', name);
      history.replaceState(null, '', url);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab.dataset.form, false); });

      tab.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        select(next.dataset.form, true);
      });
    });

    var requested = new URLSearchParams(location.search).get('form');
    var known = tabs.some(function (t) { return t.dataset.form === requested; });
    select(known ? requested : 'student', false);
  }

  /* --- Submission --------------------------------------------------------- */

  function showStatus(box, kind, heading, message) {
    box.className = 'js-form-status form-status' + (kind === 'error' ? ' form-status--error' : '');
    box.innerHTML = '<h3>' + heading + '</h3><p>' + message + '</p>';
  }

  function initForms() {
    document.querySelectorAll('.js-w3form').forEach(function (form) {
      var status = form.querySelector('.js-form-status');
      var button = form.querySelector('.js-submit');
      var label  = form.dataset.label;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // novalidate is set so we can control when the browser's own messages
        // appear — this triggers them on submit rather than on every blur.
        if (!form.checkValidity()) {
          form.reportValidity();
          var firstBad = form.querySelector(':invalid');
          if (firstBad) firstBad.focus();
          return;
        }

        var original = button.textContent;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Sending…';
        status.className = 'js-form-status';
        status.innerHTML = '';

        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.success) throw new Error(data.message || 'Submission was rejected.');

            var confirmation = CONFIRMATIONS[label] || CONFIRMATIONS.presentation;
            var heading = confirmation.heading;
            var message = confirmation.message;

            // Replace the form entirely — there is nothing left to do here.
            form.innerHTML = '';
            form.appendChild(status);
            showStatus(status, 'success', heading, message);
            status.setAttribute('tabindex', '-1');
            status.focus();
            status.scrollIntoView({ block: 'center', behavior: 'smooth' });
          })
          .catch(function (err) {
            console.error('[NextGen] Form submission failed:', err);
            showStatus(status, 'error', 'That didn’t go through.',
              'Something went wrong on the way to our inbox. Please try again, or email us directly at ' +
              MAILTO + ' and we’ll pick it up from there.');
          })
          .then(function () {
            button.removeAttribute('aria-busy');
            button.textContent = original;
          });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initForms();
  });
})();
