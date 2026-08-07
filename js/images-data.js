/* ==========================================================================
   YEZZI JIGSAW PUZZLE GAME - 10 CAMPAIGN IMAGES & FALLBACK GENERATORS
   ========================================================================== */

const CAMPAIGN_IMAGES = [
  {
    id: 'cyberpunk_city',
    title: 'Cyberpunk Neon Skyline',
    category: 'Futuristic',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'cyberpunk'
  },
  {
    id: 'aurora_lake',
    title: 'Emerald Aurora & Mountain Lake',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'aurora'
  },
  {
    id: 'enchanted_forest',
    title: 'Enchanted Crystal Forest',
    category: 'Fantasy',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'forest'
  },
  {
    id: 'cosmic_nebula',
    title: 'Cosmic Nebula & Galaxies',
    category: 'Space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'space'
  },
  {
    id: 'zen_garden',
    title: 'Japanese Zen Garden',
    category: 'Tranquil',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'zen'
  },
  {
    id: 'coral_reef',
    title: 'Underwater Coral Paradise',
    category: 'Ocean',
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'ocean'
  },
  {
    id: 'desert_dunes',
    title: 'Golden Hour Desert Dunes',
    category: 'Landscape',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'desert'
  },
  {
    id: 'island_waterfall',
    title: 'Tropical Island Waterfall',
    category: 'Tropical',
    url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'waterfall'
  },
  {
    id: 'abstract_splash',
    title: 'Vibrant Acrylic Splash',
    category: 'Artistic',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'abstract'
  },
  {
    id: 'steampunk_citadel',
    title: 'Clockwork Steampunk Citadel',
    category: 'Steampunk',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&h=675&q=80',
    fallbackStyle: 'steampunk'
  }
];

// Helper to create offline fallback procedural artwork canvas if remote image fails
function generateFallbackCanvas(style, width = 1200, height = 675) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  switch (style) {
    case 'cyberpunk': {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0d0221');
      grad.addColorStop(0.5, '#0f0c29');
      grad.addColorStop(1, '#24243e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Neon buildings
      for (let i = 0; i < 25; i++) {
        const bw = 40 + Math.random() * 80;
        const bh = 150 + Math.random() * 450;
        const bx = i * 48;
        const by = height - bh;
        ctx.fillStyle = `hsl(${260 + Math.random() * 80}, 80%, ${15 + Math.random() * 20}%)`;
        ctx.fillRect(bx, by, bw, bh);

        // Windows
        ctx.fillStyle = Math.random() > 0.4 ? '#00f5d4' : '#ff007f';
        for (let wy = by + 20; wy < height - 20; wy += 25) {
          for (let wx = bx + 8; wx < bx + bw - 10; wx += 15) {
            if (Math.random() > 0.3) ctx.fillRect(wx, wy, 8, 12);
          }
        }
      }
      break;
    }

    case 'aurora': {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#020d18');
      grad.addColorStop(0.6, '#082032');
      grad.addColorStop(1, '#00101d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Aurora waves
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.moveTo(0, 150 + w * 40);
        for (let x = 0; x <= width; x += 30) {
          const y = 180 + w * 40 + Math.sin(x * 0.01 + w) * 60 + Math.cos(x * 0.005) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const aurGrad = ctx.createLinearGradient(0, 100, 0, 400);
        aurGrad.addColorStop(0, w === 0 ? 'rgba(0, 245, 212, 0.6)' : 'rgba(123, 44, 191, 0.4)');
        aurGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = aurGrad;
        ctx.fill();
      }
      break;
    }

    default: {
      // Artistic abstract gradient fallback
      const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.2);
      grad.addColorStop(0, '#ffb703');
      grad.addColorStop(0.4, '#7b2cbf');
      grad.addColorStop(0.8, '#00f5d4');
      grad.addColorStop(1, '#090b10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Geometric patterns
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 20 + Math.random() * 120, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${Math.random() * 360}, 80%, 60%, 0.15)`;
        ctx.fill();
      }
      break;
    }
  }

  return canvas.toDataURL('image/png');
}
