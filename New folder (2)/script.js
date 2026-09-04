// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis smooth scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 2,
});

// Synchronize Lenis scroll position with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// Synchronize GSAP ticker with Lenis requestAnimationFrame (RAF)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// Disable lag smoothing to prevent stuttering during scroll animations
gsap.ticker.lagSmoothing(0);

console.log("Section 1 Initialized: Lenis + GSAP Ticker Sync active.");

/* ==========================================================================
   PRELOADER / INTRO SEQUENCE
   ========================================================================== */

function initPreloaderIntroSequence() {
  const preloader = document.getElementById('preloader');
  const sans = document.querySelector('.preloader-sans');
  const serif = document.querySelector('.preloader-serif');

  if (!preloader || !sans || !serif) return;

  // Prevent scroll while preloader is active
  lenis.stop();

  const tl = gsap.timeline({
    onComplete: () => {
      // Re-enable smooth scrolling once preloader is dismissed
      lenis.start();
      ScrollTrigger.refresh();
    }
  });

  // 1. "Ponram" (sans-serif) enters
  tl.fromTo(
    sans,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }
  )
  // 2. "P." (italic serif) enters ~0.15s after sans begins
  .fromTo(
    serif,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' },
    '-=0.85'
  )
  // 3. Hold for ~0.6s
  .to({}, { duration: 0.6 })
  // 4. Slide preloader overlay up off-screen to reveal website
  .to(preloader, {
    yPercent: -100,
    duration: 0.9,
    ease: 'power4.inOut',
    onComplete: () => {
      preloader.style.display = 'none';
    }
  });
}

// Trigger intro sequence on page load
initPreloaderIntroSequence();

/* ==========================================================================
   SECTION 2: Masked Text Reveal System (Reusable split chars & lines)
   ========================================================================== */

let splitInstances = [];

