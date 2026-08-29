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

  // ─── 1. PRELOADER INTRO SEQUENCE (name reveal → slide-up wipe) ───────────
  const loader         = document.getElementById('loader');
  const preloaderSans  = document.querySelector('.preloader-sans');
  const preloaderSerif = document.querySelector('.preloader-serif');

  // Safety net: if GSAP never fires (e.g. script error), remove loader after 10s
  const loaderSafetyTimer = setTimeout(() => {
    if (loader) { loader.style.display = 'none'; }
    ScrollTrigger.refresh();
    initHeroEntry();
  }, 10000);

  const preloaderTl = gsap.timeline({
    onComplete: () => {
      clearTimeout(loaderSafetyTimer);
      ScrollTrigger.refresh();
      // Hero entry begins only after the overlay is gone
      initHeroEntry();
    }
  });

  // 1. "PONRAM" (sans-serif) enters from below
  preloaderTl.fromTo(
    preloaderSans,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }
  )
  // 2. "P." (italic serif) enters ~0.15s after sans begins
  .fromTo(
    preloaderSerif,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' },
    '-=0.85'
  )
  // 3. Hold for ~0.6s so name is legible
  .to({}, { duration: 0.6 })
  // 4. Slide entire loader overlay up off-screen
  .to(loader, {
    yPercent: -100,
    duration: 0.9,
    ease: 'power4.inOut',
    onComplete: () => { loader.style.display = 'none'; }
  });

  // Hero elements animate in sequentially after preloader clears
  let hasEnteredHero = false;
  function initHeroEntry() {
    if (hasEnteredHero) return;
    hasEnteredHero = true;

    const heroTl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        // Scroll indicator line pulse starts only once the indicator is visible
        gsap.to('.scroll-indicator .line', {
          scaleX: 1.8, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
          delay: 0.5,
        });
      }
    });

    heroTl
      // Hero subtitle slides up
      .from('.hero-subtitle', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' })
      // Hero title: SplitType char masked reveal
      .add(() => {
        const titleEl = document.querySelector('.hero-title');
        if (titleEl && typeof SplitType !== 'undefined') {
          const split = new SplitType(titleEl, { types: 'chars' });
          gsap.from(split.chars, {
            yPercent: 120,
            stagger: 0.04,
            duration: 1.0,
            ease: 'power4.out',
          });
        }
      }, '-=0.4')
      // Hero description
      .from('.hero-desc', { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' }, '-=0.5')
      // Profile photo slides in from right
      .from('.profile-frame', { x: 60, opacity: 0, duration: 1.0, ease: 'power3.out' }, '-=0.7')
      // Scroll indicator fades in last
      .from('.scroll-indicator', { opacity: 0, duration: 0.8 }, '-=0.3');
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

  // ─── 19. CIRCULAR IMAGE GALLERY (Reference Exact Implementation) ──────────
  function initCircleGallery() {
    const cgSection = document.getElementById('Projects') || document.getElementById('circle-gallery');
    if (!cgSection) return;

    function isMobileViewport() {
      return window.innerWidth <= 768;
    }

    if (isMobileViewport()) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Build slices (cylindrical curvature)
    (function buildSlices() {
      const SLICES = 10;
      const imgW = Math.min(Math.max(120, vw * 0.14), 210);
      const imgH = imgW * 2 / 3;
      const orbitR = (vw * 0.34 + 500) / 2;
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
    const cgPhrase = cgSection.querySelector('#cg-phrase') || document.getElementById('cg-phrase');
    const count = cgImgs.length;

    // Wrap phrase words for blur-to-sharp reveal
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

    const rx = vw * 0.34;
    const rz = 500;
    const tiltY = vw <= 768 ? 80 : 180;
    const entryAngle = Math.PI / 2;
    const offX = vw * 0.85;

    function getPos(t) {
      if (t <= 0.12) {
        const p = t / 0.12;
        return {
          x: -offX * (1 - p),
          y: tiltY,
          z: rz * p,
          rotY: 0
        };
      }
      if (t <= 0.88) {
        const p = (t - 0.12) / 0.76;
        const angle = entryAngle - p * Math.PI * 2;
        const x = Math.cos(angle) * rx;
        const z = Math.sin(angle) * rz;
        const ry = p * Math.PI * 2;
        return {
          x: x,
          y: (z / rz) * tiltY,
          z: z,
          rotY: ry
        };
      }
      const p = (t - 0.88) / 0.12;
      return {
        x: offX * p,
        y: tiltY,
        z: rz * (1 - p),
        rotY: Math.PI * 2
      };
    }

    const stagger = 0.09;
    const totalRange = 1 + stagger * (count - 1);

    cgImgs.forEach(function (img) { img.style.opacity = '0'; });

    const pinEl = cgSection.querySelector('.circle-gallery-pin') || cgSection;

    ScrollTrigger.create({
      trigger: cgSection,
      start: 'top top',
      end: 'bottom bottom',
      pin: pinEl,
      anticipatePin: 1,
      onUpdate: function (self) {
        const progress = self.progress;

        cgImgs.forEach(function (img, i) {
          const imgT = progress * totalRange - i * stagger;

          if (imgT <= 0 || imgT >= 1) {
            img.style.opacity = '0';
            return;
          }

          let alpha = 1;
          if (imgT < 0.06) alpha = imgT / 0.06;
          else if (imgT > 0.94) alpha = (1 - imgT) / 0.06;

          const pos = getPos(imgT);
          const rotDeg = (pos.rotY * 180 / Math.PI).toFixed(1);

          img.style.transform =
            'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' + pos.z.toFixed(1) + 'px)' +
            ' rotateY(' + rotDeg + 'deg)';
          img.style.opacity = alpha;
          img.style.zIndex = Math.round(pos.z + 600);
        });

        const phraseStart = 0.25;
        const phraseEnd = 0.75;
        const travelY = 200;

        if (progress < phraseStart || progress > phraseEnd) {
          if (cgPhrase) cgPhrase.style.opacity = '0';
        } else {
          const globalP = (progress - phraseStart) / (phraseEnd - phraseStart);
          const yOffset = travelY * (0.5 - globalP);
          if (cgPhrase) cgPhrase.style.transform = 'translateY(' + yOffset.toFixed(1) + 'px)';

          const revealEnd = 0.4;
          cgPhraseWords.forEach(function (w, wi) {
            if (globalP < revealEnd) {
              const revealP = globalP / revealEnd;
              const wordT = revealP * (cgPhraseWords.length + 4) - wi;
              const wP = Math.max(0, Math.min(1, wordT / 3));
              w.style.opacity = wP;
              w.style.filter = 'blur(' + (8 * (1 - wP)).toFixed(1) + 'px)';
            } else {
              w.style.opacity = '1';
              w.style.filter = 'blur(0px)';
            }
          });

          let alpha = 1;
          if (globalP < 0.1) alpha = globalP / 0.1;
          else if (globalP > 0.75) alpha = (1 - globalP) / 0.25;
          if (cgPhrase) cgPhrase.style.opacity = alpha;
        }
      }
    });
  }

  initCircleGallery();
  // ──────────────────────────────────────────────────────────────────────────

});


