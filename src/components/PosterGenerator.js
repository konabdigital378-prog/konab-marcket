import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Image as ImageIcon, CheckCircle, Loader } from 'lucide-react';
import { toast } from './Toast';

const SIZES = [
  { label: 'Carré 1:1', w: 1080, h: 1080 },
  { label: 'Story 9:16', w: 1080, h: 1350 },
  { label: 'Bannière 16:9', w: 1200, h: 675 },
];

const VERT = '#39D353';
const VERT_DARK = '#0E7A32';
const OR = '#F5B700';
const NOIR = '#080808';

function flagStrip(w, y = 0) {
  const bw = Math.round(w / 3);
  return `<rect x="0" y="${y}" width="${bw}" height="6" fill="${VERT_DARK}"/><rect x="${bw}" y="${y}" width="${bw}" height="6" fill="${OR}"/><rect x="${bw*2}" y="${y}" width="${bw}" height="6" fill="${VERT}"/>`;
}

function posterToSVG(annonce, w, h) {
  const title = annonce?.titre || 'Annonce';
  const price = annonce?.prix != null
    ? (annonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(annonce.prix)} FCFA`)
    : '';
  const ville = annonce?.ville || '';
  const type = annonce?.type || '';
  const whatsapp = annonce?.whatsapp || '';
  const typeLabel = { offre: 'OFFRE', emploi: 'EMPLOI', formation: 'FORMATION', article: 'ARTICLE', recherche: 'RECHERCHE' }[type] || '';

  const imageUrl = annonce?.affiche_url || annonce?.images?.[0];
  const imageTag = imageUrl ? `<image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid cover"/>` : '';

  const titleEsc = title.toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const villeEsc = ville.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const waEsc = whatsapp.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const titleS = Math.round(Math.min(w * 0.065, 56));
  const priceS = Math.round(Math.min(w * 0.045, 40));
  const infoS = Math.round(Math.min(w * 0.028, 24));
  const brandS = Math.round(Math.min(w * 0.021, 18));

  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="ov" x1="0" y1="0.35" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="50%" stop-color="rgba(0,0,0,0.65)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.93)"/>
      </linearGradient>
      <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stop-color="rgba(57,211,83,0.15)"/>
        <stop offset="100%" stop-color="rgba(57,211,83,0)"/>
      </linearGradient>
    </defs>

    <rect width="${w}" height="${h}" fill="${NOIR}"/>
    ${imageTag}
    <rect width="${w}" height="${h}" fill="url(#ov)"/>

    <rect x="0" y="0" width="${w}" height="6" fill="url(#glow)"/>
    ${flagStrip(w)}

    <g transform="translate(${w * 0.04}, ${h * 0.03})">
      <image href="/logokb.png" width="${Math.round(w * 0.08)}" height="${Math.round(w * 0.08)}" preserveAspectRatio="xMidYMid meet"/>
      <text x="${Math.round(w * 0.1)}" y="${Math.round(w * 0.045)}" font-family="sans-serif" font-weight="900" font-size="${Math.round(Math.min(w * 0.035, 30))}" fill="white">KONAB</text>
      <text x="${Math.round(w * 0.1)}" y="${Math.round(w * 0.068)}" font-family="sans-serif" font-weight="600" font-size="${Math.round(Math.min(w * 0.02, 16))}" fill="${VERT}">MARCKET</text>
    </g>

    ${typeLabel ? `<rect x="${w/2 - 80}" y="${h * 0.13}" width="160" height="${Math.round(h * 0.04)}" rx="${Math.round(h * 0.02)}" fill="rgba(57,211,83,0.15)" stroke="${VERT}" stroke-width="1"/>
      <text x="${w/2}" y="${h * 0.13 + Math.round(h * 0.026)}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${infoS}" fill="${VERT}">${typeLabel}</text>` : ''}

    <text x="${w/2}" y="${h * 0.82}" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="${titleS}" fill="white">
      <tspan x="${w/2}" dy="0">${titleEsc.split(' ').slice(0, 3).join(' ')}</tspan>
      ${titleEsc.split(' ').length > 3 ? `<tspan x="${w/2}" dy="${titleS + 4}">${titleEsc.split(' ').slice(3, 6).join(' ')}</tspan>` : ''}
    </text>

    ${price ? `<text x="${w/2}" y="${h * 0.74}" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="${priceS}" fill="${OR}">💰 ${price}</text>` : ''}

    ${villeEsc ? `<text x="${w/2}" y="${h * 0.89}" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="${infoS}" fill="rgba(255,255,255,0.6)">📍 ${villeEsc}</text>` : ''}
    ${waEsc ? `<text x="${w/2}" y="${h * 0.925}" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="${infoS}" fill="rgba(255,255,255,0.6)">📱 ${waEsc}</text>` : ''}

    <rect x="${w * 0.04}" y="${h * 0.948}" width="${w * 0.92}" height="1" fill="rgba(57,211,83,0.2)"/>
    ${flagStrip(w, h * 0.948 + 6)}
    <image href="/logokb.png" width="${Math.round(w * 0.04)}" height="${Math.round(w * 0.04)}" x="${w * 0.06}" y="${h * 0.958}"/>
    <text x="${Math.round(w * 0.12)}" y="${h * 0.975}" font-family="sans-serif" font-weight="700" font-size="${brandS}" fill="rgba(57,211,83,0.8)">Konab Marcket</text>
    <text x="${Math.round(w * 0.12)}" y="${h * 0.991}" font-family="sans-serif" font-weight="400" font-size="${Math.round(brandS * 0.7)}" fill="rgba(57,211,83,0.4)">Achetez mieux · Vendez plus</text>
  </svg>`], { type: 'image/svg+xml' });
}

export default function PosterGenerator({ annonce, onClose }) {
  const canvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [posterBlob, setPosterBlob] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const size = SIZES[sizeIdx];

  function drawFlagStrip(ctx, w, y) {
    const bw = Math.round(w / 3);
    ctx.fillStyle = VERT_DARK;
    ctx.fillRect(0, y, bw, 6);
    ctx.fillStyle = OR;
    ctx.fillRect(bw, y, bw, 6);
    ctx.fillStyle = VERT;
    ctx.fillRect(bw * 2, y, bw, 6);
  }

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setErrorMsg('');
    try {
      const ctx = canvas.getContext('2d');
      const { w, h } = size;
      canvas.width = w;
      canvas.height = h;

      let loadedOk = false;
      const imageUrl = annonce?.affiche_url || annonce?.images?.[0];
      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => { loadedOk = true; resolve(); };
          img.onerror = resolve;
          img.src = imageUrl;
        });
        if (loadedOk) {
          const imgScale = Math.max(w / img.width, h / img.height);
          ctx.drawImage(img, (w - img.width * imgScale) / 2, (h - img.height * imgScale) / 2, img.width * imgScale, img.height * imgScale);
        }
      }

      const grad = ctx.createLinearGradient(0, h * 0.35, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.65)');
      grad.addColorStop(1, 'rgba(0,0,0,0.93)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const title = annonce?.titre || 'Annonce';
      const price = annonce?.prix != null
        ? (annonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(annonce.prix)} FCFA`)
        : '';
      const ville = annonce?.ville || '';
      const type = annonce?.type || '';
      const whatsapp = annonce?.whatsapp || '';

      const titleS = Math.min(w * 0.065, 56);
      const priceS = Math.min(w * 0.045, 40);
      const infoS = Math.min(w * 0.028, 24);
      const brandS = Math.min(w * 0.021, 18);

      const padX = w * 0.06;
      const textW = w - padX * 2;

      // Top flag strip
      drawFlagStrip(ctx, w, 0);

      // Logo + brand top-left
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      await new Promise(r => { logo.onload = r; logo.onerror = r; logo.src = '/logokb.png'; });
      const logoW = w * 0.08;
      const logoX = w * 0.04;
      const logoY = h * 0.025;
      ctx.drawImage(logo, logoX, logoY, logoW, logoW);
      ctx.fillStyle = '#FFF';
      ctx.font = `900 ${Math.min(w * 0.035, 30)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('KONAB', logoX + logoW + w * 0.015, logoY + logoW * 0.38);
      ctx.fillStyle = VERT;
      ctx.font = `600 ${Math.min(w * 0.02, 16)}px sans-serif`;
      ctx.fillText('MARCKET', logoX + logoW + w * 0.015, logoY + logoW * 0.62);

      // Type badge
      if (type) {
        const typeLabels = { offre: 'OFFRE', emploi: 'EMPLOI', formation: 'FORMATION', article: 'ARTICLE', recherche: 'RECHERCHE' };
        const lbl = typeLabels[type] || type.toUpperCase();
        const badgeW = 140;
        const badgeH = h * 0.04;
        const badgeX = w / 2 - 70;
        const badgeY = h * 0.13;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fillStyle = 'rgba(57,211,83,0.15)';
        ctx.fill();
        ctx.strokeStyle = VERT;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = VERT;
        ctx.font = `700 ${infoS}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, w / 2, badgeY + badgeH / 2);
      }

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 ${titleS}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 20;
      const titleLines = wrapText(ctx, title.toUpperCase(), textW);
      const titleBlockH = titleLines.length * (titleS + 6);
      let titleY = h * 0.82 - titleBlockH / 2;
      for (const line of titleLines) {
        ctx.fillText(line, w / 2, titleY);
        titleY += titleS + 6;
      }
      ctx.shadowBlur = 0;

      // Price
      if (price) {
        ctx.fillStyle = OR;
        ctx.font = `900 ${priceS}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 16;
        ctx.fillText('💰 ' + price, w / 2, h * 0.74);
        ctx.shadowBlur = 0;
      }

      // Ville
      if (ville) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `400 ${infoS}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📍 ' + ville, w / 2, h * 0.89);
      }

      // WhatsApp
      if (whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `400 ${infoS}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📱 ' + whatsapp, w / 2, h * 0.925);
      }

      // Bottom flag strip
      drawFlagStrip(ctx, w, h * 0.948);

      // Divider
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(57,211,83,0.2)';
      ctx.lineWidth = 1;
      ctx.moveTo(w * 0.04, h * 0.958);
      ctx.lineTo(w * 0.96, h * 0.958);
      ctx.stroke();

      // Bottom brand
      const bLogoW = w * 0.04;
      ctx.drawImage(logo, w * 0.06, h * 0.964, bLogoW, bLogoW);
      ctx.fillStyle = 'rgba(57,211,83,0.8)';
      ctx.font = `700 ${brandS}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Konab Marcket', w * 0.115, h * 0.966);
      ctx.fillStyle = 'rgba(57,211,83,0.4)';
      ctx.font = `400 ${Math.round(brandS * 0.7)}px sans-serif`;
      ctx.fillText('Achetez mieux · Vendez plus', w * 0.115, h * 0.978 + brandS * 0.7);

      let blob = await new Promise(resolve => {
        try { canvas.toBlob(b => resolve(b), 'image/png'); }
        catch (_) { resolve(null); }
      });
      if (!blob) {
        blob = posterToSVG(annonce, w, h);
      }
      if (blob) {
        setPosterBlob(blob);
        setPosterUrl(URL.createObjectURL(blob));
      } else {
        setErrorMsg('Impossible de générer l\'image');
      }
      setImgLoaded(true);
    } catch (e) {
      setErrorMsg('Erreur de génération: ' + (e.message || e));
      setImgLoaded(true);
    }
  }, [annonce, size]);

  useEffect(() => {
    setImgLoaded(false);
    setPosterBlob(null);
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    draw();
  }, [draw]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    if (!posterBlob) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `konab-marcket-${annonce?.titre?.slice(0, 30).replace(/\s+/g, '_') || 'affiche'}.png`;
    a.click();
    toast('Affiche téléchargée ✓', 'success');
  }

  async function handleShare() {
    if (!posterBlob) return;
    setSharing(true);
    try {
      const file = new File([posterBlob], 'affiche-konab.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: annonce?.titre || 'Konab Marcket',
          text: `Découvrez "${annonce?.titre}" sur Konab Marcket !`,
          files: [file],
        });
      } else {
        const text = `Découvrez "${annonce?.titre}" sur Konab Marcket !\n${window.location.origin}/annonce/${annonce?.id}\n\nGénéré par Konab Marcket 🇧🇫`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank', 'width=600,height=600');
      }
      toast('Affiche partagée ✓', 'success');
    } catch (e) {
      if (e.name !== 'AbortError') toast('Erreur partage', 'error');
    }
    setSharing(false);
  }

  return (
    <motion.div className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
      style={{ zIndex: 700 }}
    >
      <motion.div className="modal" style={{ maxWidth: 500 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3><ImageIcon size={18} style={{ display: 'inline', marginRight: 8 }} /> Créer l'affiche</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 400 }}>
              Téléchargez ou partagez sur les réseaux sociaux
            </p>
          </div>
          <motion.button className="modal-close" onClick={onClose}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>×</motion.button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {SIZES.map((s, i) => (
              <motion.button key={s.label}
                className={`btn btn-sm ${i === sizeIdx ? 'btn-primary' : 'btn-ghost'}`}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSizeIdx(i)}>
                {s.label}
              </motion.button>
            ))}
          </div>

          <div style={{
            background: '#000',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 16,
            minHeight: 200,
            position: 'relative',
          }}>
            {!imgLoaded && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: 'var(--text3)' }}>
                <Loader size={20} className="spin" /> Génération...
              </div>
            )}
            {errorMsg && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>⚠️ {errorMsg}</div>
              </div>
            )}
            <canvas ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: 420,
                objectFit: 'contain',
                display: imgLoaded && !errorMsg ? 'block' : 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)', fontSize: 14, padding: '12px' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleDownload} disabled={!imgLoaded}>
              <Download size={18} /> Télécharger
            </motion.button>
            <motion.button className="btn btn-lg"
              style={{
                flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)', fontSize: 14, padding: '12px',
                background: 'linear-gradient(135deg, rgba(57,211,83,0.12), rgba(57,211,83,0.05))',
                color: 'var(--vert)', border: '1px solid rgba(57,211,83,0.2)',
              }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleShare} disabled={!imgLoaded || sharing}>
              <Share2 size={18} /> {sharing ? 'Partage...' : 'Partager'}
            </motion.button>
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(57,211,83,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(57,211,83,0.1)', fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} style={{ color: 'var(--vert)', flexShrink: 0 }} />
            L'affiche inclura automatiquement le titre, le prix, la localisation, votre WhatsApp et notre marque.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}