function initMaskedTextReveals() {
  // Re-cleans any previous instances on re-init
  splitInstances.forEach(instance => instance && instance.revert && instance.revert());
  splitInstances = [];

  // 1. Line Masked Reveals
  const lineElements = document.querySelectorAll('[data-reveal="lines"]');
  lineElements.forEach((el) => {
    const split = new SplitType(el, { types: 'lines' });
    splitInstances.push(split);

    // Wrap each line in an overflow:hidden container (.line-mask)
    if (split.lines) {
      split.lines.forEach((line) => {
        const maskWrapper = document.createElement('div');
        maskWrapper.className = 'line-mask';
        line.parentNode.insertBefore(maskWrapper, line);
        maskWrapper.appendChild(line);
      });

      // Animate lines from bottom overflow
      gsap.fromTo(
        split.lines,
        {
          yPercent: 110,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }
  });

  // 2. Character Masked Reveals
  const charElements = document.querySelectorAll('[data-reveal="chars"]');
  charElements.forEach((el) => {
    const split = new SplitType(el, { types: 'chars, words' });
    splitInstances.push(split);

    if (split.chars) {
      split.chars.forEach((char) => {
        const maskWrapper = document.createElement('span');
        maskWrapper.className = 'char-mask';
        char.parentNode.insertBefore(maskWrapper, char);
        maskWrapper.appendChild(char);
      });

      gsap.fromTo(
        split.chars,
        {
          yPercent: 120,
          opacity: 0,
          rotateX: -30,
        },
        {
          yPercent: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.02,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }
  });
}

// Initialize text reveals
initMaskedTextReveals();

/* ==========================================================================
   SECTION 3: Scroll-Triggered Fade / Scale-Ins System
   ========================================================================== */

function initScrollAnimations() {
  // 1. Standalone / Non-grouped scroll elements
  const scrollElements = document.querySelectorAll('[data-scroll]:not([data-scroll-group] [data-scroll])');
  
  scrollElements.forEach((el) => {
    const type = el.getAttribute('data-scroll');
    const delay = parseFloat(el.getAttribute('data-scroll-delay')) || 0;
    const duration = parseFloat(el.getAttribute('data-scroll-duration')) || 1.0;

    let initialVars = { opacity: 0 };
    let animateVars = {
      opacity: 1,
      duration: duration,
      delay: delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none reverse',
      },
    };

    if (type === 'fade-up') {
      initialVars.y = 50;
      animateVars.y = 0;
    } else if (type === 'scale-in') {
      initialVars.scale = 0.88;
      initialVars.y = 30;
      animateVars.scale = 1;
      animateVars.y = 0;
      animateVars.ease = 'back.out(1.2)';
    }

    gsap.fromTo(el, initialVars, animateVars);
  });

  // 2. Grouped / Staggered Scroll Elements
  const scrollGroups = document.querySelectorAll('[data-scroll-group]');
  
  scrollGroups.forEach((group) => {
    const children = group.querySelectorAll('[data-scroll]');
    if (!children.length) return;

    const groupStagger = parseFloat(group.getAttribute('data-scroll-stagger')) || 0.15;

    // Set initial states for all children in group
    children.forEach((child) => {
      const type = child.getAttribute('data-scroll');
      if (type === 'fade-up') {
        gsap.set(child, { opacity: 0, y: 40 });
      } else if (type === 'scale-in') {
        gsap.set(child, { opacity: 0, scale: 0.88, y: 30 });
      } else {
        gsap.set(child, { opacity: 0 });
      }
    });

    ScrollTrigger.create({
      trigger: group,
      start: 'top 85%',
      toggleActions: 'play none none reverse',
      onEnter: () => {
        children.forEach((child, idx) => {
          const type = child.getAttribute('data-scroll');
          const itemDelay = parseFloat(child.getAttribute('data-scroll-delay')) || (idx * groupStagger);
          
          gsap.to(child, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.0,
            delay: itemDelay,
            ease: type === 'scale-in' ? 'back.out(1.2)' : 'power3.out',
            overwrite: 'auto',
          });
        });
      },
      onLeaveBack: () => {
        children.forEach((child) => {
          const type = child.getAttribute('data-scroll');
          gsap.to(child, {
            opacity: 0,
            y: type === 'fade-up' ? 40 : (type === 'scale-in' ? 30 : 0),
            scale: type === 'scale-in' ? 0.88 : 1,
            duration: 0.5,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        });
      },
    });
  });
}

// Initialize scroll animations
initScrollAnimations();

// Handle debounced window resize for SplitType & ScrollTrigger recalculation
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initMaskedTextReveals();
    initScrollAnimations();
    ScrollTrigger.refresh();
  }, 250);
});

console.log("Section 2 & 3 Initialized: Masked Text Reveals & Scroll Fade/Scale-Ins ready.");

/* ==========================================================================
   SECTION 4: Custom Cursor System (gsap.quickTo, text badges & hover states)
   ========================================================================== */

