/* ==========================================================================
   NextGen Engineering — lesson library
   One JSON file feeds three views: the featured strip on the home page,
   the filterable grid on lessons.html, and the detail page on lesson.html.
   ========================================================================== */

(function () {
  'use strict';

  var DATA_URL = 'data/lessons.json';
  var cache = null;

  function loadLessons() {
    if (cache) return cache;
    cache = fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error(DATA_URL + ' → ' + res.status);
        return res.json();
      });
    return cache;
  }

  /* --- Helpers ----------------------------------------------------------- */

  // Everything from the JSON goes through here before it touches innerHTML.
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function gradeLabel(band) {
    return 'Grades ' + band.replace('-', '–');
  }

  function thumb(lesson) {
    if (lesson.thumbnail) {
      return '<img src="' + esc(lesson.thumbnail) + '" alt="" loading="lazy">';
    }
    // No artwork yet — fall back to the logo mark so the card still reads
    // as designed rather than broken.
    return '<svg viewBox="0 0 600 600" aria-hidden="true"><use href="#nextgen-mark"></use></svg>';
  }

  function cardHTML(lesson) {
    return '' +
      '<a class="card card--link lesson-card" href="lesson.html?id=' + esc(lesson.id) + '">' +
        '<div class="lesson-card__thumb">' + thumb(lesson) + '</div>' +
        '<div class="lesson-card__body">' +
          '<div class="card-tags">' +
            '<span class="tag">' + esc(lesson.subject) + '</span>' +
            '<span class="tag">' + esc(gradeLabel(lesson.gradeBand)) + '</span>' +
          '</div>' +
          '<h3>' + esc(lesson.title) + '</h3>' +
          '<p>' + esc(lesson.summary) + '</p>' +
          '<div class="meta-row">' +
            '<span>' + esc(lesson.duration) + '</span>' +
            '<span>' + esc(lesson.difficulty) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function showError(el, message) {
    el.innerHTML =
      '<div class="empty-state" style="grid-column: 1 / -1">' +
        '<h3>Lessons could not be loaded</h3>' +
        '<p>' + esc(message) + '</p>' +
      '</div>';
  }

  /* --- Home page: featured strip ----------------------------------------- */

  function initFeatured() {
    var grid = document.getElementById('featured-grid');
    if (!grid) return;

    var limit = parseInt(grid.dataset.featured, 10) || 3;

    loadLessons().then(function (data) {
      var picks = data.lessons.filter(function (l) { return l.featured; });
      // Fall back to the first few if nothing is flagged featured yet.
      if (!picks.length) picks = data.lessons;
      grid.innerHTML = picks.slice(0, limit).map(cardHTML).join('');
    }).catch(function (err) {
      console.error('[NextGen]', err);
      showError(grid, 'Run the site through a local server — fetch() cannot read files over file://.');
    });
  }

  /* --- Lessons page: filterable grid -------------------------------------- */

  function initLibrary() {
    var grid = document.getElementById('lesson-grid');
    if (!grid) return;

    var count      = document.getElementById('results-count');
    var subjectSel = document.getElementById('filter-subject');
    var gradeSel   = document.getElementById('filter-grade');
    var searchBox  = document.getElementById('filter-search');
    var resetBtn   = document.getElementById('filter-reset');

    var all = [];

    function fillOptions(select, values, labelFn) {
      values.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = labelFn ? labelFn(v) : v;
        select.appendChild(opt);
      });
    }

    function matches(lesson, query) {
      if (subjectSel.value && lesson.subject !== subjectSel.value) return false;
      if (gradeSel.value && lesson.gradeBand !== gradeSel.value) return false;
      if (!query) return true;

      var haystack = [
        lesson.title,
        lesson.summary,
        lesson.subject,
        lesson.difficulty,
        (lesson.tags || []).join(' ')
      ].join(' ').toLowerCase();

      // Every word must appear somewhere, so "arduino sensor" narrows rather
      // than widens the results.
      return query.split(/\s+/).every(function (word) {
        return haystack.indexOf(word) !== -1;
      });
    }

    function render() {
      var query = searchBox.value.trim().toLowerCase();
      var shown = all.filter(function (l) { return matches(l, query); });

      count.textContent = shown.length === all.length
        ? 'Showing all ' + all.length + ' lessons'
        : 'Showing ' + shown.length + ' of ' + all.length + ' lessons';

      if (!shown.length) {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column: 1 / -1">' +
            '<h3>No lessons match those filters</h3>' +
            '<p>Try widening the subject or grade band, or clear the filters to start over.</p>' +
          '</div>';
        return;
      }

      grid.innerHTML = shown.map(cardHTML).join('');
    }

    loadLessons().then(function (data) {
      all = data.lessons;

      fillOptions(subjectSel, data.subjects);
      fillOptions(gradeSel, data.gradeBands, gradeLabel);

      // Deep links like lessons.html?subject=CAD arrive from the detail page.
      var params = new URLSearchParams(location.search);
      if (params.get('subject')) subjectSel.value = params.get('subject');
      if (params.get('grade'))   gradeSel.value   = params.get('grade');

      [subjectSel, gradeSel].forEach(function (el) {
        el.addEventListener('change', render);
      });
      searchBox.addEventListener('input', render);

      resetBtn.addEventListener('click', function () {
        subjectSel.value = '';
        gradeSel.value = '';
        searchBox.value = '';
        render();
      });

      render();
    }).catch(function (err) {
      console.error('[NextGen]', err);
      count.textContent = '';
      showError(grid, 'Run the site through a local server — fetch() cannot read files over file://.');
    });
  }

  /* --- Detail page -------------------------------------------------------- */

  function listHTML(items) {
    return '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
  }

  function notFound(id) {
    return '' +
      '<div class="container section">' +
        '<div class="empty-state">' +
          '<h3>' + (id ? 'That lesson could not be found' : 'No lesson was specified') + '</h3>' +
          '<p>' + (id ? 'The lesson &ldquo;' + esc(id) + '&rdquo; is not in our library.' : 'This page needs a lesson to display.') + '</p>' +
          '<p><a class="btn btn--primary" href="lessons.html">Back to all lessons</a></p>' +
        '</div>' +
      '</div>';
  }

  function renderDetail(lesson, data) {
    var hero = document.getElementById('lesson-hero');
    var body = document.getElementById('lesson-body');

    document.title = lesson.title + ' | NextGen Engineering';
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', lesson.summary);

    hero.innerHTML = '' +
      '<div class="container">' +
        '<p class="breadcrumb"><a href="lessons.html">All lessons</a> &rsaquo; ' + esc(lesson.subject) + '</p>' +
        '<div class="card-tags">' +
          '<span class="tag">' + esc(lesson.subject) + '</span>' +
          '<span class="tag">' + esc(gradeLabel(lesson.gradeBand)) + '</span>' +
        '</div>' +
        '<h1>' + esc(lesson.title) + '</h1>' +
        '<p class="hero__lede">' + esc(lesson.summary) + '</p>' +
        '<div class="meta-row">' +
          '<span>' + esc(lesson.duration) + '</span>' +
          '<span>' + esc(lesson.difficulty) + '</span>' +
          '<span>' + lesson.steps.length + ' steps</span>' +
        '</div>' +
      '</div>';

    var main = '';

    if (lesson.video) {
      main += '<div class="video-wrap"><iframe src="' + esc(lesson.video) +
              '" title="' + esc(lesson.title) + '" allowfullscreen loading="lazy"></iframe></div>';
    }

    main += '<div class="prose"><h2>Steps</h2></div><ol class="steps">' +
      lesson.steps.map(function (s) {
        return '<li class="step"><h3>' + esc(s.title) + '</h3><p>' + esc(s.body) + '</p></li>';
      }).join('') + '</ol>';

    var aside = '';

    if (lesson.objectives && lesson.objectives.length) {
      aside += '<div class="card"><h3>What students learn</h3>' + listHTML(lesson.objectives) + '</div>';
    }
    if (lesson.materials && lesson.materials.length) {
      aside += '<div class="card"><h3>Materials</h3>' + listHTML(lesson.materials) + '</div>';
    }
    if (lesson.downloads && lesson.downloads.length) {
      aside += '<div class="card"><h3>Downloads</h3><ul class="download-list">' +
        lesson.downloads.map(function (d) {
          return '<li><a href="' + esc(d.file) + '" download>' + esc(d.label) + '</a></li>';
        }).join('') + '</ul></div>';
    }

    aside += '<div class="card"><h3>Want us to teach this?</h3>' +
      '<p>We run this lesson in person across the Orlando area, free of charge.</p>' +
      '<p><a class="btn btn--primary btn--block" href="signup.html?form=presentation">Request a presentation</a></p></div>';

    body.innerHTML =
      '<div class="container">' +
        '<div class="lesson-layout">' +
          '<div>' + main + '</div>' +
          '<aside class="lesson-aside">' + aside + '</aside>' +
        '</div>' +
      '</div>';

    renderRelated(lesson, data);
  }

  function renderRelated(lesson, data) {
    var section = document.getElementById('related');
    var grid = document.getElementById('related-grid');
    if (!section || !grid) return;

    // Same subject first, then same grade band, capped at three.
    var others = data.lessons.filter(function (l) { return l.id !== lesson.id; });
    var ranked = others.slice().sort(function (a, b) {
      return score(b) - score(a);
    });

    function score(l) {
      return (l.subject === lesson.subject ? 2 : 0) + (l.gradeBand === lesson.gradeBand ? 1 : 0);
    }

    var picks = ranked.slice(0, 3);
    if (!picks.length) { section.hidden = true; return; }

    grid.innerHTML = picks.map(cardHTML).join('');
    section.hidden = false;
  }

  function initDetail() {
    var hero = document.getElementById('lesson-hero');
    if (!hero) return;

    var id = new URLSearchParams(location.search).get('id');
    var body = document.getElementById('lesson-body');

    if (!id) {
      hero.hidden = true;
      body.innerHTML = notFound(null);
      return;
    }

    loadLessons().then(function (data) {
      var lesson = data.lessons.find(function (l) { return l.id === id; });

      if (!lesson) {
        hero.hidden = true;
        document.title = 'Lesson not found | NextGen Engineering';
        body.innerHTML = notFound(id);
        return;
      }

      renderDetail(lesson, data);
    }).catch(function (err) {
      console.error('[NextGen]', err);
      hero.hidden = true;
      body.innerHTML = notFound(id);
    });
  }

  /* --- Boot --------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    initFeatured();
    initLibrary();
    initDetail();
  });
})();
