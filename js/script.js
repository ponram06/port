/* ═══════════════════════════════════════════════════════════════════════════
   Page behaviour.

   Shared motion utilities (smooth scroll, reveals, parallax, magnetic
   elements, custom cursor, nav behaviour, scroll progress) live in
   js/motion.js and are reached through `window.PM`. This file owns only the
   page-specific pieces:

     1. Particle background
     2. Preloader + load choreography hand-off
     3. Hero cinematic scroll sequence
     4. Stat counters
     5. Mobile menu
     6. Tilt + spotlight + click ripple
     7. Three.js scene
     8. Projects: 3D circular gallery (+ static fallback)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var PM = window.PM;
  var env = PM ? PM.env : { reduced: false, touch: false, mobile: false, heavy: true, pointerFX: true };

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ─── 1. PARTICLE BACKGROUND ──────────────────────────────────────────────
     Skipped entirely on touch devices and under reduced motion — it is pure
     decoration and the per-frame O(n²) link pass is the most expensive thing
     on the page. */

  function initParticles() {
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    if (env.reduced || env.touch || env.mobile) {
      canvas.style.display = 'none';
      return;
    }

    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouseX = -9999;
    var mouseY = -9999;
    var rafId = null;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function Particle(x, y, dx, dy, size, color) {
      this.x = x; this.y = y;
      this.directionX = dx; this.directionY = dy;
      this.size = size; this.color = color;
    }
    Particle.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color;
      ctx.fill();
    };
    Particle.prototype.update = function () {
      if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
      if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
      var dx = mouseX - this.x;
      var dy = mouseY - this.y;
      if (dx * dx + dy * dy < 22500) { // 150px, no sqrt
        this.x -= dx / 10;
        this.y -= dy / 10;
      }
      this.x += this.directionX;
      this.y += this.directionY;
      this.draw();
    };

    function build() {
      particles = [];
      var count = Math.min(90, (canvas.height * canvas.width) / 15000);
      for (var i = 0; i < count; i++) {
        var size = (Math.random() * 2) + 1;
        particles.push(new Particle(
          Math.random() * (innerWidth - size * 4) + size * 2,
          Math.random() * (innerHeight - size * 4) + size * 2,
          (Math.random() * 2) - 1,
          (Math.random() * 2) - 1,
          size,
          'rgba(224, 255, 0, 0.5)'
        ));
      }
    }

    function connect() {
      var limit = (canvas.width / 7) * (canvas.height / 7);
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var d = dx * dx + dy * dy;
          if (d < limit) {
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + ((1 - d / 20000) * 0.2) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      rafId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) particles[i].update();
      connect();
    }

    window.addEventListener('resize', function () {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      build();
    }, { passive: true });

    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
    function start() { if (!rafId && !document.hidden) loop(); }

    /* Stop burning frames on a backgrounded tab */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    build();
    loop();
  }

  /* ─── everything below waits for the DOM ─────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {

    initParticles();

    /* ─── 2. CINEMATIC INTRO ─────────────────────────────────────────────
       One continuous sequence, told in real time rather than by scroll:

         black  →  "Every story begins with a name."  →  the line dissolves
         as the Death Note scene emerges  →  the video plays through and
         Kira writes the name  →  the video's own fade to black carries
         straight into the existing Hero.

       Real-time, not scrubbed, on purpose: the source MP4 carries only two
       keyframes across its ten seconds, so seeking has to decode from up to
       five seconds away. Scrubbing it stutters badly; playback is smooth.
       Smoothness over technique, as specified. */

    /* The hook is a fixed overlay that only ever does one thing: black ->
       "Every story begins with a name." -> dissolve -> fade to black ->
       get out of the way. No video, no waiting on decoders — just a GSAP
       timeline, so this stage is never the source of any stutter. */
    function runIntroSequence(onDone) {
      var seq = document.getElementById('intro-seq');
      var line = document.getElementById('intro-line');
      var veil = document.getElementById('intro-veil');
      var skipBtn = document.getElementById('intro-skip');
      var root = document.documentElement;

      var done = false;
      function complete() {
        if (done) return;
        done = true;
        if (onDone) onDone();
      }

      if (!seq || !line || typeof gsap === 'undefined') {
        if (seq) seq.classList.add('is-done');
        complete();
        return;
      }

      /* Reduced motion: no sequence at all, straight to the portfolio. */
      if (env.reduced) {
        seq.classList.add('is-done');
        complete();
        return;
      }

      root.classList.add('intro-active');
      if (PM && PM.lenis) PM.lenis.stop();

      var listeners = [];
      function on(el, ev, fn, opts) {
        el.addEventListener(ev, fn, opts);
        listeners.push(function () { el.removeEventListener(ev, fn, opts); });
      }

      var tl = null;
      var safetyTimer = null;
      var teardownDone = false;

      function teardown() {
        if (teardownDone) return;
        teardownDone = true;
        clearTimeout(safetyTimer);
        listeners.forEach(function (off) { off(); });
        listeners.length = 0;
        if (tl) { tl.kill(); tl = null; }
        seq.classList.add('is-done');
        root.classList.remove('intro-active');
        /* Scroll stays unlocked here — the Kira sequence right below is what
           the visitor now scrolls through, full black at rest. */
        if (PM && PM.lenis) PM.lenis.start();
        complete();
      }

      function finishHook(duration) {
        if (teardownDone) return;
        gsap.to(veil, {
          opacity: 1,
          duration: duration != null ? duration : 0.7,
          ease: 'power2.inOut',
          onComplete: teardown
        });
      }

      /* -- opening line ------------------------------------------------- */
      var words = [line];
      if (PM && PM.splitMaskedWords) {
        var split = PM.splitMaskedWords(line);
        if (split && split.words && split.words.length) words = split.words;
      }

      gsap.set(veil, { opacity: 0 });
      gsap.set(words, { yPercent: 118, opacity: 0, filter: 'blur(9px)' });
      if (skipBtn) gsap.set(skipBtn, { opacity: 0 });

      tl = gsap.timeline({ onComplete: function () { finishHook(0.75); } });
      tl.to(words, {
        yPercent: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.25,
        stagger: 0.055,
        ease: 'power4.out'
      }, 0.28);
      if (skipBtn) tl.to(skipBtn, { opacity: 1, duration: 0.6 }, 1.1);
      /* Hold on the finished line so it can actually be read. */
      tl.to({}, { duration: 1.1 }, '+=0');
      tl.to(words, {
        yPercent: -46,
        opacity: 0,
        filter: 'blur(12px)',
        duration: 0.9,
        stagger: 0.03,
        ease: 'power3.in'
      });
      if (skipBtn) tl.to(skipBtn, { opacity: 0, duration: 0.35 }, '<');

      /* -- escape hatch ---------------------------------------------------
         Skip jumps straight past the hook. It intentionally does NOT skip
         the Kira sequence itself — that one is scroll-driven, so "skip" for
         it is just "scroll", which the visitor already knows how to do. */
      if (skipBtn) on(skipBtn, 'click', function () { finishHook(0.4); });
      on(document, 'keydown', function (e) {
        if (e.key === 'Escape') finishHook(0.35);
      });

      /* Absolute backstop: never leave anyone stuck on the overlay. */
      safetyTimer = setTimeout(function () { finishHook(0.4); }, 12000);
    }

    /* ─── 2b. KIRA / DEATH NOTE SEQUENCE ─────────────────────────────────
       Scroll-driven, reusing the same pin + lerped-scrub pattern as the Hero
       below it — proven smooth (opacity/scale crossfades only, no video
       decode). At progress 0 every frame is transparent, so the section is
       pure black until the visitor scrolls. `html.pre-kira` keeps nav and
       the Hero name hidden for exactly as long as this section is on screen;
       it is removed once the visitor scrolls past it and restored if they
       scroll back up into it. */
    var kiraST = null;
    var kiraTick = null;

    function initKiraScroll() {
      var root = document.documentElement;
      var wrap = document.getElementById('kira-scroll-wrapper');
      var section = document.getElementById('KiraIntro');
      var vignette = document.getElementById('kira-vignette');
      var hint = document.getElementById('kira-scroll-hint');
      var imgs = [1, 2, 3, 4, 5].map(function (n) {
        return document.getElementById('kira-img-' + n);
      });

      if (env.reduced || !wrap || !section || imgs.some(function (i) { return !i; })) {
        /* No pinned reveal (CSS hides the wrapper under reduced motion, and
           without the elements there is nothing to pin) — chrome must not
           stay hidden waiting for a sequence that will never run. */
        root.classList.remove('pre-kira');
        return;
      }

      imgs.forEach(function (img) {
        img.decoding = 'async';
        if (img.decode) img.decode().catch(function () { /* cached or racing */ });
      });

      gsap.set(imgs, { opacity: 0, scale: 1.05 });
      gsap.set(vignette, { opacity: 0 });
      gsap.set(hint, { opacity: 0 });

      /* Five frames -> four crossfade bands, evenly spaced, each with holds
         either side so a frame is actually seen before the next arrives. */
      var INTRO_END = 0.10;
      var FRAME_BANDS = [
        [0.16, 0.27, 0, 1],
        [0.39, 0.50, 1, 2],
        [0.62, 0.73, 2, 3],
        [0.85, 0.93, 3, 4]
      ];
      var LAST_BAND = FRAME_BANDS[FRAME_BANDS.length - 1];

      /* One pass, one unambiguous answer for every p in [0,1]: fading in
         from black, holding on a frame, crossfading between two, or holding
         on the last frame. No band above ever needs to "undo" a write made
         by another. */
      function frameState(p) {
        var op = [0, 0, 0, 0, 0];
        var sc = [1, 1, 1, 1, 1];

        if (p <= INTRO_END) {
          var e0 = easeInOutCubic(band(p, 0, INTRO_END));
          op[0] = e0;
          sc[0] = lerpN(1.05, 1, e0);
          return { op: op, sc: sc };
        }

        if (p <= FRAME_BANDS[0][0]) { op[0] = 1; return { op: op, sc: sc }; }
        if (p >= LAST_BAND[1]) { op[4] = 1; return { op: op, sc: sc }; }

        for (var i = 0; i < FRAME_BANDS.length; i++) {
          var b = FRAME_BANDS[i];
          if (p >= b[0] && p <= b[1]) {
            var e = easeInOutCubic(band(p, b[0], b[1]));
            op[b[2]] = 1 - e; sc[b[2]] = lerpN(1, 1.04, e);
            op[b[3]] = e;     sc[b[3]] = lerpN(1.06, 1, e);
            return { op: op, sc: sc };
          }
          var next = FRAME_BANDS[i + 1];
          if (p > b[1] && (!next || p < next[0])) {
            /* Between this transition and the next: hold on the frame that
               just finished fading in. */
            op[b[3]] = 1;
            return { op: op, sc: sc };
          }
        }
        return { op: op, sc: sc };
      }

      function render(p) {
        var state = frameState(p);
        for (var i = 0; i < 5; i++) {
          setStyle(imgs[i], 'opacity', state.op[i].toFixed(3));
          setStyle(imgs[i], 'transform', 'scale(' + state.sc[i].toFixed(4) + ')');
        }

        /* 2. Scroll hint: on once the black beat has passed, off once
              scrolling has clearly begun. */
        var hintOn = band(p, 0.02, 0.07);
        var hintOff = band(p, 0.1, 0.16);
        setStyle(hint, 'opacity', Math.max(0, hintOn - hintOff).toFixed(3));

        /* 3. Hold on the finished name, then vignette out into the Hero. */
        var outE = easeInOutCubic(band(p, 0.94, 1.0));
        setStyle(vignette, 'opacity', (outE * 0.95).toFixed(3));
      }

      var target = 0;
      var current = 0;
      var settled = true;

      kiraTick = function () {
        var diff = target - current;
        if (Math.abs(diff) < 0.00012) {
          if (settled) return;
          current = target;
          settled = true;
        } else {
          current += diff * 0.105;
          settled = false;
        }
        render(current);
      };
      gsap.ticker.add(kiraTick);

      if (kiraST) kiraST.kill();
      kiraST = ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        end: env.mobile ? '+=280%' : '+=340%',
        pin: section,
        anticipatePin: 1,
        scrub: true,
        invalidateOnRefresh: true,
        /* Sits above the Hero and Projects in the document, so it has to be
           measured/pinned first — the exact ordering rule that fixed the
           Projects-over-Hero layering bug last time. */
        refreshPriority: 20,
        onUpdate: function (self) { target = self.progress; settled = false; },
        onLeave: function () { root.classList.remove('pre-kira'); },
        onEnterBack: function () { root.classList.add('pre-kira'); }
      });

      render(0);
    }

    /* The hook hands over to the scroll experience: both pinned sequences
       are built, the scroll-spy is re-anchored now the pin-spacers exist,
       then the Hero's own entrance choreography plays. Kira itself needs no
       "start" — it is already sitting at scrollY 0, full black, waiting. */
    var scrollExperienceStarted = false;

    function beginScrollExperience() {
      if (scrollExperienceStarted) return;
      scrollExperienceStarted = true;
      requestAnimationFrame(function () {
        if (PM) PM.refresh();
        initKiraScroll();
        initHeroCinematicScroll();
        if (PM) {
          PM.rebuildScrollSpy();
          PM.refresh();
          PM.playIntro();
        }
      });
    }

    runIntroSequence(beginScrollExperience);


    /* ─── 3. HERO SCROLL SEQUENCE ────────────────────────────────────────
       The Death Note story is told by the intro now, so the Hero is simply
       the name — it rises from the bottom edge, parts, and hands over to
       About:

         0.00 → 0.34  RISE   name travels up from the bottom to centre
         0.34 → 0.62  SPLIT  halves part and the title scales back
         0.62 → 0.86  EXIT   halves leave frame and fade
         0.82 → 1.00  HAND-OFF  vignette + ABOUT ME

       Scroll input is lerped before it reaches the renderer, and every write
       is diffed against the last value, so a frame that changes nothing costs
       nothing. */

    var heroST = null;
    var heroTick = null;

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function band(p, a, b) { return clamp01((p - a) / (b - a)); }
    function lerpN(a, b, t) { return a + (b - a) * t; }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

    /* Only touch the DOM when a value actually changes. */
    function setStyle(el, prop, val) {
      if (!el) return;
      var cache = el.__pmStyle || (el.__pmStyle = {});
      if (cache[prop] === val) return;
      cache[prop] = val;
      el.style[prop] = val;
    }

    function initHeroCinematicScroll() {
      var wrap = document.getElementById('hero-scroll-wrapper');
      var intro = document.getElementById('Intro');
      var nameLeft = document.getElementById('hero-name-left');
      var nameRight = document.getElementById('hero-name-right');
      var titleGroup = document.getElementById('hero-title-group');
      var overlay = document.getElementById('hero-vignette-overlay');
      var scrollHint = document.getElementById('hero-scroll-hint');
      var indicator = document.getElementById('hero-scroll-indicator');
      var aboutMe = document.getElementById('about-me-reveal');

      if (!wrap || !intro || !nameLeft || !nameRight || !titleGroup || !overlay || !aboutMe) {
        console.warn('[Hero] Required elements missing for the scroll sequence.');
        return;
      }

      /* -- reduced motion: one static screen, no scrubbing --------------- */
      if (env.reduced) {
        setStyle(titleGroup, 'transform', 'none');
        [nameLeft, nameRight].forEach(function (el) {
          setStyle(el, 'transform', 'none');
          setStyle(el, 'opacity', '1');
        });
        return;
      }

      /* -- geometry, re-measured on every refresh ------------------------ */
      var vw, vh, isMobile, riseY, splitX, splitXMax;

      function measure() {
        vw = window.innerWidth;
        vh = window.innerHeight;
        isMobile = vw <= 768;

        /* Distance the name travels: from resting near the bottom edge up to
           the vertical centre. Measured from the title's own height so it
           lands the same on any viewport. */
        var prev = titleGroup.style.transform;
        titleGroup.style.transform = 'none';
        var titleH = titleGroup.getBoundingClientRect().height || 140;
        titleGroup.style.transform = prev;
        if (titleGroup.__pmStyle) delete titleGroup.__pmStyle.transform;

        riseY = Math.max(0, (vh / 2) - (titleH / 2) - (isMobile ? 104 : 138));

        /* On-screen separation of the two halves, in real pixels. Tuned so
           neither half clips a viewport edge once the title has scaled back. */
        splitX = isMobile ? vw * 0.17 : vw * 0.20;
        splitXMax = isMobile ? vw * 0.62 : vw * 0.56;
      }
      measure();

      function render(p) {
        /* 1. RISE, then recede — as the name parts it also scales back,
              which keeps both halves inside the viewport at display size. */
        var riseE = easeOutExpo(band(p, 0, 0.34));
        var splitE = easeInOutCubic(band(p, 0.34, 0.62));
        var exitE = easeInOutCubic(band(p, 0.62, 0.86));

        var titleScale = lerpN(1, 0.62, splitE);
        setStyle(titleGroup, 'transform',
          'translate3d(0,' + (riseY * (1 - riseE)).toFixed(1) + 'px,0) scale(' +
          titleScale.toFixed(4) + ')');

        /* 2. SPLIT then EXIT. The halves sit inside the scaled group, so a
              translation of `t` moves them `t * titleScale` on screen —
              divide it back out to work in real pixels. */
        var visualX = splitX * splitE + (splitXMax - splitX) * exitE;
        var x = visualX / titleScale;
        var nameOpacity = 1 - 0.3 * splitE - 0.7 * exitE;

        setStyle(nameLeft, 'transform', 'translate3d(' + (-x).toFixed(1) + 'px,0,0)');
        setStyle(nameRight, 'transform', 'translate3d(' + x.toFixed(1) + 'px,0,0)');
        var nameOpStr = nameOpacity.toFixed(3);
        setStyle(nameLeft, 'opacity', nameOpStr);
        setStyle(nameRight, 'opacity', nameOpStr);

        /* 3. Scroll cue clears on the first flick of the wheel */
        var hint = (1 - band(p, 0.005, 0.06)).toFixed(3);
        if (scrollHint) setStyle(scrollHint, 'opacity', hint);
        if (indicator) setStyle(indicator, 'opacity', hint);

        /* 4. HAND-OFF into the rest of the page */
        var outE = easeInOutCubic(band(p, 0.82, 1.0));
        setStyle(overlay, 'opacity', (outE * 0.92).toFixed(3));
        setStyle(aboutMe, 'opacity', outE.toFixed(3));
        setStyle(aboutMe, 'transform',
          'translate3d(-50%,-50%,0) translateY(' + (40 * (1 - outE)).toFixed(1) + 'px)');
      }

      /* -- scrub smoothing ------------------------------------------------
         Raw wheel/trackpad progress is jittery. Easing it toward the target
         each frame is what makes the sequence feel like film rather than a
         slider. Settles fully so we stop writing once the user stops. */
      var target = 0;
      var current = 0;
      var settled = true;

      heroTick = function () {
        var diff = target - current;
        if (Math.abs(diff) < 0.00012) {
          if (settled) return;
          current = target;
          settled = true;
        } else {
          current += diff * 0.105;
          settled = false;
        }
        render(current);
      };

      gsap.ticker.add(heroTick);

      if (heroST) heroST.kill();
      heroST = ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        end: env.mobile ? '+=220%' : '+=260%',
        pin: intro,
        anticipatePin: 1,
        scrub: true,
        invalidateOnRefresh: true,
        /* The gallery's pin is created first (this one waits for the intro),
           so without an explicit order ScrollTrigger measures the gallery
           against a layout that does not yet include the hero's pin-spacer.
           Pins must refresh top-of-page first: highest priority wins. */
        refreshPriority: 10,
        onRefresh: function () { measure(); settled = false; },
        onUpdate: function (self) { target = self.progress; settled = false; }
      });

      render(0);
    }


    /* ─── 4. STAT COUNTERS ─────────────────────────────────────────────── */

    document.querySelectorAll('.stat-number').forEach(function (num) {
      var target = parseInt(num.getAttribute('data-target'), 10);
      if (isNaN(target)) return;

      if (env.reduced) { num.textContent = target; return; }

      ScrollTrigger.create({
        trigger: num,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          var counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: function () { num.textContent = Math.round(counter.v); },
            onComplete: function () { num.textContent = target; }
          });
        }
      });
    });

    /* ─── 5. BACK TO TOP + MOBILE MENU ─────────────────────────────────── */

    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      ScrollTrigger.create({
        start: 500,
        end: 99999,
        onToggle: function (self) {
          gsap.to(backToTop, { opacity: self.isActive ? 1 : 0, duration: 0.3 });
          backToTop.style.visibility = self.isActive ? 'visible' : 'hidden';
        }
      });
      backToTop.addEventListener('click', function () {
        if (PM) PM.scrollTo(0, { duration: 1.6 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var menuBtn = document.querySelector('.menu-btn');
    var navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
      var items = navLinks.querySelectorAll('li');

      function setMenu(open) {
        navLinks.classList.toggle('active', open);
        var icon = menuBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-bars', !open);
          icon.classList.toggle('fa-times', open);
        }
        /* Lenis must not keep scrolling the page behind an open overlay */
        if (PM && PM.lenis) open ? PM.lenis.stop() : PM.lenis.start();

        if (open && !env.reduced) {
          gsap.fromTo(items,
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
        }
      }

      menuBtn.addEventListener('click', function () {
        setMenu(!navLinks.classList.contains('active'));
      });
      navLinks.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) setMenu(false);
      });
    }

    /* ─── 6. TILT / SPOTLIGHT / CLICK RIPPLE ───────────────────────────── */

    if (typeof VanillaTilt !== 'undefined' && env.pointerFX) {
      VanillaTilt.init(document.querySelectorAll('.tech-card'),
        { max: 12, speed: 500, glare: true, 'max-glare': 0.18, scale: 1.04 });
      VanillaTilt.init(document.querySelectorAll('.info-block.standout'),
        { max: 4, speed: 500, glare: true, 'max-glare': 0.08, scale: 1.01 });
    }

    if (env.pointerFX) {
      var spotFrame = null;
      document.querySelectorAll('.tech-card, .info-block').forEach(function (card) {
        card.classList.add('spotlight-card');
        card.addEventListener('mousemove', function (e) {
          if (spotFrame) return;
          var cx = e.clientX, cy = e.clientY;
          spotFrame = requestAnimationFrame(function () {
            spotFrame = null;
            var rect = card.getBoundingClientRect();
            card.style.setProperty('--x', (cx - rect.left) + 'px');
            card.style.setProperty('--y', (cy - rect.top) + 'px');
          });
        });
      });

      document.addEventListener('click', function (e) {
        var ripple = document.createElement('div');
        ripple.className = 'cursor-click';
        ripple.style.cssText = 'left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:40px;height:40px';
        document.body.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 500);
      });
    }

    /* ─── 7. THREE.JS SCENE ────────────────────────────────────────────── */

    function initThreeScene() {
      var canvas = document.getElementById('webgl-canvas');
      var container = document.getElementById('Scene3D');
      if (!canvas || !container || typeof THREE === 'undefined') return;

      /* Under reduced motion the section keeps its heading; the WebGL layer
         is decoration and simply does not run. */
      if (env.reduced) { canvas.style.display = 'none'; return; }

      var scene = new THREE.Scene();
      var getW = function () { return container.clientWidth || window.innerWidth; };
      var getH = function () { return container.clientHeight || window.innerHeight; };

      var camera = new THREE.PerspectiveCamera(45, getW() / getH(), 0.1, 100);
      camera.position.set(0, 0, 7);

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas, alpha: true, antialias: !env.mobile, powerPreference: 'high-performance'
      });
      renderer.setSize(getW(), getH());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, env.mobile ? 1.5 : 2));

      var meshGroup = new THREE.Group();
      var segments = env.mobile ? 96 : 128;
      var geometry = new THREE.TorusKnotGeometry(1.6, 0.45, segments, 32);

      meshGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: 0x0a0c10, metalness: 0.85, roughness: 0.25
      })));
      meshGroup.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xe0ff00, wireframe: true, transparent: true, opacity: 0.4
      })));
      scene.add(meshGroup);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      var keyLight = new THREE.DirectionalLight(0xe0ff00, 1.8);
      keyLight.position.set(5, 5, 5);
      scene.add(keyLight);
      var fillLight = new THREE.PointLight(0x00f0ff, 2.0, 50);
      fillLight.position.set(-5, -3, 3);
      scene.add(fillLight);

      var scrub = { rotX: -0.4, rotY: -0.8, rotZ: -0.2, camZ: 8.5, posY: -0.6 };

      gsap.timeline({
        scrollTrigger: {
          trigger: container, start: 'top bottom', end: 'bottom top', scrub: 1.2
        }
      }).fromTo(scrub,
        { rotX: -0.4, rotY: -0.8, rotZ: -0.2, camZ: 8.5, posY: -0.6 },
        { rotX: Math.PI * 2.2, rotY: Math.PI * 3.4, rotZ: Math.PI * 1.2,
          camZ: 5.4, posY: 0.6, ease: 'none' });

      var overlay = container.querySelector('.scene-3d-overlay');
      if (overlay) {
        gsap.timeline({
          scrollTrigger: { trigger: container, start: 'top 55%', end: 'bottom 45%', scrub: 1 }
        })
          .fromTo(overlay, { opacity: 0 }, { opacity: 1, ease: 'power2.out', duration: 1 })
          .to(overlay, { opacity: 0, ease: 'power2.in', duration: 0.8 });
      }

      /* Only render while the section is actually on screen */
      var inView = false;
      var rafId = null;
      var idleX = 0, idleY = 0;

      function render() {
        rafId = requestAnimationFrame(render);
        idleX += 0.0015;
        idleY += 0.0025;
        meshGroup.rotation.x = scrub.rotX + idleX;
        meshGroup.rotation.y = scrub.rotY + idleY;
        meshGroup.rotation.z = scrub.rotZ;
        meshGroup.position.y = scrub.posY;
        camera.position.z = scrub.camZ;
        renderer.render(scene, camera);
      }

      function play() { if (!rafId && !document.hidden) render(); }
      function pause() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

      ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: function (self) { inView = self.isActive; inView ? play() : pause(); }
      });

      document.addEventListener('visibilitychange', function () {
        document.hidden ? pause() : (inView && play());
      });

      window.addEventListener('resize', function () {
        camera.aspect = getW() / getH();
        camera.updateProjectionMatrix();
        renderer.setSize(getW(), getH());
      }, { passive: true });

      play();
    }

    initThreeScene();

    /* ─── 8. PROJECTS: 3D CIRCULAR GALLERY ─────────────────────────────── */

    var PROJECTS_DATA = [
      { num: '01 / 06', title: 'SMART WEB PENTESTING',      github: 'https://github.com/ponram06' },
      { num: '02 / 06', title: 'SKILLBRIDGE',               github: 'https://github.com/ponram06' },
      { num: '03 / 06', title: 'NAVILENS AR',               github: 'https://github.com/ponram06' },
      { num: '04 / 06', title: 'VAXI-TRACK',                github: 'https://github.com/ponram06' },
      { num: '05 / 06', title: 'AI CATTLE RECOGNITION',     github: 'https://github.com/ponram06' },
      { num: '06 / 06', title: 'INTERACTIVE ARCHITECTURES', github: 'https://github.com/ponram06' }
    ];

    /* The orbit is a desktop, pointer-driven experience. On phones and under
       reduced motion the same six projects render as a plain list — before
       this, the section was 600vh of empty space on mobile. */
    /* Captured before the orbit slices the <img> elements away, so the list
       can still be built later if the viewport crosses the breakpoint. */
    var CG_SOURCES = [];

    function renderStaticGallery(section) {
      if (section.querySelector('.cg-static-list')) return;

      var sources = CG_SOURCES;

      var list = document.createElement('div');
      list.className = 'cg-static-list';

      PROJECTS_DATA.forEach(function (p, i) {
        var src = sources[i] || { src: '', alt: '' };
        var card = document.createElement('a');
        card.className = 'cg-static-card';
        card.href = p.github;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        var media = document.createElement('span');
        media.className = 'cg-static-media';
        if (src.src) {
          var img = document.createElement('img');
          img.src = src.src;
          img.alt = src.alt;
          img.loading = 'lazy';
          img.decoding = 'async';
          media.appendChild(img);
        }

        var body = document.createElement('span');
        body.className = 'cg-static-body';
        body.innerHTML =
          '<span class="cg-static-num"></span>' +
          '<span class="cg-static-title"></span>' +
          '<span class="cg-static-cta">VIEW PROJECT <span>&rarr;</span></span>';
        body.querySelector('.cg-static-num').textContent = p.num;
        body.querySelector('.cg-static-title').textContent = p.title;

        card.appendChild(media);
        card.appendChild(body);
        list.appendChild(card);
      });

      section.querySelector('.circle-gallery-pin').appendChild(list);

      if (PM && !env.reduced) {
        PM.revealGroup(list, '.cg-static-card', { y: 30, stagger: 0.08 });
      }
    }

    var cgOrbit = null; // { st, ticker } once the desktop orbit is built

    function initCircleGallery() {
      var cgSection = document.getElementById('Projects');
      if (!cgSection) return;

      CG_SOURCES = Array.prototype.map.call(
        cgSection.querySelectorAll('img.cg-img'),
        function (img) { return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' }; }
      );

      if (env.reduced || env.mobile) {
        renderStaticGallery(cgSection);
        return;
      }

      var vw = window.innerWidth;
      var vh = window.innerHeight;

      /* Slice each cover into cylindrical strips so it bends around the orbit */
      (function buildSlices() {
        var SLICES = 10;
        var imgW = Math.min(Math.max(130, vw * 0.15), 210);
        var imgH = imgW * 2 / 3;
        var orbitR = (vw * 0.38 + 520) / 2;
        var cylR = orbitR;
        var sliceW = imgW / SLICES;
        var stepDeg = (imgW / orbitR) * 180 / Math.PI / SLICES;

        cgSection.querySelectorAll('.cg-img').forEach(function (img) {
          if (img.tagName !== 'IMG') return; // never double-slice
          var src = img.getAttribute('src');
          var wrapper = document.createElement('div');
          wrapper.className = 'cg-img';

          for (var s = 0; s < SLICES; s++) {
            var sl = document.createElement('div');
            sl.className = 'cg-slice';
            var displayW = sliceW + 1.5;
            sl.style.width = displayW.toFixed(1) + 'px';
            sl.style.left = '50%';
            sl.style.marginLeft = (-displayW / 2).toFixed(1) + 'px';
            sl.style.backgroundImage = 'url("' + src + '")';
            sl.style.backgroundSize = imgW.toFixed(1) + 'px ' + imgH.toFixed(1) + 'px';
            sl.style.backgroundPosition = (-s * sliceW).toFixed(1) + 'px 0';
            sl.style.transformOrigin = '50% 50% ' + (-cylR).toFixed(1) + 'px';
            sl.style.transform = 'rotateY(' +
              ((s - (SLICES - 1) / 2) * stepDeg).toFixed(2) + 'deg)';
            wrapper.appendChild(sl);
          }
          img.parentNode.replaceChild(wrapper, img);
        });
      })();

      var cgImgs = gsap.utils.toArray(cgSection.querySelectorAll('.cg-img'));
      var cgPhrase = cgSection.querySelector('#cg-phrase');
      var cgCenterUI = cgSection.querySelector('#cg-center-ui');
      var cgCounter = cgSection.querySelector('#cg-counter');
      var cgTitle = cgSection.querySelector('#cg-title');
      var cgBtn = cgSection.querySelector('#cg-btn');
      var pinEl = cgSection.querySelector('.circle-gallery-pin') || cgSection;
      var count = cgImgs.length;

      if (pinEl) pinEl.setAttribute('data-cursor-label', 'SCROLL');

      /* Wrap the intro phrase's words for the blur-to-sharp cascade */
      (function wrapWords(el) {
        if (!el) return;
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
          var frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (w) {
            if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
            else if (w) {
              var span = document.createElement('span');
              span.className = 'word';
              span.textContent = w;
              frag.appendChild(span);
            }
          });
          node.parentNode.replaceChild(frag, node);
        });
      })(cgPhrase);

      var cgPhraseWords = cgPhrase
        ? gsap.utils.toArray(cgPhrase.querySelectorAll('.word')) : [];

      /* Orbit geometry, clamped so no card can ever cross a viewport edge */
      var cardW = Math.min(Math.max(120, vw * 0.095), 175);
      var cardH = cardW * 2 / 3;
      var rx = Math.max(140, Math.min((vw / 2) - cardW / 2 - 55, vw * 0.32));
      var tiltY = Math.max(50, Math.min((vh / 2) - cardH / 2 - 45 - 140, vh * 0.22));
      var rz = Math.min(420, rx * 0.85);
      var entryAngle = Math.PI / 2;

      function getPosForAngle(angle) {
        var x = Math.cos(angle) * rx;
        var z = Math.sin(angle) * rz;
        var rotYDeg = Math.max(-12, Math.min(12, (x / rx) * -10));
        /* Push cards clear of the centre column so they never sit on the text */
        var centerFactor = 1 - Math.min(1, Math.abs(x) / 300);
        var clearance = (z >= 0 ? 145 : -145) * centerFactor;
        return { x: x, y: (z / rz) * tiltY + clearance, z: z, rotYDeg: rotYDeg };
      }

      var currentActiveIdx = -999;

      function renderCenterUI(idx) {
        if (!cgCenterUI) return;
        var p = PROJECTS_DATA[idx];
        if (!p) return;

        gsap.timeline()
          .to(cgCenterUI, {
            opacity: 0, y: 14, filter: 'blur(6px)', duration: 0.2, ease: 'power2.in',
            onComplete: function () {
              if (cgCounter) cgCounter.textContent = p.num;
              if (cgTitle) cgTitle.textContent = p.title;
              if (cgBtn) { cgBtn.href = p.github; cgBtn.style.display = 'inline-flex'; }
            }
          })
          .to(cgCenterUI, {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.35, ease: 'power3.out'
          });
      }

      /* Lerp the orbit so it glides rather than tracking the wheel 1:1 */
      var cgTarget = 0;
      var cgSmooth = 0;

      function renderOrbit(progress) {
        var isIntro = progress <= 0.10;
        var isEnding = progress >= 0.85;
        var isGallery = !isIntro && !isEnding;

        if (isIntro || isEnding) {
          var modeP = isIntro
            ? gsap.utils.clamp(0, 1, progress / 0.10)
            : gsap.utils.clamp(0, 1, (progress - 0.85) / 0.15);

          if (cgPhrase) {
            var alpha = isIntro
              ? (modeP < 0.2 ? modeP / 0.2 : (modeP > 0.8 ? (1 - modeP) / 0.2 : 1))
              : (modeP < 0.2 ? modeP / 0.2 : 1);
            cgPhrase.style.opacity = alpha;
            cgPhrase.style.transform = 'translateY(' + (40 * (0.5 - modeP)).toFixed(1) + 'px)';
          }
          /* Words cascade in with the phrase rather than snapping visible */
          cgPhraseWords.forEach(function (w, i) {
            var wp = gsap.utils.clamp(0, 1, (modeP - i * 0.02) / 0.35);
            w.style.opacity = wp;
            w.style.filter = 'blur(' + ((1 - wp) * 6).toFixed(2) + 'px)';
          });

          if (cgCenterUI) {
            cgCenterUI.style.opacity = '0';
            cgCenterUI.style.pointerEvents = 'none';
          }
          currentActiveIdx = -999;
        } else {
          if (cgPhrase) cgPhrase.style.opacity = '0';
          if (cgCenterUI) cgCenterUI.style.pointerEvents = 'auto';
        }

        var activeIdx = -1;
        if (isGallery) {
          var galleryP = gsap.utils.clamp(0, 1, (progress - 0.10) / 0.75);
          activeIdx = Math.min(count - 1, Math.max(0, Math.floor(galleryP * count)));
        }

        cgImgs.forEach(function (img, i) {
          var angle = (entryAngle - (i / count) * Math.PI * 2) - progress * Math.PI * 2.2;
          var pos = getPosForAngle(angle);

          if (i === activeIdx && isGallery) {
            img.style.transform =
              'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' +
              (pos.z + 40).toFixed(1) + 'px) rotateY(' + pos.rotYDeg.toFixed(1) + 'deg) scale(1.14)';
            img.style.opacity = '1';
            img.style.filter = 'blur(0px) brightness(1.2)';
            img.style.zIndex = Math.round(pos.z + 1000);
          } else {
            img.style.transform =
              'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' +
              pos.z.toFixed(1) + 'px) rotateY(' + pos.rotYDeg.toFixed(1) + 'deg) scale(0.84)';
            img.style.opacity = (pos.z < -200 ? 0.45 : 0.75).toFixed(2);
            img.style.filter = 'blur(1.5px) brightness(0.72)';
            img.style.zIndex = Math.round(pos.z + 200);
          }
        });

        if (isGallery && activeIdx !== -1 && activeIdx !== currentActiveIdx) {
          currentActiveIdx = activeIdx;
          renderCenterUI(activeIdx);
        }
      }

      var orbitTicker = function () {
        var diff = cgTarget - cgSmooth;
        cgSmooth = Math.abs(diff) > 0.00005 ? cgSmooth + diff * 0.1 : cgTarget;
        renderOrbit(cgSmooth);
      };
      gsap.ticker.add(orbitTicker);

      var orbitST = ScrollTrigger.create({
        trigger: cgSection,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinEl,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /* Lower than the hero's, so the hero's pin-spacer is measured first
           and this section's start reflects the real document height. */
        refreshPriority: 5,
        onUpdate: function (self) { cgTarget = self.progress; }
      });

      cgOrbit = { st: orbitST, ticker: orbitTicker, section: cgSection };
      renderOrbit(0);
    }

    initCircleGallery();

    /* Crossing the mobile breakpoint swaps the orbit for the list. Done in
       place — no reload, and the orbit's pin/ticker are released first so it
       cannot keep writing transforms to hidden nodes. */
    var wasStatic = env.reduced || env.mobile;
    var cgResizeTimer = null;

    window.addEventListener('resize', function () {
      clearTimeout(cgResizeTimer);
      cgResizeTimer = setTimeout(function () {
        var isStatic = env.reduced || env.mobile;
        if (isStatic === wasStatic) return;
        wasStatic = isStatic;

        var section = document.getElementById('Projects');
        if (!section) return;

        if (isStatic) {
          if (cgOrbit) {
            gsap.ticker.remove(cgOrbit.ticker);
            cgOrbit.st.kill(true);
            cgOrbit = null;
          }
          renderStaticGallery(section);
        } else if (!cgOrbit) {
          /* Back to desktop: the orbit needs the original <img> nodes, which
             the slicer consumed. Rebuild them from the captured sources. */
          var list = section.querySelector('.cg-static-list');
          if (list) list.remove();
          if (!section.querySelector('.cg-img')) {
            var pin = section.querySelector('.circle-gallery-pin');
            var phrase = section.querySelector('#cg-phrase');
            CG_SOURCES.forEach(function (s) {
              var img = document.createElement('img');
              img.className = 'cg-img';
              img.src = s.src;
              img.alt = s.alt;
              img.width = 1200;
              img.height = 800;
              pin.insertBefore(img, phrase);
            });
          }
          initCircleGallery();
        }
        if (PM) PM.refresh();
      }, 400);
    }, { passive: true });

  });
})();