function initCustomCursor() {
  const cursorDot = document.getElementById('custom-cursor');
  const cursorFollower = document.getElementById('cursor-follower');
  const cursorText = document.getElementById('cursor-text');

  if (!cursorDot || !cursorFollower) return;

  // Check if device supports fine pointer (mouse)
  const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isTouch) {
    cursorDot.style.display = 'none';
    cursorFollower.style.display = 'none';
    return;
  }

  // Smooth position setters using gsap.quickTo for optimal performance
  const xDotTo = gsap.quickTo(cursorDot, 'x', { duration: 0.08, ease: 'power2.out' });
  const yDotTo = gsap.quickTo(cursorDot, 'y', { duration: 0.08, ease: 'power2.out' });

  const xFollowerTo = gsap.quickTo(cursorFollower, 'x', { duration: 0.25, ease: 'power3.out' });
  const yFollowerTo = gsap.quickTo(cursorFollower, 'y', { duration: 0.25, ease: 'power3.out' });

  let isInitialized = false;

  window.addEventListener('mousemove', (e) => {
    const { clientX: x, clientY: y } = e;

    if (!isInitialized) {
      gsap.set([cursorDot, cursorFollower], { x, y, opacity: 1 });
      isInitialized = true;
    } else {
      xDotTo(x);
      yDotTo(y);
      xFollowerTo(x);
      yFollowerTo(y);
    }
  });

  // Mouse leave/enter window visibility
  document.addEventListener('mouseleave', () => {
    gsap.to([cursorDot, cursorFollower], { opacity: 0, duration: 0.3 });
  });

  document.addEventListener('mouseenter', () => {
    gsap.to([cursorDot, cursorFollower], { opacity: 1, duration: 0.3 });
  });

  // Click feedback (scale down on press)
  window.addEventListener('mousedown', () => {
    gsap.to(cursorFollower, { scale: 0.85, duration: 0.15 });
  });

  window.addEventListener('mouseup', () => {
    gsap.to(cursorFollower, { scale: 1.0, duration: 0.2 });
  });

  // 1. Text-based Cursor Hovers (e.g. Project Rows with data-cursor-text="VIEW")
  const textHoverElements = document.querySelectorAll('[data-cursor-text]');
  textHoverElements.forEach((el) => {
    const text = el.getAttribute('data-cursor-text') || 'VIEW';

    el.addEventListener('mouseenter', () => {
      cursorText.textContent = text;
      cursorFollower.classList.add('is-hovering');
      cursorDot.classList.add('is-hovering');
    });

    el.addEventListener('mouseleave', () => {
      cursorFollower.classList.remove('is-hovering');
      cursorDot.classList.remove('is-hovering');
      cursorText.textContent = '';
    });
  });

  // 2. Generic Link / Button Hovers
  const linkElements = document.querySelectorAll('a, button, .feature-card');
  linkElements.forEach((el) => {
    if (el.hasAttribute('data-cursor-text')) return; // Skip if handled by text hover

    el.addEventListener('mouseenter', () => {
      cursorFollower.classList.add('is-link-hover');
    });

    el.addEventListener('mouseleave', () => {
      cursorFollower.classList.remove('is-link-hover');
    });
  });
}

// Initialize custom cursor
initCustomCursor();

console.log("Section 4 Initialized: Custom Cursor System ready.");

/* ==========================================================================
   SECTION 5: Project List with Hover-Preview Image Follower
   ========================================================================== */

