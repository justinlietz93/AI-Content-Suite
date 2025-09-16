import { useEffect } from 'react';

export const useStarfield = (canvasId: string) => {
  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const STAR_COLORS = ['oklch(0.98 0 0)', 'oklch(0.9 0.03 230)', 'oklch(0.95 0.04 90)']; // White, Light Blue, Pale Yellow
    const stars: { x: number; y: number; z: number; color: string }[] = [];
    const numStars = 500;
    const speed = 2;

    const nebulas = [
        { x: width * 0.2, y: height * 0.3, radius: width * 0.4, color1: 'rgba(100, 0, 180, 0.15)', color2: 'rgba(100, 0, 180, 0)', vx: 0.05, vy: 0.03 },
        { x: width * 0.8, y: height * 0.7, radius: width * 0.5, color1: 'rgba(0, 100, 200, 0.1)', color2: 'rgba(0, 100, 200, 0)', vx: -0.04, vy: 0.06 },
        { x: width * 0.5, y: height * 0.9, radius: width * 0.3, color1: 'rgba(50, 150, 180, 0.12)', color2: 'rgba(50, 150, 180, 0)', vx: 0.02, vy: -0.05 },
    ];

    const initStars = () => {
        stars.length = 0;
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width - width / 2,
                y: Math.random() * height - height / 2,
                z: Math.random() * width,
                color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            });
        }
    };
    initStars();

    let animationFrameId: number;

    const animate = () => {
        // Draw background
        ctx.fillStyle = 'oklch(0.10 0 0)';
        ctx.fillRect(0, 0, width, height);

        // Draw and move nebulas
        ctx.globalCompositeOperation = 'lighter';
        nebulas.forEach(nebula => {
            const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
            gradient.addColorStop(0, nebula.color1);
            gradient.addColorStop(1, nebula.color2);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            nebula.x += nebula.vx;
            nebula.y += nebula.vy;
            if (nebula.x - nebula.radius > width) nebula.x = -nebula.radius;
            if (nebula.x + nebula.radius < 0) nebula.x = width + nebula.radius;
            if (nebula.y - nebula.radius > height) nebula.y = -nebula.radius;
            if (nebula.y + nebula.radius < 0) nebula.y = height + nebula.radius;
        });
        ctx.globalCompositeOperation = 'source-over';


        ctx.save();
        ctx.translate(width / 2, height / 2);

        for (let i = 0; i < numStars; i++) {
            const star = stars[i];
            
            star.z -= speed;

            if (star.z <= 0) {
                star.x = Math.random() * width - width / 2;
                star.y = Math.random() * height - height / 2;
                star.z = width;
            }
            
            const k = 128.0 / star.z;
            const px = star.x * k;
            const py = star.y * k;

            const size = (1 - star.z / width) * 4;
            
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(px, py, size / 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.restore();
        animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initStars();
        // Reset nebula positions on resize
        nebulas[0].x = width * 0.2; nebulas[0].y = height * 0.3; nebulas[0].radius = width * 0.4;
        nebulas[1].x = width * 0.8; nebulas[1].y = height * 0.7; nebulas[1].radius = width * 0.5;
        nebulas[2].x = width * 0.5; nebulas[2].y = height * 0.9; nebulas[2].radius = width * 0.3;
    };
    
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, [canvasId]);
};
