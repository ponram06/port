/* ═══════════════════════════════════════════════════════════════════════════
   PM — Portfolio Motion engine
   ---------------------------------------------------------------------------
   Reusable animation utilities for this portfolio. Content-agnostic: nothing
   in here knows about copy, only about selectors and motion recipes.

   Loaded after GSAP / ScrollTrigger / Lenis / SplitType, before js/script.js.
   Exposes `window.PM`.

     1. Environment + motion preferences
     2. Easing tokens
     3. Smooth scroll (Lenis <-> GSAP ticker)
     4. Text splitting + masked reveal primitives
     5. Reveal engine (declarative recipes)
     6. Parallax
     7. Magnetic elements
     8. Custom cursor
     9. Navigation behaviour
    10. Scroll progress
    11. Page-load choreography
    12. Lifecycle (resize / refresh / teardown)
   ═══════════════════════════════════════════════════════════════════════════ */

window.PM = (function () {
  'use strict';

  /* ── 1. Environment ───────────────────────────────────────────────────── */

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqCoarse = window.matchMedia('(hover: none), (pointer: coarse)');
  var mqMobile = window.matchMedia('(max-width: 768px)');
  var mqTablet = window.matchMedia('(max-width: 1024px)');

  var env = {
    get reduced() { return mqReduce.matches; },
    get touch() { return mqCoarse.matches; },
    get mobile() { return mqMobile.matches; },
    get tablet() { return mqTablet.matches; },
    /* Pointer-driven flourishes (cursor, magnetic, tilt) only make sense with
       a real hover-capable pointer on a reasonably large screen. */
    get pointerFX() { return !mqReduce.matches && !mqCoarse.matches && !mqTablet.matches; },
    /* Scroll-scrubbed 3D / parallax work is skipped on phones and when the
       visitor has asked for reduced motion. */
    get heavy() { return !mqReduce.matches && !mqMobile.matches; }
  };

  var root = document.documentElement;
  function syncEnvClasses() {
    root.classList.toggle('pm-reduced', env.reduced);
    root.classList.toggle('pm-touch', env.touch);
    /* The 3D orbit gallery is desktop-only; everything else gets the list. */
    root.classList.toggle('pm-cg-static', env.reduced || env.mobile);
  }
  syncEnvClasses();

  /* ── 2. Easing tokens (mirrors the motion tokens in css/motion.css) ───── */

  var EASE = {
    out: 'power3.out',
    strongOut: 'power4.out',
    expoOut: 'expo.out',
    inOut: 'power4.inOut',
    soft: 'power2.out'
  };

  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasSplit = typeof window.SplitType !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ── 3. Smooth scroll ─────────────────────────────────────────────────── */

  var lenis = null;

  function initSmoothScroll() {
    if (env.reduced || typeof window.Lenis === 'undefined' || !hasGSAP) return null;

    lenis = new Lenis({
      duration: 1.15,
      /* expo-out: fast pickup, long glide — the reference's signature feel */
      easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.8
    });

    if (hasST) lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  /* Works whether or not Lenis is active (reduced motion falls back to native) */
  function scrollTo(target, opts) {
    opts = opts || {};
    if (lenis) {
      lenis.scrollTo(target, {
        duration: opts.duration || 1.3,
        easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
        offset: opts.offset || 0
      });
      return;
    }
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    var y = typeof target === 'number' ? target
          : el ? el.getBoundingClientRect().top + window.pageYOffset : 0;
    window.scrollTo({ top: y + (opts.offset || 0), behavior: env.reduced ? 'auto' : 'smooth' });
  }

  /* ── 4. Text splitting + masked reveal primitives ─────────────────────── */

  /* Every split we create is tracked so it can be reverted on resize —
     line splits are width-dependent and go stale otherwise. */
  var splits = [];

  function splitLines(el) {
    if (!hasSplit) return null;
    var s = new SplitType(el, { types: 'lines' });
    (s.lines || []).forEach(function (line) {
      var mask = document.createElement('span');
      mask.className = 'pm-line-mask';
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
    });
    splits.push(s);
    return s;
  }

  function splitChars(el) {
    if (!hasSplit) return null;
    /* words+chars so each word can act as the clipping mask for its chars */
    var s = new SplitType(el, { types: 'words,chars' });
    el.classList.add('pm-mask-words');
    splits.push(s);
    return s;
  }

  function splitWords(el) {
    if (!hasSplit) return null;
    var s = new SplitType(el, { types: 'words' });
    splits.push(s);
    return s;
  }

  /* Masked lines containing individually animatable words — the reveal used
     for the intro's opening line. Each line clips its own words. */
  function splitMaskedWords(el) {
    if (!hasSplit) return null;
    var s = new SplitType(el, { types: 'lines,words' });
    (s.lines || []).forEach(function (line) {
      var mask = document.createElement('span');
      mask.className = 'pm-line-mask';
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
    });
    splits.push(s);
    return s;
  }

  function revertSplits() {
    splits.forEach(function (s) {
      try {
        /* unwrap the mask spans we injected before reverting */
        (s.lines || []).forEach(function (line) {
          var mask = line.parentNode;
          if (mask && mask.classList && mask.classList.contains('pm-line-mask')) {
            mask.parentNode.insertBefore(line, mask);
            mask.parentNode.removeChild(mask);
          }
        });
        s.revert();
      } catch (e) { /* a reverted split is not worth breaking the page over */ }
    });
    splits = [];
    document.querySelectorAll('.pm-mask-words').forEach(function (el) {
      el.classList.remove('pm-mask-words');
    });
  }

  /* Wrap an element in a one-shot clipping mask (used for the hero name).
     The mask is opened up afterwards so it can never clip later motion. */
  function maskOnce(el) {
    var mask = document.createElement('span');
    mask.className = 'pm-line-mask';
    el.parentNode.insertBefore(mask, el);
    mask.appendChild(el);
    return {
      el: el,
      mask: mask,
      open: function () { mask.style.overflow = 'visible'; }
    };
  }

  /* ── 5. Reveal engine ─────────────────────────────────────────────────── */

  var revealTriggers = [];

  function makeTrigger(trigger, animate, start) {
    if (!hasST) { animate(); return; }

    var fired = false;
    var run = function () {
      if (fired) return;
      fired = true;
      animate();
    };

    var st = ScrollTrigger.create({
      trigger: trigger,
      start: start || 'top 86%',
      once: true,
      onEnter: run
    });
    st.__pmRun = run;
    revealTriggers.push(st);
    return st;
  }

  /* A trigger whose start sits past the furthest scrollable position can never
     fire, which would leave its content hidden forever. That is a real risk for
     anything near the end of the document (the footer line sat within ~30px of
     it). After every refresh, force any such reveal to its final state.

     The margin is generous (not a couple of px) because the check itself can
     run against transitional geometry — e.g. mid-resize, while pinned
     sections are still recalculating their reserved height — where a trigger
     reads as reachable by a few px and then drifts out of reach as later
     layout passes settle. A wide margin costs nothing during normal
     scrolling (it only ever fires a reveal slightly before the visitor
     physically could have reached it); a narrow one risks leaving content
     hidden forever, which is the one outcome this function exists to rule
     out entirely. */
  function ensureReachable() {
    if (!hasST) return;
    var max = ScrollTrigger.maxScroll(window);
    revealTriggers.forEach(function (st) {
      if (!st || !st.__pmRun || !st.trigger) return;
      try {
        if (st.start >= max - 40) {
          st.__pmRun();
          st.kill();
        }
      } catch (e) { /* already killed */ }
    });
  }

  /* Guarantees content is visible no matter what goes wrong inside `fn`. */
  function safely(el, fn) {
    try { fn(); }
    catch (e) {
      if (window.console) console.warn('[PM] reveal failed, showing content:', e);
      if (hasGSAP) gsap.set(el, { clearProps: 'all' });
      el.style.opacity = '';
      el.style.transform = '';
    }
  }

  function markDone(targets) {
    return function () {
      (Array.isArray(targets) ? targets : [targets]).forEach(function (t) {
        if (t && t.classList) t.classList.add('pm-done');
      });
    };
  }

  /* -- individual recipes -------------------------------------------------- */

  function revealLines(el, o) {
    o = o || {};
    safely(el, function () {
      var s = splitLines(el);
      var items = (s && s.lines && s.lines.length) ? s.lines : [el];
      gsap.set(items, { yPercent: 105, opacity: o.fade === false ? 1 : 0 });
      makeTrigger(o.trigger || el, function () {
        gsap.to(items, {
          yPercent: 0,
          opacity: 1,
          duration: o.duration || 1.05,
          stagger: o.stagger != null ? o.stagger : 0.09,
          ease: o.ease || EASE.strongOut,
          delay: o.delay || 0,
          onComplete: markDone(items)
        });
      }, o.start);
    });
  }

  function revealChars(el, o) {
    o = o || {};
    safely(el, function () {
      var s = splitChars(el);
      var items = (s && s.chars && s.chars.length) ? s.chars : [el];
      gsap.set(items, { yPercent: 110 });
      makeTrigger(o.trigger || el, function () {
        gsap.to(items, {
          yPercent: 0,
          duration: o.duration || 0.95,
          stagger: o.stagger != null ? o.stagger : 0.022,
          ease: o.ease || EASE.strongOut,
          delay: o.delay || 0,
          onComplete: markDone(items)
        });
      }, o.start);
    });
  }

  /* Blur-to-sharp word cascade — used sparingly on lead statements. */
  function revealWordsBlur(el, o) {
    o = o || {};
    safely(el, function () {
      var s = splitWords(el);
      var items = (s && s.words && s.words.length) ? s.words : [el];
      gsap.set(items, { opacity: 0, filter: 'blur(7px)', yPercent: 18 });
      makeTrigger(o.trigger || el, function () {
        gsap.to(items, {
          opacity: 1,
          filter: 'blur(0px)',
          yPercent: 0,
          duration: o.duration || 0.85,
          stagger: o.stagger != null ? o.stagger : 0.045,
          ease: o.ease || EASE.out,
          delay: o.delay || 0,
          onComplete: markDone(items)
        });
      }, o.start);
    });
  }

  function revealFade(el, o) {
    o = o || {};
    safely(el, function () {
      var from = { opacity: 0 };
      from.y = o.y != null ? o.y : 34;
      if (o.x != null) from.x = o.x;
      gsap.set(el, from);
      el.classList.add('pm-anim');
      makeTrigger(o.trigger || el, function () {
        gsap.to(el, {
          opacity: 1, y: 0, x: 0,
          duration: o.duration || 0.95,
          ease: o.ease || EASE.out,
          delay: o.delay || 0,
          onComplete: markDone(el)
        });
      }, o.start);
    });
  }

  /* Staggered children — the workhorse for every grid and list. */
  function revealGroup(container, childSel, o) {
    o = o || {};
    var kids = Array.prototype.slice.call(container.querySelectorAll(childSel));
    if (!kids.length) return;
    /* Claim the children too, so the generic `.gs-reveal` fallback can't
       animate them a second time. */
    kids.forEach(claim);
    safely(container, function () {
      var from = { opacity: 0 };
      from.y = o.y != null ? o.y : 36;
      if (o.x != null) from.x = o.x;
      gsap.set(kids, from);
      kids.forEach(function (k) { k.classList.add('pm-anim'); });
      makeTrigger(o.trigger || container, function () {
        gsap.to(kids, {
          opacity: 1, y: 0, x: 0,
          duration: o.duration || 0.95,
          stagger: o.stagger != null ? o.stagger : 0.09,
          ease: o.ease || EASE.out,
          delay: o.delay || 0,
          onComplete: markDone(kids)
        });
      }, o.start);
    });
  }

  /* Transform-only line reveal: safe to layer on top of something that is
     already animating opacity (e.g. the scrubbed 3D scene overlay). */
  function revealLinesTransformOnly(el, o) {
    revealLines(el, Object.assign({ fade: false }, o || {}));
  }

  /* -- the recipe table ---------------------------------------------------- */

  var claimed = [];
  function claim(el) { if (el && claimed.indexOf(el) === -1) claimed.push(el); }

  /* -- About portrait --------------------------------------------------------
     A mask wipe, not a fade: the frame opens from its bottom edge while the
     photograph settles out of an oversized scale, so the curved edge is drawn
     rather than switched on. Three separate elements own three separate
     transforms — wrapper = parallax, mask = clip, image = scale/hover — so
     nothing ever fights over the same property. */
  function initAboutPortrait() {
    var wrap = document.getElementById('about-portrait');
    var mask = document.getElementById('about-portrait-mask');
    var img = document.getElementById('about-portrait-img');
    if (!wrap || !mask || !img || !hasGSAP || env.reduced) return;

    claim(wrap);

    safely(mask, function () {
      gsap.set(mask, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(img, { scale: 1.24, yPercent: 6 });

      makeTrigger(wrap, function () {
        gsap.timeline({ onComplete: bindHover })
          .to(mask, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out' }, 0)
          .to(img, { scale: 1, yPercent: 0, duration: 1.75, ease: 'expo.out' }, 0);
      }, 'top 76%');
    });

    /* Depth once it has settled — the portrait drifts against the copy. */
    parallax(wrap, { from: 44, to: -44, scrub: 1.1 });

    /* Hover is bound only after the reveal finishes, so it can never
       interrupt the settle tween on the same element. */
    function bindHover() {
      if (!env.pointerFX) return;
      var frame = null;
      var rect = null;

      function enter() { rect = mask.getBoundingClientRect(); }
      function move(e) {
        if (!rect) rect = mask.getBoundingClientRect();
        var cx = e.clientX, cy = e.clientY;
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          gsap.to(img, {
            scale: 1.055,
            xPercent: ((cx - rect.left) / rect.width - 0.5) * -3.4,
            yPercent: ((cy - rect.top) / rect.height - 0.5) * -3.4,
            duration: 0.8,
            ease: EASE.out,
            overwrite: 'auto'
          });
        });
      }
      function leave() {
        rect = null;
        if (frame) { cancelAnimationFrame(frame); frame = null; }
        gsap.to(img, {
          scale: 1, xPercent: 0, yPercent: 0,
          duration: 0.9, ease: EASE.out, overwrite: 'auto'
        });
      }

      mask.addEventListener('mouseenter', enter);
      mask.addEventListener('mousemove', move);
      mask.addEventListener('mouseleave', leave);
    }
  }

  var RECIPES = [
    /* About — the copy and the portrait are one coordinated entrance. The
       per-recipe delays are what stagger them: label, then heading, then
       lead, then the portrait starts opening, then the info blocks. */
    { sel: '#About .about-eyebrow', run: function (el) { revealFade(el, { y: 16, duration: 0.7, start: 'top 88%' }); } },
    { sel: '#About .about-title',   run: function (el) { revealLines(el, { duration: 1.15, stagger: 0.11, delay: 0.08, start: 'top 86%' }); } },
    { sel: '#About .about-lead',    run: function (el) { revealWordsBlur(el, { stagger: 0.038, delay: 0.2, start: 'top 86%' }); } },
    { sel: '#About .about-info',    run: function (el) { revealGroup(el, '.info-block', { y: 30, stagger: 0.12, delay: 0.3, start: 'top 84%' }); } },

    /* Stats */
    { sel: '.stats-grid', run: function (el) { revealGroup(el, '.stat-item', { y: 34, stagger: 0.09 }); } },

    /* Expertise */
    { sel: '.bento-grid',   run: function (el) { revealGroup(el, '.bento-box', { y: 42, stagger: 0.1 }); } },
    { sel: '#Expertise .skill-number',  run: function (el) { revealFade(el, { y: 22, duration: 0.8 }); } },
    { sel: '#Expertise .skill-heading', run: function (el) { revealLines(el, { duration: 0.9 }); } },
    { sel: '#Expertise .skill-desc',    run: function (el) { revealLines(el, { duration: 0.9, stagger: 0.07 }); } },

    /* 3D scene heading — transform only, the overlay owns opacity */
    { sel: '.scene-heading',  run: function (el) { revealLinesTransformOnly(el, { duration: 1.1, stagger: 0.1, start: 'top 90%' }); } },
    { sel: '.scene-subtitle', run: function (el) { revealFade(el, { y: 16, duration: 0.7, start: 'top 92%' }); } },

    /* Competitions */
    { sel: '#Competitions .massive-title', run: function (el) { revealChars(el, { stagger: 0.02, duration: 1 }); } },
    { sel: '.achievements-grid',           run: function (el) { revealGroup(el, '.info-block', { y: 38, stagger: 0.08 }); } },

    /* Hobbies */
    { sel: '.glitch-wrapper', run: function (el) { revealGroup(el, '.massive-title', { y: 44, stagger: 0.1 }); } },
    { sel: '.hobby-list',     run: function (el) { revealGroup(el, 'li', { x: -26, y: 0, stagger: 0.09 }); } },

    /* Contact / footer. These are the last elements in the document, so they
       trigger early (high percentages fire sooner) — there is very little
       scroll left below them. `ensureReachable()` is the backstop. */
    { sel: '#Contact .huge-text',    run: function (el) { revealChars(el, { stagger: 0.026, duration: 1.05, start: 'top 90%' }); } },
    { sel: '#Contact .contact-grid', run: function (el) { revealGroup(el, '.magnetic-btn', { y: 28, stagger: 0.1, start: 'top 94%' }); } },
    { sel: '#Contact .footer-text',  run: function (el) { revealFade(el, { y: 18, duration: 0.8, start: 'top bottom' }); } }
  ];

  function buildReveals() {
    if (!hasGSAP) return;

    if (env.reduced) {
      /* Reduced motion: content is simply present. No splits, no triggers. */
      return;
    }

    RECIPES.forEach(function (r) {
      document.querySelectorAll(r.sel).forEach(function (el) {
        claim(el);
        r.run(el);
      });
    });

    initAboutPortrait();

    /* `.reveal-text` — the project's own hook, for anything not claimed above */
    document.querySelectorAll('.reveal-text').forEach(function (el) {
      if (claimed.indexOf(el) !== -1) return;
      claim(el);
      revealLines(el, { duration: 0.95 });
    });

    /* `.gs-reveal` — generic fallback. Skipped when the element (or anything
       inside it) already has a dedicated recipe, so nothing double-animates. */
    document.querySelectorAll('.gs-reveal').forEach(function (el) {
      var owns = claimed.some(function (c) { return c === el || el.contains(c); });
      if (owns) return;
      revealFade(el, { y: 38 });
    });
  }

  /* ── 6. Parallax ──────────────────────────────────────────────────────── */

  var parallaxTweens = [];

  function parallax(el, o) {
    if (!hasST || !env.heavy) return;
    o = o || {};
    var tw = gsap.fromTo(el,
      { y: o.from != null ? o.from : 0, x: o.xFrom || 0 },
      {
        y: o.to != null ? o.to : -60,
        x: o.xTo || 0,
        ease: 'none',
        scrollTrigger: {
          trigger: o.trigger || el,
          start: o.start || 'top bottom',
          end: o.end || 'bottom top',
          scrub: o.scrub != null ? o.scrub : 1
        }
      });
    parallaxTweens.push(tw);
    return tw;
  }

  function buildParallax() {
    /* Deliberately restrained — depth, not drift. */
    document.querySelectorAll('#About .massive-title, #Hobbies .glitch-wrapper')
      .forEach(function (el) { parallax(el, { from: 26, to: -26 }); });

    /* The marquee row drifts horizontally with scroll on top of its own CSS
       loop. The wrapper is full-width, so the section must clip it (see
       `.expertise { overflow-x: clip }`) or the document gains 60px of
       horizontal scroll. */
    var marquee = document.querySelector('.marquee-wrapper');
    if (marquee) parallax(marquee, { from: 0, to: 0, xFrom: -55, xTo: 55, scrub: 1.2 });

    var wave = document.querySelector('.scene-wave-divider');
    if (wave) parallax(wave, { from: 30, to: -18, scrub: 1.4 });
  }

  /* ── 7. Magnetic elements ─────────────────────────────────────────────── */

  var magnets = [];

  function magnetic(el, o) {
    if (!env.pointerFX || !hasGSAP) return;
    o = o || {};
    var strength = o.strength != null ? o.strength : 0.32;
    var frame = null;
    var rect = null;

    function onEnter() { rect = el.getBoundingClientRect(); }
    function onMove(e) {
      if (!rect) rect = el.getBoundingClientRect();
      /* One rAF-batched tween per frame — no layout reads on every mousemove */
      var cx = e.clientX, cy = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        gsap.to(el, {
          x: (cx - rect.left - rect.width / 2) * strength,
          y: (cy - rect.top - rect.height / 2) * strength * 0.85,
          duration: 0.5,
          ease: EASE.out,
          overwrite: 'auto'
        });
      });
    }
    function onLeave() {
      rect = null;
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
    }

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    magnets.push({ el: el, onEnter: onEnter, onMove: onMove, onLeave: onLeave });
  }

  function killMagnets() {
    magnets.forEach(function (m) {
      m.el.removeEventListener('mouseenter', m.onEnter);
      m.el.removeEventListener('mousemove', m.onMove);
      m.el.removeEventListener('mouseleave', m.onLeave);
      if (hasGSAP) gsap.set(m.el, { x: 0, y: 0 });
    });
    magnets = [];
  }

  function buildMagnets() {
    /* Only where the pull genuinely helps: the contact CTAs, the project CTA
       and the back-to-top control. Not on nav links (they sit in a tight row
       and the wobble would fight the underline). */
    document.querySelectorAll('.magnetic-btn').forEach(function (el) { magnetic(el, { strength: 0.3 }); });
    var cgBtn = document.getElementById('cg-btn');
    if (cgBtn) magnetic(cgBtn, { strength: 0.24 });
    var top = document.getElementById('back-to-top');
    if (top) magnetic(top, { strength: 0.35 });
  }

  /* ── 8. Custom cursor ─────────────────────────────────────────────────── */

  var cursor = { active: false, destroy: function () {} };

  function initCursor() {
    var dot = document.querySelector('.cursor');
    var ring = document.querySelector('.cursor-follower');
    if (!dot || !ring || !hasGSAP) return;

    if (!env.pointerFX) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      return;
    }

    var label = ring.querySelector('.cursor-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'cursor-label';
      ring.appendChild(label);
    }

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    var pos = { x: innerWidth / 2, y: innerHeight / 2 };
    var mouse = { x: pos.x, y: pos.y };
    var visible = false;

    function tick() {
      pos.x += (mouse.x - pos.x) * 0.16;
      pos.y += (mouse.y - pos.y) * 0.16;
      gsap.set(ring, { x: pos.x, y: pos.y });
    }
    gsap.ticker.add(tick);

    function onMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    /* Leave / re-enter the document */
    document.addEventListener('mouseleave', function () {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
      visible = false;
    });

    function setState(state, text) {
      ring.classList.toggle('is-link', state === 'link');
      ring.classList.toggle('is-label', state === 'label');
      dot.classList.toggle('is-hidden', state === 'label');
      if (state === 'label') label.textContent = text || '';
      gsap.to(ring, {
        scale: state === 'label' ? 1.75 : state === 'link' ? 1.8 : 1,
        duration: 0.4,
        ease: EASE.out,
        overwrite: 'auto'
      });
    }

    /* Delegated so it keeps working for nodes added later (the gallery
       rebuilds its cards, the static list is generated at runtime). */
    var LINK_SEL = 'a, button, .magnetic-btn, .tech-card, .bento-box, .info-block.standout, .menu-btn';
    var LABEL_SEL = '[data-cursor-label]';

    document.addEventListener('mouseover', function (e) {
      var labelled = e.target.closest && e.target.closest(LABEL_SEL);
      if (labelled) { setState('label', labelled.getAttribute('data-cursor-label')); return; }
      if (e.target.closest && e.target.closest(LINK_SEL)) { setState('link'); return; }
      setState('default');
    });

    cursor.active = true;
    cursor.setState = setState;
    cursor.destroy = function () {
      gsap.ticker.remove(tick);
      window.removeEventListener('mousemove', onMove);
      dot.style.display = 'none';
      ring.style.display = 'none';
      cursor.active = false;
    };
  }

  /* ── 9. Navigation behaviour ──────────────────────────────────────────── */

  var spyTriggers = [];
  var buildScrollSpy = function () {};

  function initNav() {
    var nav = document.getElementById('navbar');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!nav) return;

    /* A pinned section (the hero) is moved into a ScrollTrigger `.pin-spacer`
       and transformed, so its own rect reports wherever the pin currently
       holds it — scrolling to it would land at the END of the pinned range.
       The spacer occupies the section's real place in the document. */
    function scrollAnchor(el) {
      var parent = el.parentElement;
      if (parent && parent.classList && parent.classList.contains('pin-spacer')) return parent;
      return el;
    }

    /* -- smooth in-page navigation ------------------------------------- */
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        var target = id && id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        /* The mobile menu pauses Lenis while it is open. A link tap closes the
           menu *and* navigates, so scrolling has to be resumed first or the
           scrollTo is swallowed and the page never moves. */
        if (lenis) lenis.start();
        scrollTo(scrollAnchor(target), { duration: 1.5 });
      });
    });

    /* -- scroll-spy active state ---------------------------------------
       A single probe line at 55% of the viewport: sections are contiguous, so
       exactly one contains it at any time. A 45%/45% window left the final
       section — which can never scroll past the line — permanently inactive.

       Pins are created later (script.js, once the preloader lifts), so the
       spy is rebuilt afterwards to pick up the pin-spacers. */
    buildScrollSpy = function () {
      if (!hasST) return;
      spyTriggers.forEach(function (st) { try { st.kill(); } catch (e) {} });
      spyTriggers = [];
      links.forEach(function (link) {
        var id = link.getAttribute('href');
        var section = id && id.length > 1 && document.querySelector(id);
        if (!section) return;
        spyTriggers.push(ScrollTrigger.create({
          trigger: scrollAnchor(section),
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: function (self) { link.classList.toggle('is-active', self.isActive); }
        }));
      });
    };
    buildScrollSpy();

    /* -- hide on scroll down, reveal on scroll up ----------------------- */
    if (!env.reduced) {
      var lastY = window.pageYOffset;
      var navLinksEl = document.querySelector('.nav-links');
      var onScroll = function () {
        var y = window.pageYOffset;
        var menuOpen = navLinksEl && navLinksEl.classList.contains('active');
        if (menuOpen || y < 220) {
          nav.classList.remove('nav-hidden');
        } else if (y > lastY + 6) {
          nav.classList.add('nav-hidden');
        } else if (y < lastY - 6) {
          nav.classList.remove('nav-hidden');
        }
        lastY = y;
      };
      if (lenis) lenis.on('scroll', onScroll);
      else window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* ── 10. Scroll progress ──────────────────────────────────────────────── */

  function initScrollProgress() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;
    var set = hasGSAP ? gsap.quickSetter(bar, 'scaleX') : null;
    function update(p) {
      var v = Math.max(0, Math.min(1, p || 0));
      if (set) set(v);
      else bar.style.transform = 'scaleX(' + v + ')';
    }
    if (lenis) {
      lenis.on('scroll', function (e) { update(e.progress); });
    } else {
      window.addEventListener('scroll', function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        update(max > 0 ? window.pageYOffset / max : 0);
      }, { passive: true });
    }
  }

  /* ── 11. Page-load choreography ───────────────────────────────────────── */

  var introPlayed = false;

  /* Called by script.js as the preloader lifts. Sequences the first screen
     so nothing arrives all at once. */
  function playIntro() {
    if (introPlayed || !hasGSAP) return;
    introPlayed = true;

    var logo = document.querySelector('.logo');
    var navItems = document.querySelectorAll('.nav-links li');
    var menuBtn = document.querySelector('.menu-btn');
    var nameL = document.getElementById('hero-name-left');
    var nameR = document.getElementById('hero-name-right');
    var subtitle = document.querySelector('.hero-meta-subtitle');
    var desc = document.querySelector('.hero-meta-desc');
    var progress = document.querySelector('.hero-progress-group');
    var sidebar = document.querySelector('.hero-sidebar-static');
    var hint = document.getElementById('hero-scroll-hint');
    var indicator = document.getElementById('hero-scroll-indicator');
    var dots = document.querySelectorAll('#hero-right-dots .dot');

    if (env.reduced) {
      /* Everything is already in its final state — just make sure of it. */
      [logo, menuBtn, subtitle, desc, progress, sidebar, hint, indicator].forEach(function (el) {
        if (el) gsap.set(el, { clearProps: 'all' });
      });
      return;
    }

    /* The hero's scroll renderer writes `transform` on the name halves and on
       the title group every frame, so the intro must not animate those — two
       writers on one property fight and the reveal stutters. `.hero-content-box`
       is untouched by the sequence, and the name already makes its entrance by
       rising from the bottom edge on scroll, so a soft lift is all it needs. */
    var contentBox = document.getElementById('hero-content-box');

    var tl = gsap.timeline({ defaults: { ease: EASE.strongOut } });

    if (logo) tl.from(logo, { yPercent: -120, opacity: 0, duration: 0.8 }, 0);
    if (menuBtn) tl.from(menuBtn, { opacity: 0, duration: 0.6 }, 0.1);
    if (navItems.length) tl.from(navItems, { yPercent: -110, opacity: 0, duration: 0.75, stagger: 0.05 }, 0.06);

    if (contentBox) tl.from(contentBox, { opacity: 0, y: 34, duration: 1.1 }, 0.18);

    if (subtitle) tl.from(subtitle, { yPercent: 60, opacity: 0, duration: 0.8 }, 0.62);
    if (desc) tl.from(desc, { yPercent: 40, opacity: 0, duration: 0.85 }, 0.72);
    if (progress) tl.from(progress, { x: -22, opacity: 0, duration: 0.8 }, 0.5);
    if (dots.length) tl.from(dots, { x: 16, opacity: 0, duration: 0.6, stagger: 0.045 }, 0.6);
    if (hint) tl.from(hint, { opacity: 0, y: 14, duration: 0.7 }, 0.7);
    if (indicator) tl.from(indicator, { opacity: 0, y: 14, duration: 0.7 }, 0.75);

    return tl;
  }

  /* ── 12. Lifecycle ────────────────────────────────────────────────────── */

  function refresh() {
    if (!hasST) return;
    ScrollTrigger.refresh();
    ensureReachable();
  }

  function teardownReveals() {
    revealTriggers.forEach(function (st) { try { st.kill(); } catch (e) {} });
    revealTriggers = [];
    revertSplits();
  }

  var lastWidth = window.innerWidth;
  var resizeTimer = null;
  var resizeSettleTimer = null;

  function onResize() {
    clearTimeout(resizeTimer);
    clearTimeout(resizeSettleTimer);
    resizeTimer = setTimeout(function () {
      /* Height-only changes (mobile URL bar) must not trigger a re-split. */
      if (window.innerWidth === lastWidth) { refresh(); return; }
      lastWidth = window.innerWidth;

      teardownReveals();
      /* Anything already revealed keeps its final state; unrevealed content
         is re-prepared against the new line wrapping. */
      buildReveals();
      refresh();

      /* A viewport resize doesn't settle in one frame: pinned sections
         (Kira, Hero, the gallery) keep recalculating their reserved height
         for several hundred ms afterward as Lenis and GSAP catch up, so
         `maxScroll` measured right here can still be transitional — a
         trigger judged reachable now can drift out of reach as later
         layout passes shrink the page further. One more pass once things
         have actually stopped moving catches that drift. */
      resizeSettleTimer = setTimeout(ensureReachable, 450);
    }, 260);
  }

  function onPreferenceChange() {
    syncEnvClasses();
    if (env.reduced) {
      teardownReveals();
      killMagnets();
      cursor.destroy();
      parallaxTweens.forEach(function (t) {
        if (t.scrollTrigger) t.scrollTrigger.kill();
        t.kill();
      });
      parallaxTweens = [];
      if (lenis) { lenis.destroy(); lenis = null; }
      /* Clear every inline state the engine applied so content is plainly visible */
      if (hasGSAP) {
        gsap.set('.pm-anim, .gs-reveal, .reveal-text, .stat-item, .bento-box, .info-block, .hobby-list li, .magnetic-btn',
          { clearProps: 'all' });
      }
      refresh();
    }
  }

  function bindPreference(mq, handler) {
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */

  initSmoothScroll();

  function boot() {
    initScrollProgress();
    initCursor();
    buildReveals();
    buildParallax();
    buildMagnets();
    initNav();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    bindPreference(mqReduce, onPreferenceChange);
    bindPreference(mqCoarse, syncEnvClasses);
    bindPreference(mqMobile, syncEnvClasses);

    /* Late-loading webfonts change line wrapping — re-measure once settled. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { refresh(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    env: env,
    EASE: EASE,
    get lenis() { return lenis; },
    scrollTo: scrollTo,
    revealLines: revealLines,
    revealChars: revealChars,
    splitMaskedWords: splitMaskedWords,
    revealWordsBlur: revealWordsBlur,
    revealFade: revealFade,
    revealGroup: revealGroup,
    parallax: parallax,
    magnetic: magnetic,
    cursor: cursor,
    playIntro: playIntro,
    refresh: refresh,
    /* Called by script.js once the pinned sections exist, so the scroll-spy
       can anchor to their pin-spacers rather than the pinned elements. */
    rebuildScrollSpy: function () { buildScrollSpy(); }
  };
})();
