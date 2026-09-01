// ─── Smooth Scroll: Lenis + GSAP Ticker Sync ───────────────────────────────
// Lenis drives all scroll momentum; GSAP's ticker calls lenis.raf() each frame
// so ScrollTrigger reads Lenis positions, not native scroll positions.
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out — matches reference feel
});

// Wrap update in arrow fn so `this` context is preserved inside GSAP
lenis.on('scroll', () => ScrollTrigger.update());

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0); // prevent GSAP from throttling RAF on slow frames
// ────────────────────────────────────────────────────────────────────────────




// Canvas Particle Network Background
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray;
let mouseX = -9999;
let mouseY = -9999;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

class Particle {
  constructor(x, y, directionX, directionY, size, color) {
    this.x = x; this.y = y;
    this.directionX = directionX; this.directionY = directionY;
    this.size = size; this.color = color;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
  update() {
    if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
    if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
    let dx = mouseX - this.x;
    let dy = mouseY - this.y;
    let distance = Math.sqrt(dx*dx + dy*dy);
    if (distance < 150) {
      this.x -= dx/10;
      this.y -= dy/10;
    }
    this.x += this.directionX;
    this.y += this.directionY;
    this.draw();
  }
}

function initCanvas() {
  particlesArray = [];
  let numberOfParticles = (canvas.height * canvas.width) / 15000;
  if (numberOfParticles > 100) numberOfParticles = 100;
  for (let i = 0; i < numberOfParticles; i++) {
    let size = (Math.random() * 2) + 1;
    let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
    let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
    let directionX = (Math.random() * 2) - 1;
    let directionY = (Math.random() * 2) - 1;
    let color = 'rgba(224, 255, 0, 0.5)';
    particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

function animateCanvas() {
  requestAnimationFrame(animateCanvas);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
  }
  connectParticles();
}

function connectParticles() {
  for (let a = 0; a < particlesArray.length; a++) {
    for (let b = a; b < particlesArray.length; b++) {
      let distance = ((particlesArray[a].x - particlesArray[b].x) ** 2) +
                     ((particlesArray[a].y - particlesArray[b].y) ** 2);
      if (distance < (canvas.width / 7) * (canvas.height / 7)) {
        let opacityValue = 1 - (distance / 20000);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
        ctx.stroke();
      }
    }
  }
}

window.addEventListener('resize', () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  initCanvas();
});

initCanvas();
animateCanvas();

document.addEventListener("DOMContentLoaded", () => {

  // ─── 1. PRELOADER (unchanged logic) ─────────────────────────────────────
  const loader         = document.getElementById('loader');
  const preloaderSans  = document.querySelector('.preloader-sans');
  const preloaderSerif = document.querySelector('.preloader-serif');

  const loaderSafetyTimer = setTimeout(() => {
    if (loader) loader.style.display = 'none';
    initHeroCinematicScroll();
  }, 10000);

  gsap.timeline({
    onComplete: () => {
      clearTimeout(loaderSafetyTimer);
      // Small delay so ScrollTrigger can measure DOM before building timeline
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        initHeroCinematicScroll();
      });
    }
  })
  .fromTo(preloaderSans,  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' })
  .fromTo(preloaderSerif, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }, '-=0.85')
  .to({}, { duration: 0.6 })
  .to(loader, { yPercent: -100, duration: 0.9, ease: 'power4.inOut', onComplete: () => { loader.style.display = 'none'; } });

  // ─── 2. HERO CINEMATIC SCROLL SEQUENCE (5-IMAGE SEQUENCE) ──────────────────
  const STAGE_1 = 0.0;
  const STAGE_2 = 0.25;
  const STAGE_3 = 0.40;
  const STAGE_4 = 0.55;
  const STAGE_5 = 0.75;
  const STAGE_6 = 0.95;
  const STAGE_7 = 1.0;