function initProjectHoverPreviews() {
  const previewContainer = document.getElementById('project-hover-preview');
  const previewImg = document.getElementById('project-preview-img');
  const projectItems = document.querySelectorAll('.project-item[data-img]');

  if (!previewContainer || !previewImg || !projectItems.length) return;

  // Position quickTo setters for 60fps tracking
  const xTo = gsap.quickTo(previewContainer, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(previewContainer, 'y', { duration: 0.35, ease: 'power3.out' });
  const rotateTo = gsap.quickTo(previewContainer, 'rotation', { duration: 0.35, ease: 'power2.out' });

  let lastX = 0;
  let isMoving = false;

  projectItems.forEach((item) => {
    const imgSrc = item.getAttribute('data-img');

    item.addEventListener('mouseenter', (e) => {
      previewImg.src = imgSrc;
      lastX = e.clientX;

      gsap.to(previewContainer, {
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });

    item.addEventListener('mousemove', (e) => {
      const { clientX: x, clientY: y } = e;
      xTo(x);
      yTo(y);

      // Dynamic tilt velocity calculation
      const deltaX = x - lastX;
      lastX = x;
      const tilt = Math.max(-12, Math.min(12, deltaX * 0.4));
      rotateTo(tilt);
    });

    item.addEventListener('mouseleave', () => {
      rotateTo(0);
      gsap.to(previewContainer, {
        opacity: 0,
        scale: 0.85,
        duration: 0.35,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
  });
}

// Initialize project hover previews
initProjectHoverPreviews();

console.log("Section 5 Initialized: Project List Hover Preview Images ready.");

/* ==========================================================================
   SECTION 6: Magnetic Buttons & Links System
   ========================================================================== */

function initMagneticElements() {
  const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isTouch) return;

  const magneticElements = document.querySelectorAll('.magnetic, [data-magnetic]');

  magneticElements.forEach((el) => {
    const innerElements = el.querySelectorAll('.btn-text, .btn-icon, span');

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Base magnetic displacement on parent
      gsap.to(el, {
        x: deltaX * 0.35,
        y: deltaY * 0.35,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      // Extra layered depth on inner text/icons
      if (innerElements.length) {
        gsap.to(innerElements, {
          x: deltaX * 0.2,
          y: deltaY * 0.2,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    });

    el.addEventListener('mouseleave', () => {
      // Elastic spring back to center
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: 'elastic.out(1.1, 0.4)',
        overwrite: 'auto',
      });

      if (innerElements.length) {
        gsap.to(innerElements, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: 'elastic.out(1.1, 0.4)',
          overwrite: 'auto',
        });
      }
    });
  });
}

// Initialize magnetic elements
initMagneticElements();
window.initMagneticElements = initMagneticElements;

console.log("Section 6 Initialized: Magnetic Elements & Buttons ready.");

/* ==========================================================================
   SECTION 7: Page Transitions (Curtain Wipe Engine)
   ========================================================================== */

function triggerPageTransition(targetUrl, onTransitionMidpoint) {
  return new Promise((resolve) => {
    const columns = document.querySelectorAll('.transition-column');
    const overlay = document.getElementById('page-transition');

    if (!columns.length || !overlay) {
      if (typeof onTransitionMidpoint === 'function') onTransitionMidpoint();
      if (targetUrl) {
        if (targetUrl.startsWith('#')) {
          const target = document.querySelector(targetUrl);
          if (target && typeof lenis !== 'undefined') lenis.scrollTo(target, { offset: -60 });
        } else {
          window.location.href = targetUrl;
        }
      }
      return resolve();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        resolve();
      }
    });

    // 1. Columns wipe in from top down
    tl.set(columns, { transformOrigin: 'top', scaleY: 0 })
      .to(columns, {
        scaleY: 1,
        duration: 0.45,
        ease: 'power4.inOut',
        stagger: 0.05,
      })
      // 2. Midpoint action: navigation or smooth scroll
      .add(() => {
        if (typeof onTransitionMidpoint === 'function') {
          onTransitionMidpoint();
        }
        if (targetUrl) {
          if (targetUrl.startsWith('#')) {
            const target = document.querySelector(targetUrl);
            if (target && typeof lenis !== 'undefined') {
              lenis.scrollTo(target, { offset: -60, immediate: true });
            }
          } else {
            window.location.href = targetUrl;
          }
        }
      })
      // Brief aesthetic pause
      .to({}, { duration: 0.1 })
      // 3. Columns wipe out down to bottom
      .set(columns, { transformOrigin: 'bottom' })
      .to(columns, {
        scaleY: 0,
        duration: 0.45,
        ease: 'power4.inOut',
        stagger: 0.05,
      });
  });
}

function initPageTransitions() {
  const transitionTriggers = document.querySelectorAll('[data-page-transition]');

  transitionTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      const targetUrl = trigger.getAttribute('href');
      if (targetUrl) {
        e.preventDefault();
        triggerPageTransition(targetUrl);
      }
    });
  });
}

// Initialize page transitions
initPageTransitions();
window.triggerPageTransition = triggerPageTransition;
window.initPageTransitions = initPageTransitions;

console.log("Section 7 Initialized: Page Transitions active.");

/* ==========================================================================
   SECTION 8: Grain / Noise Overlay
   ========================================================================== */

function initGrainOverlay() {
  const grainOverlay = document.getElementById('grain-overlay');
  if (!grainOverlay) return;

  // Verify rendering and adjust if reduced motion preference is requested
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    grainOverlay.style.animation = 'none';
  }
}

// Initialize grain overlay
initGrainOverlay();
window.initGrainOverlay = initGrainOverlay;

console.log("Section 8 Initialized: Grain/Noise Overlay active.");

