# Replicating lukebaffait.fr Effects — Implementation Guide

This is a breakdown of the animation/effect system used on the reference site, mapped to the libraries and techniques you'd use to rebuild each one from scratch. Content, copy, and imagery are NOT part of this — only structure/motion.

---

## 1. Core Stack You Need

```
npm install gsap lenis
# optional if you want the 3D/shader layer:
npm install three
```

| Library | Role |
|---|---|
| **GSAP + ScrollTrigger** | All timeline animations, scroll-linked reveals |
| **SplitText (GSAP plugin, requires Club GSAP or free alt like `SplitType`)** | Character/word/line splitting for text reveals |
| **Lenis** | Smooth inertia scrolling, syncs with GSAP ticker |
| **Barba.js** (or a custom fetch+swap router if using Next.js) | Page transitions without full reload |
| **Three.js** (optional) | Grain/noise shader overlay, distortion hover on images |

If your portfolio is plain HTML/CSS/JS, use GSAP + Lenis + Barba.js directly. If it's React/Next.js, swap Barba.js for Next's route transitions + `AnimatePresence`-style logic, or use `next-transition-router`.

---

## 2. Smooth Scroll Foundation (Lenis + GSAP sync)

Every scroll-triggered animation on a site like this depends on Lenis driving the scroll, and GSAP's ticker driving Lenis — not the browser's native scroll.

```js
import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

This one block is why the whole site *feels* smooth — scroll momentum, no jank, everything synced.

---

## 3. Intro / Preloader Text Reveal ("L / uke Baffait .")

Pattern: name splits into two blocks, animates in with a stagger, likely masked (overflow hidden on a wrapper) so letters slide up from below rather than fade.

```js
import SplitType from 'split-type';

const split = new SplitType('.hero-name', { types: 'chars' });

gsap.from(split.chars, {
  yPercent: 120,
  stagger: 0.03,
  duration: 1,
  ease: 'power4.out',
  delay: 0.3,
});
```

Wrap each line in a `div` with `overflow: hidden` in your markup so the translateY reveal is masked, not just floating text.

---

## 4. Scroll-Triggered Text Reveals (body copy, section intros)

Same masked-line technique, but triggered by scroll position instead of load.

```js
document.querySelectorAll('.reveal-text').forEach((el) => {
  const split = new SplitType(el, { types: 'lines' });
  gsap.from(split.lines, {
    yPercent: 100,
    opacity: 0,
    stagger: 0.08,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
    },
  });
});
```

---

## 5. Project List / Stacked Gallery (CyberDiag, Anima, Zenith, etc.)

This is a list of project names, each linked to a hover-preview image that swaps/appears as you move between rows. Two common implementations:

**A. Fixed-position preview image + row hover:**
```js
const rows = document.querySelectorAll('.project-row');
const previewImg = document.querySelector('.project-preview img');

rows.forEach((row) => {
  row.addEventListener('mouseenter', () => {
    gsap.to(previewImg, { opacity: 0, duration: 0.2, onComplete: () => {
      previewImg.src = row.dataset.image;
      gsap.to(previewImg, { opacity: 1, duration: 0.3 });
    }});
  });
});
```

**B. Image follows cursor** (more common in this exact style):
```js
document.addEventListener('mousemove', (e) => {
  gsap.to('.project-preview', {
    x: e.clientX,
    y: e.clientY,
    duration: 0.6,
    ease: 'power3.out',
  });
});
```
Show/hide the preview with a scale+opacity tween on row hover/leave.

---

## 6. Custom Cursor

```js
const cursor = document.querySelector('.cursor');
window.addEventListener('mousemove', (e) => {
  gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.3, ease: 'power2.out' });
});

// on hoverable elements
document.querySelectorAll('a, button, .project-row').forEach((el) => {
  el.addEventListener('mouseenter', () => gsap.to(cursor, { scale: 2.5, duration: 0.3 }));
  el.addEventListener('mouseleave', () => gsap.to(cursor, { scale: 1, duration: 0.3 }));
});
```

Cursor element itself: `position: fixed; pointer-events: none; mix-blend-mode: difference;` is the usual trick for a cursor that inverts over dark/light content.

---

## 7. Page Transitions (Barba.js)

```js
import barba from '@barba/core';

barba.init({
  transitions: [{
    leave(data) {
      return gsap.to(data.current.container, { opacity: 0, duration: 0.5 });
    },
    enter(data) {
      return gsap.from(data.next.container, { opacity: 0, duration: 0.5 });
    },
  }],
});
```

For the more elaborate wipe/curtain effect (a panel that slides up covering the screen, route changes underneath, then slides away):
```js
transitions: [{
  leave() {
    return gsap.to('.transition-overlay', { yPercent: 0, duration: 0.6, ease: 'power4.inOut' });
  },
  enter() {
    return gsap.to('.transition-overlay', { yPercent: -100, duration: 0.6, ease: 'power4.inOut', delay: 0.1 });
  },
}]
```
`.transition-overlay` is a fixed full-screen div starting at `translateY(100%)`.

If you're on Next.js, Barba.js doesn't apply directly — use `next-transition-router` or a manual `AnimatePresence` (Framer Motion) approach instead, same easing/timing logic applies.

---

## 8. Scroll-Triggered Fade/Scale-Ins (generic section reveals)

```js
gsap.utils.toArray('.fade-section').forEach((section) => {
  gsap.from(section, {
    opacity: 0,
    y: 60,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: section, start: 'top 80%' },
  });
});
```

---

## 9. Magnetic Buttons/Links (subtle pull toward cursor)

```js
document.querySelectorAll('.magnetic').forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.3 });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
  });
});
```

---

## 10. Grain/Noise Overlay (the polish layer many awwwards sites use)

Cheapest version — no Three.js needed, pure CSS/SVG:
```html
<svg style="display:none">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
  </filter>
</svg>
```
```css
.grain-overlay {
  position: fixed; inset: 0; pointer-events: none; z-index: 999;
  filter: url(#grain); opacity: 0.05; mix-blend-mode: overlay;
}
```
Full Three.js shader version is overkill unless you're already using WebGL elsewhere (e.g. a 3D hero object).

---

## 11. Awards / Skills Marquee Rows

Simple infinite horizontal scroll — GSAP or pure CSS:
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-track {
  display: flex;
  animation: marquee 20s linear infinite;
  width: max-content;
}
```
(Duplicate the content once inside the track so the loop is seamless.)

---

## Build Order (recommended)

1. Lenis + GSAP ticker sync — do this first, everything else depends on it
2. Masked text reveal system (reusable for hero + all section headers)
3. Scroll-triggered fade-ins for generic sections
4. Custom cursor
5. Project list hover-preview
6. Magnetic buttons
7. Page transitions (Barba.js or router equivalent) — do this last, it touches your whole routing setup
8. Grain overlay — pure polish, add at the very end

When you bring this into Cursor/Antigravity/your IDE, this doc should be enough context to prompt section-by-section without needing me to touch your files directly. Ping me if you want any one of these sections built out further first (e.g. a full working Lenis+GSAP boilerplate file).
