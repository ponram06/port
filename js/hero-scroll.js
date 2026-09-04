/**
 * hero-scroll.js  — Cinematic Hero Scroll Sequence
 *
 * Architecture:
 *   #hero-scroll-wrapper  (height: 400vh, scroll driver)
 *   └── #hero-sticky      (position: sticky; height: 100vh, the canvas)
 *       ├── #hero-name-left   "PONRAM"
 *       ├── #hero-name-right  "P."
 *       ├── #hero-meta        subtitle + desc
 *       ├── #hero-img-box     the intro.png container
 *       └── #hero-cover       dark fade-out overlay
 *
 * ONE gsap.timeline({ scrollTrigger }) drives everything.
 * No CSS transforms are mixed with GSAP transforms.
 * All positioning/centering is done purely via GSAP.
 */

(function () {
  'use strict';

  function buildHero() {
    /* ── 1. Grab elements ────────────────────────────────────────────────── */
    var wrapper  = document.getElementById('hero-scroll-wrapper');
    var nameL    = document.getElementById('hero-name-left');
    var nameR    = document.getElementById('hero-name-right');
    var meta     = document.getElementById('hero-meta');
    var imgBox   = document.getElementById('hero-img-box');
    var cover    = document.getElementById('hero-cover');

    if (!wrapper || !nameL || !nameR || !imgBox) {
      console.error('[HeroScroll] Missing required DOM elements. Check hero HTML.');
      return;
    }

    /* ── 2. Set initial states via GSAP (no CSS transforms on these elements) */

    // Names – start centered.  We position them with left/right CSS on the
    // PARENT (#hero-sticky uses flex centering).  GSAP only touches x + opacity.
    gsap.set([nameL, nameR], { x: 0, opacity: 1, clearProps: 'transform' });

    // Image box – starts invisible and tiny, centered via xPercent/yPercent
    gsap.set(imgBox, {
      opacity: 0,
      scale: 0.05,
      xPercent: -50,
      yPercent: -50,
      transformOrigin: '50% 50%',
    });

    // Cover overlay – transparent
    gsap.set(cover, { opacity: 0 });

    // Meta – fully visible
    gsap.set(meta, { opacity: 1, y: 0 });

    /* ── 3. Calculate movement distances at runtime ───────────────────────── */
    var vw = window.innerWidth;
    var isMobile = vw <= 768;

    // Distance each name travels in pixels from its natural start position
    // ~40% of viewport width keeps names inside on all breakpoints
    var nameTravel = vw * (isMobile ? 0.32 : 0.40);

    // Max scale multiplier – at this scale the image fills the viewport
    // imgBox CSS width = min(32vw, 600px), scale 8 ≈ full vw on desktop
    var imgFinalScale = isMobile ? 14 : 8;

    /* ── 4. Build the master timeline ───────────────────────────────────────
     *
     *  Progress  0.00  –  1.00  maps 1:1 to scroll position
     *
     *  [0.00 – 0.12]  meta fades out
     *  [0.08 – 0.28]  image fades in, grows from scale(0.05) → scale(1)
     *  [0.28 – 0.60]  PONRAM slides left, P. slides right, image → scale(1)
     *  [0.50 – 0.88]  image expands to full cinematic scale
     *  [0.62 – 0.82]  names fully exit (opacity → 0)
     *  [0.75 – 1.00]  cover darkens (smooth hand-off to About)
     *
     * ──────────────────────────────────────────────────────────────────────*/
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,          // the 400vh scroll driver
        start:   'top top',        // when wrapper top hits viewport top
        end:     'bottom bottom',  // when wrapper bottom hits viewport bottom
        scrub:   1.5,              // cinematic lag (not instant but not sluggish)
        // pin: false  — we use CSS sticky on #hero-sticky instead, which avoids
        //               Lenis conflicts that GSAP pin causes.
      },
    });

    // Phase 1 – meta fades out immediately on scroll
    tl.to(meta, { opacity: 0, y: -20, duration: 0.12, ease: 'power1.in' }, 0.00);

    // Phase 2 – image appears, small, centered
    tl.to(imgBox, { opacity: 1, duration: 0.06, ease: 'none' },            0.08);
    tl.to(imgBox, { scale: 1,   duration: 0.20, ease: 'power2.out' },      0.08);

    // Phase 3 – names split while image is at scale(1)
    tl.to(nameL, { x: -nameTravel, duration: 0.32, ease: 'power2.inOut' }, 0.28);
    tl.to(nameR, { x:  nameTravel, duration: 0.32, ease: 'power2.inOut' }, 0.28);

    // Phase 4 – image grows into cinematic frame
    tl.to(imgBox, { scale: imgFinalScale, duration: 0.38, ease: 'power2.in' }, 0.50);

    // Phase 5 – names fully exit
    tl.to(nameL,  { opacity: 0, duration: 0.20, ease: 'power1.in' }, 0.62);
    tl.to(nameR,  { opacity: 0, duration: 0.20, ease: 'power1.in' }, 0.62);

    // Phase 6 – dark cover smoothly transitions into About
    tl.to(cover, { opacity: 1, duration: 0.25, ease: 'power2.in' }, 0.75);

    console.log('[HeroScroll] Timeline built. ScrollTrigger connected to #hero-scroll-wrapper.');
  }

  /* ── 5. Wait for DOM then build ──────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHero);
  } else {
    buildHero();
  }

})();