  function initHeroCinematicScroll() {
    const wrap       = document.getElementById('hero-scroll-wrapper');
    const intro      = document.getElementById('Intro');
    const nameLeft   = document.getElementById('hero-name-left');
    const nameRight  = document.getElementById('hero-name-right');
    const contentBox = document.getElementById('hero-content-box');
    const imagesBox  = document.getElementById('hero-images-container');
    const overlay    = document.getElementById('hero-vignette-overlay');
    const scrollHint = document.getElementById('hero-scroll-hint');
    const aboutMe    = document.getElementById('about-me-reveal');

    // Select stage images
    const img1 = document.getElementById('hero-img-1');
    const img2 = document.getElementById('hero-img-2');
    const img3 = document.getElementById('hero-img-3');
    const img4 = document.getElementById('hero-img-4');
    const img5 = document.getElementById('hero-img-5');

    if (!wrap || !intro || !nameLeft || !nameRight || !contentBox || !imagesBox || !overlay || !scrollHint || !aboutMe || !img1 || !img2 || !img3 || !img4 || !img5) {
      console.warn('[Hero] Required elements missing for 5-image cinematic scroll.');
      return;
    }

    const SHOW_DEBUG_READOUT = false; // Toggle to true during build debugging

    // Create debug readout if enabled
    let debugDiv = null;
    if (SHOW_DEBUG_READOUT) {
      debugDiv = document.createElement('div');
      debugDiv.style.cssText = 'position:fixed; bottom:20px; right:20px; background:rgba(0,0,0,0.85); color:#e0ff00; padding:12px; font-family:monospace; font-size:11px; border:1px solid #e0ff00; border-radius:4px; z-index:99999; pointer-events:none; line-height:1.4;';
      document.body.appendChild(debugDiv);
    }

    // Image preloading using image.decode() to avoid flash/pop-in
    const imagesToPreload = [
      'images/1.png',
      'images/2.png',
      'images/3.png',
      'images/4.png',
      'images/5.png'
    ];
    let imagesPreloaded = false;
    let preloadedCount = 0;

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decode().then(() => {
        preloadedCount++;
        if (preloadedCount === imagesToPreload.length) {
          imagesPreloaded = true;
          console.log('[Hero] All 5 keyframe images preloaded successfully.');
        }
      }).catch((err) => {
        console.warn('[Hero] Failed to preload:', src, err);
      });
    });

    // Easing utility
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Dynamic split distances
    const vw = window.innerWidth;
    const isMobile = vw <= 768;
    const splitXDistance = isMobile ? vw * 0.22 : vw * 0.28;
    const splitXDistanceMax = isMobile ? vw * 0.38 : vw * 0.48;
    const cinematicScaleMax = isMobile ? 2.5 : 2.0;

    // Initial state setup
    gsap.set(nameLeft,   { x: 0, opacity: 1 });
    gsap.set(nameRight,  { x: 0, opacity: 1 });
    gsap.set(contentBox, { y: '22vh' });
    gsap.set(imagesBox,  { scale: 0.08, opacity: 0, borderRadius: '12px' });
    gsap.set(overlay,    { opacity: 0 });
    gsap.set(scrollHint, { opacity: 1 });
    gsap.set(aboutMe,    { opacity: 0, y: 50 });

    let targetProgress = 0;
    let smoothedProgress = 0;
    const lerpFactor = 0.08;

    // Central frame renderer mapping smoothedProgress (p) directly
    function updateHeroVisuals(p) {
      // 1. Text split & opacity fade
      let nameX = 0;
      let nameOpacity = 1;
      if (p <= STAGE_2) {
        let localP = p / STAGE_2;
        let eased = easeInOutCubic(localP);
        nameX = splitXDistance * eased;
        nameOpacity = 1.0 - 0.6 * eased; // 1.0 -> 0.4
      } else if (p > STAGE_2 && p <= STAGE_4) {
        let localP = (p - STAGE_2) / (STAGE_4 - STAGE_2);
        let eased = easeInOutCubic(localP);
        nameX = splitXDistance + (splitXDistanceMax - splitXDistance) * eased;
        nameOpacity = 0.4 - 0.35 * eased; // 0.4 -> 0.05
      } else {
        let localP = Math.min(1.0, (p - STAGE_4) / (STAGE_5 - STAGE_4));
        let eased = easeInOutCubic(localP);
        nameX = splitXDistanceMax + (splitXDistanceMax * 0.2) * eased;
        nameOpacity = Math.max(0, 0.05 - 0.05 * eased); // 0.05 -> 0.00
      }
      gsap.set(nameLeft,  { x: -nameX, opacity: nameOpacity });
      gsap.set(nameRight, { x: nameX, opacity: nameOpacity });

      // 2. Image container scale & border-radius
      let containerScale = 0;
      let containerOpacity = 0;
      let borderRadius = 12;

      if (p <= STAGE_2) {
        let eased = easeInOutCubic(p / STAGE_2);
        containerScale = 0.08 + (0.35 - 0.08) * eased;
        containerOpacity = eased;
        borderRadius = 12;
      } else if (p > STAGE_2 && p <= STAGE_3) {
        let eased = easeInOutCubic((p - STAGE_2) / (STAGE_3 - STAGE_2));
        containerScale = 0.35 + (0.55 - 0.35) * eased;
        containerOpacity = 1.0;
        borderRadius = 12;
      } else if (p > STAGE_3 && p <= STAGE_4) {
        let eased = easeInOutCubic((p - STAGE_3) / (STAGE_4 - STAGE_3));
        containerScale = 0.55 + (0.80 - 0.55) * eased;
        containerOpacity = 1.0;
        borderRadius = 12;
      } else if (p > STAGE_4 && p <= STAGE_5) {
        let eased = easeInOutCubic((p - STAGE_4) / (STAGE_5 - STAGE_4));
        containerScale = 0.80 + (1.1 - 0.80) * eased;
        containerOpacity = 1.0;
        borderRadius = 12 - 6 * eased;
      } else if (p > STAGE_5 && p <= STAGE_6) {
        let eased = easeInOutCubic((p - STAGE_5) / (STAGE_6 - STAGE_5));
        containerScale = 1.1 + (cinematicScaleMax - 1.1) * eased;
        containerOpacity = 1.0;
        borderRadius = 6 - 6 * eased;
      } else {
        containerScale = cinematicScaleMax;
        containerOpacity = 1.0;
        borderRadius = 0;
      }

      gsap.set(imagesBox, {
        scale: containerScale,
        opacity: containerOpacity,
        borderRadius: borderRadius + 'px'
      });

      // 3. Image crossfades & subtle scale drift
      const imgOpacities = [0, 0, 0, 0, 0];
      const imgScales = [1, 1, 1, 1, 1];

      if (p <= STAGE_2) {
        imgOpacities[0] = 1;
        imgScales[0] = 1;
      } else if (p > STAGE_2 && p <= STAGE_3) {
        let localP = (p - STAGE_2) / (STAGE_3 - STAGE_2);
        let easedP = easeInOutCubic(localP);
        imgOpacities[0] = 1.0 - easedP;
        imgScales[0] = 1.0 - 0.03 * easedP;
        imgOpacities[1] = easedP;
        imgScales[1] = 1.03 - 0.03 * easedP;
      } else if (p > STAGE_3 && p <= STAGE_4) {
        let localP = (p - STAGE_3) / (STAGE_4 - STAGE_3);
        let easedP = easeInOutCubic(localP);
        imgOpacities[1] = 1.0 - easedP;
        imgScales[1] = 1.0 - 0.03 * easedP;
        imgOpacities[2] = easedP;
        imgScales[2] = 1.03 - 0.03 * easedP;
      } else if (p > STAGE_4 && p <= STAGE_5) {
        let localP = (p - STAGE_4) / (STAGE_5 - STAGE_4);
        let easedP = easeInOutCubic(localP);
        imgOpacities[2] = 1.0 - easedP;
        imgScales[2] = 1.0 - 0.03 * easedP;
        imgOpacities[3] = easedP;
        imgScales[3] = 1.03 - 0.03 * easedP;
      } else if (p > STAGE_5 && p <= STAGE_6) {
        let localP = (p - STAGE_5) / (STAGE_6 - STAGE_5);
        let easedP = easeInOutCubic(localP);
        imgOpacities[3] = 1.0 - easedP;
        imgScales[3] = 1.0 - 0.03 * easedP;
        imgOpacities[4] = easedP;
        imgScales[4] = 1.03 - 0.03 * easedP;
      } else {
        imgOpacities[4] = 1;
        imgScales[4] = 1;
      }

      gsap.set(img1, { opacity: imgOpacities[0], scale: imgScales[0] });
      gsap.set(img2, { opacity: imgOpacities[1], scale: imgScales[1] });
      gsap.set(img3, { opacity: imgOpacities[2], scale: imgScales[2] });
      gsap.set(img4, { opacity: imgOpacities[3], scale: imgScales[3] });
      gsap.set(img5, { opacity: imgOpacities[4], scale: imgScales[4] });

      // 4. Scroll hint
      let hintOpacity = p <= 0.02 ? 1.0 - (p / 0.02) : 0;
      gsap.set(scrollHint, { opacity: hintOpacity });

      // 5. Vignette intensity & About Me reveal (Stage 7)
      let vignetteOpacity = 0;
      let aboutOpacity = 0;
      let aboutY = 50;
      if (p > STAGE_6) {
        let localP = (p - STAGE_6) / (STAGE_7 - STAGE_6);
        let eased = easeInOutCubic(localP);
        vignetteOpacity = eased * 0.9;
        aboutOpacity = eased;
        aboutY = 50 - 50 * eased;
      }
      gsap.set(overlay, { opacity: vignetteOpacity });
      gsap.set(aboutMe, { opacity: aboutOpacity, y: aboutY });

      // 6. Left sidebar progress text & vertical dots update
      let stageIndex = 0;
      let label = "INITIAL HERO";

      if (p <= 0.02) {
        stageIndex = 0;
        label = "INITIAL HERO";
      } else if (p > 0.02 && p <= STAGE_2) {
        stageIndex = 1;
        label = "LIGHT REVEALS";
      } else if (p > STAGE_2 && p <= STAGE_3) {
        stageIndex = 2;
        label = "OPENS NOTEBOOK";
      } else if (p > STAGE_3 && p <= STAGE_4) {
        stageIndex = 3;
        label = "WRITES MY NAME";
      } else if (p > STAGE_4 && p <= STAGE_5) {
        stageIndex = 4;
        label = "WRITES MY NAME";
      } else if (p > STAGE_5 && p <= STAGE_6) {
        stageIndex = 5;
        label = "NAME COMPLETE";
      } else {
        stageIndex = 6;
        label = "NAME COMPLETE → TRANSITION";
      }

      document.getElementById('hero-progress-percent').textContent = Math.round(p * 100) + "%";
      document.getElementById('hero-progress-label').textContent = label;

      const dots = document.querySelectorAll('#hero-right-dots .dot');
      dots.forEach((dot, idx) => {
        if (idx === stageIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      // 7. Debug console readout
      if (debugDiv) {
        debugDiv.innerHTML = `
          <strong>HERO DIAGNOSTIC PANEL</strong><br>
          Scroll Progress: ${(p * 100).toFixed(1)}%<br>
          Target: ${targetProgress.toFixed(3)}<br>
          Eased Progress: ${smoothedProgress.toFixed(3)}<br>
          Stage Label: ${label}<br>
          Preloaded: ${imagesPreloaded ? "YES" : "NO"}
        `;
      }
    }

    // Ticking loop using GSAP ticker
    function smoothTick() {
      const diff = targetProgress - smoothedProgress;
      if (Math.abs(diff) > 0.0001) {
        smoothedProgress += diff * lerpFactor;
      } else {
        smoothedProgress = targetProgress;
      }
      updateHeroVisuals(smoothedProgress);
    }

    gsap.ticker.remove(smoothTick);
    gsap.ticker.add(smoothTick);

    // Pinning via ScrollTrigger
    st = ScrollTrigger.create({
      trigger: wrap,
      start: 'top top',
      end: '+=400%',
      pin: intro,
      anticipatePin: 1,
      scrub: true,
      onUpdate: (self) => {
        targetProgress = self.progress;
      }
    });

  }
  // ──────────────────────────────────────────────────────────────────────────


  // ─── 2. REUSABLE MASKED TEXT REVEAL (SplitType) ───────────────────────────
  // type:    'chars' | 'words' | 'lines'
  // trigger: 'scroll' → ScrollTrigger  |  'load' → immediate (use in timeline)
  function revealText(target, {
    type = 'lines',
    trigger = 'scroll',
    delay = 0,
    duration = 0.9,
    stagger = 0.08,
    ease = 'power4.out',
    start = 'top 85%',
  } = {}) {
    if (typeof SplitType === 'undefined') return;
    const elements = typeof target === 'string'
      ? Array.from(document.querySelectorAll(target))
      : [target];

    elements.forEach((el) => {
      if (!el) return;
      const split = new SplitType(el, { types: type });
      const items = type === 'chars' ? split.chars
                  : type === 'words' ? split.words
                  : split.lines;

      const vars = {
        yPercent: 110,
        opacity: type === 'lines' ? 0 : 1,
        stagger,
        duration,
        ease,
        delay: trigger === 'load' ? delay : 0,
      };

      if (trigger === 'scroll') {
        vars.scrollTrigger = { trigger: el, start };
      }

      gsap.from(items, vars);
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 3. SCROLL-TRIGGERED LINE REVEALS (.reveal-text) ─────────────────────
  document.querySelectorAll('.reveal-text').forEach((el) => {
    revealText(el, { type: 'lines', trigger: 'scroll' });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 4. BLUR-WORD SCROLL REVEALS (.blur-reveal) ───────────────────────────
  // Matches lukebaffait about-section: words start opacity:0 + blur(8px),
  // animate in staggered as section scrolls into view.
  document.querySelectorAll('.blur-reveal').forEach((el) => {
    if (typeof SplitType === 'undefined') return;
    const split = new SplitType(el, { types: 'words' });
    gsap.to(split.words, {
      opacity: 1,
      filter: 'blur(0px)',
      stagger: 0.06,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%' },
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 5. GENERIC SECTION FADE-INS (.gs-reveal) ────────────────────────────
  gsap.utils.toArray('.gs-reveal').forEach((el) => {
    gsap.fromTo(el,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      }
    );
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 6. STAT COUNTER ANIMATION ───────────────────────────────────────────
  document.querySelectorAll('.stat-number').forEach((num) => {
    const target = parseInt(num.getAttribute('data-target'));
    ScrollTrigger.create({
      trigger: num, start: 'top 85%', once: true,
      onEnter: () => {
        let cur = 0;
        const inc = target / 40;
        const timer = setInterval(() => {
          cur += inc;
          if (cur >= target) { num.textContent = target; clearInterval(timer); }
          else { num.textContent = Math.floor(cur); }
        }, 40);
      },
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 7. MAGNETIC BUTTONS (.magnetic-btn) ─────────────────────────────────
  // Subtle pull toward cursor — snaps back with elastic ease on leave
  document.querySelectorAll('.magnetic-btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 8. CUSTOM CURSOR (GSAP-driven) ──────────────────────────────────────
  const cursorDot = document.querySelector('.cursor');
  const cursorRing = document.querySelector('.cursor-follower');

  if (cursorDot && cursorRing) {
    gsap.set([cursorDot, cursorRing], { xPercent: -50, yPercent: -50 });

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const mouse = { x: pos.x, y: pos.y };
    const speed = 0.15;

    gsap.ticker.add(() => {
      pos.x += (mouse.x - pos.x) * speed;
      pos.y += (mouse.y - pos.y) * speed;
      gsap.set(cursorRing, { x: pos.x, y: pos.y });
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      gsap.set(cursorDot, { x: e.clientX, y: e.clientY });
    });

    // Scale up ring on hoverable elements
    document.querySelectorAll('a, button, .magnetic-btn, .project-card').forEach((el) => {
      el.addEventListener('mouseenter', () =>
        gsap.to(cursorRing, { scale: 2.2, duration: 0.3, ease: 'power2.out' })
      );
      el.addEventListener('mouseleave', () =>
        gsap.to(cursorRing, { scale: 1, duration: 0.3, ease: 'power2.out' })
      );
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 9. PAGE TRANSITION WIPE (internal links) ─────────────────────────────
  // Accent panel wipes up over the page, nav happens, dark panel follows, both wipe away
  const tPanelAccent = document.getElementById('t-panel-accent');
  const tPanelDark   = document.getElementById('t-panel-dark');

  function runPageTransition(href) {
    const tl = gsap.timeline({
      onComplete: () => { window.location.href = href; },
    });
    tl.to(tPanelAccent, { yPercent: 0, duration: 0.45, ease: 'power4.inOut' })
      .to(tPanelDark,   { yPercent: 0, duration: 0.45, ease: 'power4.inOut' }, '-=0.2');
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    // Anchor links — smooth scroll via Lenis, no page wipe needed
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 10. BACK TO TOP ─────────────────────────────────────────────────────
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    ScrollTrigger.create({
      start: 500, end: 99999,
      onToggle: (self) => {
        gsap.to(backToTop, { opacity: self.isActive ? 1 : 0, duration: 0.3 });
        backToTop.style.visibility = self.isActive ? 'visible' : 'hidden';
      },
    });
    backToTop.addEventListener('click', () => lenis.scrollTo(0));
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 11. MOBILE MENU ─────────────────────────────────────────────────────
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const icon = menuBtn.querySelector('i');
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    });
    navLinks.querySelectorAll('a').forEach((item) => {
      item.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const icon = menuBtn.querySelector('i');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
      });
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 12. VANILLA TILT ────────────────────────────────────────────────────
  if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll('.tech-card'),          { max: 15, speed: 400, glare: true, 'max-glare': 0.2, scale: 1.05 });
    VanillaTilt.init(document.querySelectorAll('.profile-frame'),      { max: 8,  speed: 400, glare: true, 'max-glare': 0.3, scale: 1.02 });
    VanillaTilt.init(document.querySelectorAll('.project-card'),        { max: 4,  speed: 400, glare: true, 'max-glare': 0.08, scale: 1.02 });
    VanillaTilt.init(document.querySelectorAll('.info-block.standout'),{ max: 5,  speed: 400, glare: true, 'max-glare': 0.1, scale: 1.02 });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 13. TYPED.JS ────────────────────────────────────────────────────────
  if (typeof Typed !== 'undefined') {
    const heroDescEl = document.querySelector('.hero-desc');
    if (heroDescEl) {
      const originalText = heroDescEl.textContent;
      heroDescEl.innerHTML = '<span id="typed-hero-desc"></span>';
      new Typed('#typed-hero-desc', {
        strings: [originalText, 'Building secure architectures.', 'Transforming ideas into digital reality.', 'Engineering the future.'],
        typeSpeed: 40, backSpeed: 20, backDelay: 2000,
        loop: true, showCursor: true, cursorChar: '_',
      });
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 14. SPOTLIGHT EFFECT ON CARDS ───────────────────────────────────────
  document.querySelectorAll('.tech-card, .project-card, .info-block').forEach((card) => {
    card.classList.add('spotlight-card');
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--y', `${e.clientY - rect.top}px`);
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 15. CURSOR CLICK RIPPLE ─────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-click';
    ripple.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:40px;height:40px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 16. SCROLL PROGRESS BAR ─────────────────────────────────────────────
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollTop;
      const max   = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      scrollProgress.style.width = `${(total / max) * 100}%`;
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 17. GOAL PROGRESS BARS ──────────────────────────────────────────────
  document.querySelectorAll('.goal-bar').forEach((bar) => {
    const progress = bar.style.getPropertyValue('--progress');
    bar.style.width = '0%';
    ScrollTrigger.create({
      trigger: bar, start: 'top 90%', once: true,
      onEnter: () => setTimeout(() => { bar.style.width = progress; }, 200),
    });
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 18. THREE.JS 3D SCENE (Piece 1: Canvas + 3D Geometry) ─────────────────
  function initThreeScene() {
    const canvas = document.getElementById('webgl-canvas');
    const container = document.getElementById('Scene3D');
    if (!canvas || !container || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();

    const getWidth = () => container.clientWidth || window.innerWidth;
    const getHeight = () => container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, getWidth() / getHeight(), 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(getWidth(), getHeight());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3D Object Group (Torus Knot with dark core + accent wireframe)
    const meshGroup = new THREE.Group();

    // Base geometry
    const geometry = new THREE.TorusKnotGeometry(1.6, 0.45, 128, 32);

    // Inner dark material
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(geometry, innerMaterial);
    meshGroup.add(innerMesh);

    // Outer wireframe with portfolio neon accent
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    meshGroup.add(wireframeMesh);

    scene.add(meshGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xe0ff00, 1.8);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x00f0ff, 2.0, 50);
    fillLight.position.set(-5, -3, 3);
    scene.add(fillLight);

    // Store references on window for subsequent scrub integration
    window.threeSceneObj = {
      scene,
      camera,
      renderer,
      meshGroup,
    };

    // ─── Scroll-Scrubbed Motion (Piece 2) ───────────────────────────
    const scrubData = {
      rotX: -0.4,
      rotY: -0.8,
      rotZ: -0.2,
      camZ: 8.5,
      posY: -0.6,
    };

    gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2,
      },
    })
    .fromTo(
      scrubData,
      { rotX: -0.4, rotY: -0.8, rotZ: -0.2, camZ: 8.5, posY: -0.6 },
      {
        rotX: Math.PI * 2.2,
        rotY: Math.PI * 3.4,
        rotZ: Math.PI * 1.2,
        camZ: 5.4,
        posY: 0.6,
        ease: 'none',
      }
    );

    // ─── 3D Text Overlay Scroll-Scrub Reveal (Piece 3) ──────────────
    const overlay = container.querySelector('.scene-3d-overlay');
    if (overlay) {
      gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 55%',
          end: 'bottom 45%',
          scrub: 1,
        },
      })
      .fromTo(
        overlay,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 1 }
      )
      .to(overlay, { opacity: 0, y: -40, ease: 'power2.in', duration: 0.8 });
    }

    // Render loop combining scroll scrub + subtle organic idle rotation
    let rafId;
    let idleRotX = 0;
    let idleRotY = 0;

    function renderLoop() {
      rafId = requestAnimationFrame(renderLoop);

      idleRotX += 0.0015;
      idleRotY += 0.0025;

      meshGroup.rotation.x = scrubData.rotX + idleRotX;
      meshGroup.rotation.y = scrubData.rotY + idleRotY;
      meshGroup.rotation.z = scrubData.rotZ;
      meshGroup.position.y = scrubData.posY;

      camera.position.z = scrubData.camZ;

      renderer.render(scene, camera);
    }
    renderLoop();

    // Resize handling
    window.addEventListener('resize', () => {
      const w = getWidth();
      const h = getHeight();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  initThreeScene();
  // ──────────────────────────────────────────────────────────────────────────

  // ─── 19. CIRCULAR IMAGE GALLERY (Reference 3D Orbit + Finite Timeline) ────
  function initCircleGallery() {
    const cgSection = document.getElementById('Projects') || document.getElementById('circle-gallery');
    if (!cgSection) return;

    // Single Project Data Source (6 Projects)
    const PROJECTS_DATA = [
      {
        num: "01 / 06",
        title: "SMART WEB PENTESTING",
        github: "https://github.com/ponram06"
      },
      {
        num: "02 / 06",
        title: "SKILLBRIDGE",
        github: "https://github.com/ponram06"
      },
      {
        num: "03 / 06",
        title: "NAVILENS AR",
        github: "https://github.com/ponram06"
      },
      {
        num: "04 / 06",
        title: "VAXI-TRACK",
        github: "https://github.com/ponram06"
      },
      {
        num: "05 / 06",
        title: "AI CATTLE RECOGNITION",
        github: "https://github.com/ponram06"
      },
      {
        num: "06 / 06",
        title: "INTERACTIVE ARCHITECTURES",
        github: "https://github.com/ponram06"
      }
    ];

    function isMobileViewport() {
      return window.innerWidth <= 768;
    }

    if (isMobileViewport()) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Build cylindrical slices for image curvature (Exact Reference Logic)
    (function buildSlices() {
      const SLICES = 10;
      const imgW = Math.min(Math.max(130, vw * 0.15), 210);
      const imgH = imgW * 2 / 3;
      const orbitR = (vw * 0.38 + 520) / 2;
      const bendRad = imgW / orbitR;
      const cylR = orbitR;
      const sliceW = imgW / SLICES;
      const totalBendDeg = bendRad * 180 / Math.PI;
      const stepDeg = totalBendDeg / SLICES;

      cgSection.querySelectorAll('.cg-img').forEach(function (img) {
        if (img.tagName !== 'IMG') return; // Prevent double-slicing
        const src = img.getAttribute('src');
        const wrapper = document.createElement('div');
        wrapper.className = 'cg-img';

        for (let s = 0; s < SLICES; s++) {
          const sl = document.createElement('div');
          sl.className = 'cg-slice';
          const displayW = sliceW + 1.5;
          sl.style.width = displayW.toFixed(1) + 'px';
          sl.style.left = '50%';
          sl.style.marginLeft = (-displayW / 2).toFixed(1) + 'px';
          sl.style.backgroundImage = 'url("' + src + '")';
          sl.style.backgroundSize = imgW.toFixed(1) + 'px ' + imgH.toFixed(1) + 'px';
          sl.style.backgroundPosition = (-s * sliceW).toFixed(1) + 'px 0';
          sl.style.transformOrigin = '50% 50% ' + (-cylR).toFixed(1) + 'px';
          const angle = (s - (SLICES - 1) / 2) * stepDeg;
          sl.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
          wrapper.appendChild(sl);
        }

        img.parentNode.replaceChild(wrapper, img);
      });
    })();

    const cgImgs = gsap.utils.toArray(cgSection.querySelectorAll('.cg-img'));
    const cgPhrase = cgSection.querySelector('#cg-phrase');
    const cgCenterUI = cgSection.querySelector('#cg-center-ui');
    const cgCounter = cgSection.querySelector('#cg-counter');
    const cgTitle = cgSection.querySelector('#cg-title');
    const cgBtn = cgSection.querySelector('#cg-btn');

    const count = cgImgs.length;

    // Wrap phrase words for blur-to-sharp reveal (Exact Reference Logic)
    (function wrapPhraseWords(el) {
      if (!el) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function (node) {
        const words = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        words.forEach(function (w) {
          if (/^\s+$/.test(w)) {
            frag.appendChild(document.createTextNode(w));
          } else if (w) {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            frag.appendChild(span);
          }
        });
        node.parentNode.replaceChild(frag, node);
      });
    })(cgPhrase);

    const cgPhraseWords = cgPhrase ? gsap.utils.toArray(cgPhrase.querySelectorAll('.word')) : [];

    // Responsive Safe Orbit Geometry (Guarantees no card touches or crosses viewport edges)
    const cardW = Math.min(Math.max(120, vw * 0.095), 175);
    const cardH = cardW * 2 / 3;
    const cardHalfW = cardW / 2;
    const cardHalfH = cardH / 2;

    const safeMarginX = 55;
    const safeMarginY = 45;

    // Responsive safe orbit radius bounds:
    const maxSafeRx = (vw / 2) - cardHalfW - safeMarginX;
    const rx = Math.max(140, Math.min(maxSafeRx, vw * 0.32));

    const maxSafeTiltY = (vh / 2) - cardHalfH - safeMarginY - 140;
    const tiltY = Math.max(50, Math.min(maxSafeTiltY, vh * 0.22));

    const rz = Math.min(420, rx * 0.85);
    const entryAngle = Math.PI / 2;

    function getPosForAngle(angle) {
      const x = Math.cos(angle) * rx;
      const z = Math.sin(angle) * rz;

      // Subtle inward perspective tilt (-12deg to +12deg), clamped strictly, NEVER flipping
      const rotYDeg = Math.max(-12, Math.min(12, (x / rx) * -10));

      // Protected Center Safe Zone Offset:
      // When image passes through central content area (|x| < 300px), push Y offset away from text
      const distFromCenter = Math.abs(x);
      const centerFactor = 1 - Math.min(1, distFromCenter / 300);
      const verticalClearance = (z >= 0 ? 145 : -145) * centerFactor;

      return {
        x: x,
        y: (z / rz) * tiltY + verticalClearance,
        z: z,
        rotYDeg: rotYDeg
      };
    }

    const pinEl = cgSection.querySelector('.circle-gallery-pin') || cgSection;
    let currentActiveIdx = -999;
    let currentMode = 'NONE'; // 'INTRO', 'GALLERY', 'ENDING'

    function renderCenterUI(idx) {
      if (!cgCenterUI) return;
      const p = PROJECTS_DATA[idx];
      if (!p) return;

      gsap.to(cgCenterUI, {
        opacity: 0,
        y: 12,
        filter: 'blur(5px)',
        duration: 0.18,
        ease: 'power2.in',
        onComplete: function () {
          if (cgCounter) cgCounter.textContent = p.num;
          if (cgTitle) cgTitle.textContent = p.title;
          if (cgBtn) {
            cgBtn.href = p.github;
            cgBtn.style.display = 'inline-flex';
          }

          gsap.to(cgCenterUI, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.25,
            ease: 'power2.out'
          });
        }
      });
    }

    ScrollTrigger.create({
      trigger: cgSection,
      start: 'top top',
      end: 'bottom bottom',
      pin: pinEl,
      anticipatePin: 1,
      onUpdate: function (self) {
        const progress = self.progress;

        // ─── FINITE TIMELINE STATES ───
        // progress 0.00 - 0.10: STATE 0 (Intro Phrase)
        // progress 0.10 - 0.85: GALLERY PHASE (Projects 01/06 -> 06/06)
        // progress 0.85 - 1.00: FINAL STATE (Ending Phrase)

        const isIntro = progress <= 0.10;
        const isEnding = progress >= 0.85;
        const isGallery = !isIntro && !isEnding;

        // 1. Staging Intro & Ending Phrase vs Project Center UI
        if (isIntro || isEnding) {
          const modeP = isIntro ? Math.max(0, Math.min(1, progress / 0.10)) : Math.max(0, Math.min(1, (progress - 0.85) / 0.15));
          if (cgPhrase) {
            let alpha = 1;
            if (isIntro) alpha = modeP < 0.2 ? modeP / 0.2 : (modeP > 0.8 ? (1 - modeP) / 0.2 : 1);
            else alpha = modeP < 0.2 ? modeP / 0.2 : 1;
            cgPhrase.style.opacity = alpha;
            cgPhrase.style.transform = 'translateY(' + (40 * (0.5 - modeP)).toFixed(1) + 'px)';
          }

          cgPhraseWords.forEach(function (w) {
            w.style.opacity = '1';
            w.style.filter = 'blur(0px)';
          });

          if (cgCenterUI) {
            cgCenterUI.style.opacity = '0';
            cgCenterUI.style.pointerEvents = 'none';
          }
          currentActiveIdx = -999;
        } else {
          if (cgPhrase) cgPhrase.style.opacity = '0';
        }

        // 2. Determine Active Project Index during Gallery Phase (Clamped 0 to 5)
        let activeIdx = -1;
        if (isGallery) {
          const galleryP = Math.max(0, Math.min(1, (progress - 0.10) / 0.75));
          activeIdx = Math.min(count - 1, Math.max(0, Math.floor(galleryP * count)));
        }

        // 3. Position ALL 6 3D Project Cards around the continuous orbit
        // All 6 cards remain on-screen in 3D orbit at all times with subtle perspective tilt (-9° to +9°)
        cgImgs.forEach(function (img, i) {
          const baseAngle = entryAngle - (i / count) * Math.PI * 2;
          const cardAngle = baseAngle - progress * Math.PI * 2.2;
          const pos = getPosForAngle(cardAngle);

          if (i === activeIdx && isGallery) {
            // Active front card: sharp, bright, upright facing front
            img.style.transform =
              'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' + (pos.z + 40).toFixed(1) + 'px)' +
              ' rotateY(' + pos.rotYDeg.toFixed(1) + 'deg) scale(1.14)';
            img.style.opacity = '1';
            img.style.filter = 'blur(0px) brightness(1.2)';
            img.style.zIndex = Math.round(pos.z + 1000);
          } else {
            // Background & side cards: smaller, dimmer, subtle 3D tilt (ALWAYS VISIBLE & UPRIGHT)
            let alpha = 0.75;
            if (pos.z < -200) alpha = 0.45;

            img.style.transform =
              'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' + pos.z.toFixed(1) + 'px)' +
              ' rotateY(' + pos.rotYDeg.toFixed(1) + 'deg) scale(0.84)';
            img.style.opacity = alpha.toFixed(2);
            img.style.filter = 'blur(1.5px) brightness(0.72)';
            img.style.zIndex = Math.round(pos.z + 200);
          }
        });

        // 4. Update floating center typography when active project changes
        if (isGallery && activeIdx !== -1 && activeIdx !== currentActiveIdx) {
          currentActiveIdx = activeIdx;
          renderCenterUI(activeIdx);
        }
      }
    });
  }

  initCircleGallery();
  // ──────────────────────────────────────────────────────────────────────────

});


