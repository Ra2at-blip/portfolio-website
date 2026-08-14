const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  /* ---------- MOUSE-REACTIVE CIRCUIT BACKGROUND ---------- */
  (function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SIGNAL = '87,214,196';   // --signal
    const COPPER = '232,163,61';   // --copper

    let width, height, dpr;
    let nodes = [];
    let mouse = { x: -9999, y: -9999, active: false };
    let rafId = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      const density = 18000; // px^2 per node
      const count = Math.min(90, Math.max(28, Math.floor((width * height) / density)));
      nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.8
      }));
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      // soft glow following the cursor
      if (mouse.active) {
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
        glow.addColorStop(0, `rgba(${SIGNAL},0.10)`);
        glow.addColorStop(1, `rgba(${SIGNAL},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(mouse.x - 260, mouse.y - 260, 520, 520);
      }

      const linkDist = 130;
      const mouseDist = 180;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // gentle drift
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));

        // gentle repulsion from cursor
        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseDist && dist > 0.01) {
            const force = (1 - dist / mouseDist) * 0.6;
            n.x += (dx / dist) * force;
            n.y += (dy / dist) * force;
          }
        }

        // links between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const o = nodes[j];
          const dx = n.x - o.x;
          const dy = n.y - o.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(${SIGNAL},${(1 - dist / linkDist) * 0.16})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }

        // link to cursor when close, highlighted in copper
        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseDist) {
            ctx.strokeStyle = `rgba(${COPPER},${(1 - dist / mouseDist) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${SIGNAL},0.55)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mouse.active) {
        ctx.fillStyle = `rgba(${COPPER},0.85)`;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    function drawStatic() {
      // single static frame for reduced-motion users — no animation loop
      ctx.clearRect(0, 0, width, height);
      const linkDist = 130;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const o = nodes[j];
          const dist = Math.hypot(n.x - o.x, n.y - o.y);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(${SIGNAL},${(1 - dist / linkDist) * 0.12})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${SIGNAL},0.45)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => { mouse.active = false; });

    window.addEventListener('resize', () => {
      resize();
      if (prefersReducedMotion) drawStatic();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!prefersReducedMotion && !rafId) {
        rafId = requestAnimationFrame(step);
      }
    });

    resize();
    if (prefersReducedMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(step);
    }
  })();