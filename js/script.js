// Custom Cursor
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');

let posX = 0, posY = 0;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
});

function loop() {
  posX += (mouseX - posX) / 6;
  posY += (mouseY - posY) / 6;
  follower.style.transform = `translate(${posX}px, ${posY}px)`;
  requestAnimationFrame(loop);
}
loop();

// Hover effect for cursor
const links = document.querySelectorAll('a, button, .magnetic-btn');
links.forEach(link => {
  link.addEventListener('mouseenter', () => follower.classList.add('hover'));
  link.addEventListener('mouseleave', () => follower.classList.remove('hover'));
});

// Canvas Particle Network Background
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray;

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

  // Loading Screen
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 2200);
  }

  // Split hero title text for staggered animation
  const heroTitle = document.querySelector('.hero-title');
  if(heroTitle) {
    const text = heroTitle.textContent;
    heroTitle.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      heroTitle.appendChild(span);
    });
  }

  // Hero Animation
  gsap.from(".hero-subtitle", { y: 20, opacity: 0, duration: 1, delay: 2.3, ease: "power3.out" });
  gsap.from(".hero-title span", {
    y: 100, opacity: 0, duration: 1.2,
    stagger: 0.15, delay: 2.5, ease: "power4.out"
  });
  gsap.from(".hero-desc", { y: 20, opacity: 0, duration: 1, delay: 3, ease: "power3.out" });
  gsap.from(".profile-frame", { x: 80, opacity: 0, duration: 1.2, delay: 2.8, ease: "power3.out" });
  gsap.from(".scroll-indicator", { opacity: 0, duration: 1, delay: 3.5 });

  // Scroll Indicator Line Animation
  gsap.to(".scroll-indicator .line", {
    scaleX: 2, duration: 1.5,
    repeat: -1, yoyo: true, ease: "sine.inOut"
  });

  // Reveal Elements on Scroll
  const revealElements = document.querySelectorAll(".gs-reveal");
  revealElements.forEach((el) => {
    gsap.fromTo(el,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });

  // Animated Counter for Stats
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach(num => {
    const target = parseInt(num.getAttribute('data-target'));
    ScrollTrigger.create({
      trigger: num,
      start: "top 85%",
      onEnter: () => {
        let current = 0;
        const increment = target / 40;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            num.textContent = target;
            clearInterval(timer);
          } else {
            num.textContent = Math.floor(current);
          }
        }, 40);
      },
      once: true
    });
  });

  // Goal progress bar animation
  const goalBars = document.querySelectorAll('.goal-bar');
  goalBars.forEach(bar => {
    const progress = bar.style.getPropertyValue('--progress');
    bar.style.width = '0%';
    ScrollTrigger.create({
      trigger: bar,
      start: "top 90%",
      onEnter: () => {
        setTimeout(() => { bar.style.width = progress; }, 200);
      },
      once: true
    });
  });

  // Magnetic Buttons
  const magneticBtns = document.querySelectorAll('.magnetic-btn');
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
      const position = btn.getBoundingClientRect();
      const x = e.pageX - position.left - position.width / 2;
      const y = e.pageY - position.top - position.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power3.out" });
    });
    btn.addEventListener('mouseleave', function() {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    });
  });

  // Back to Top Button
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Mobile Menu Logic
  const menuBtn = document.querySelector('.menu-btn');
  const navLinksContainer = document.querySelector('.nav-links');

  if (menuBtn && navLinksContainer) {
    menuBtn.addEventListener('click', () => {
      navLinksContainer.classList.toggle('active');
      const icon = menuBtn.querySelector('i');
      if (navLinksContainer.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });

    const navItems = navLinksContainer.querySelectorAll('a');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navLinksContainer.classList.remove('active');
        const icon = menuBtn.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      });
    });
  }

  // Vanilla Tilt 3D Animations
  if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll(".tech-card"), {
      max: 15,
      speed: 400,
      glare: true,
      "max-glare": 0.2,
      scale: 1.05
    });

    VanillaTilt.init(document.querySelectorAll(".profile-frame"), {
      max: 8,
      speed: 400,
      glare: true,
      "max-glare": 0.3,
      scale: 1.02
    });
    
    VanillaTilt.init(document.querySelectorAll(".project-row"), {
      max: 3,
      speed: 400,
      glare: true,
      "max-glare": 0.05,
      axis: "x"
    });
    
    VanillaTilt.init(document.querySelectorAll(".info-block.standout"), {
      max: 5,
      speed: 400,
      glare: true,
      "max-glare": 0.1,
      scale: 1.02
    });
  }

  // Typed.js for Hero Description
  if (typeof Typed !== 'undefined') {
    const heroDescElement = document.querySelector('.hero-desc');
    if (heroDescElement) {
      const originalText = heroDescElement.textContent;
      heroDescElement.innerHTML = '<span id="typed-hero-desc"></span>';
      new Typed('#typed-hero-desc', {
        strings: [
          originalText, 
          "Building secure architectures.", 
          "Transforming ideas into digital reality.",
          "Engineering the future."
        ],
        typeSpeed: 40,
        backSpeed: 20,
        backDelay: 2000,
        loop: true,
        showCursor: true,
        cursorChar: '_'
      });
    }
  }

  // Spotlight Effect on Cards
  const spotlightCards = document.querySelectorAll('.tech-card, .project-row, .info-block');
  spotlightCards.forEach(card => {
    card.classList.add('spotlight-card');
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  });


  // Cursor Click Ripple Effect
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-click';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    ripple.style.width = '40px';
    ripple.style.height = '40px';
    document.body.appendChild(ripple);
    
    // Remove after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 500);
  });

  // Scroll Progress Bar
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight * 100}%`;
      scrollProgress.style.width = scroll;
    });
  }



});
