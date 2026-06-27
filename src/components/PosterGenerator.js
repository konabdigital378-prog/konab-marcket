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

function flagStripSVG(w, y) {
  const bw = Math.round(w / 3);
  return `<rect x="0" y="${y}" width="${bw}" height="5" fill="${VERT_DARK}"/><rect x="${bw}" y="${y}" width="${bw}" height="5" fill="${OR}"/><rect x="${bw*2}" y="${y}" width="${bw}" height="5" fill="${VERT}"/>`;
}

function posterToSVG(annonce, w, h) {
  const title = annonce?.titre || 'Annonce';
  const price = annonce?.prix != null
    ? (annonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(annonce.prix)} FCFA`)
    : '';
  const ville = annonce?.ville || '';
  const type = annonce?.type || '';
  const secteur = annonce?.secteur || '';
  const whatsapp = annonce?.whatsapp || '';
  const typeLabel = { offre: 'OFFRE', emploi: 'EMPLOI', formation: 'FORMATION', article: 'ARTICLE', recherche: 'RECHERCHE' }[type] || '';

  const imageUrl = annonce?.affiche_url || annonce?.images?.[0];
  const imageTag = imageUrl ? `<image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid cover"/>` : '';

  const titleEsc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const villeEsc = ville.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const secteurEsc = secteur.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const waEsc = whatsapp.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const titleS = Math.min(w * 0.075, 64);
  const priceS = Math.min(w * 0.05, 42);
  const infoS = Math.min(w * 0.028, 24);
  const brandS = Math.min(w * 0.022, 20);
  const smallS = Math.min(w * 0.021, 18);

  const hasImage = !!imageUrl;
  const titleY = hasImage ? 0.82 : 0.62;
  const priceY = hasImage ? 0.73 : 0.53;
  const infoY = hasImage ? 0.89 : 0.72;

  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="ov" x1="0" y1="0.45" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="40%" stop-color="rgba(0,0,0,0.55)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.95)"/>
      </linearGradient>
      <linearGradient id="badge-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0E7A32"/>
        <stop offset="50%" stop-color="#39D353"/>
        <stop offset="100%" stop-color="#0E7A32"/>
      </linearGradient>
      <linearGradient id="bottom-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(57,211,83,0)"/>
        <stop offset="50%" stop-color="rgba(57,211,83,0.3)"/>
        <stop offset="100%" stop-color="rgba(57,211,83,0)"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="${NOIR}"/>
    ${imageTag}
    ${hasImage ? `<rect width="${w}" height="${h}" fill="url(#ov)"/>` : `<rect width="${w}" height="${h}" fill="rgba(0,0,0,0.92)"/>`}
    ${flagStripSVG(w, 0)}
    <g transform="translate(${w * 0.05}, ${h * 0.025})">
      <image href="/logokb.png" width="${Math.round(w * 0.08)}" height="${Math.round(w * 0.08)}" preserveAspectRatio="xMidYMid meet" filter="url(#shadow)"/>
      <text x="${Math.round(w * 0.1)}" y="${Math.round(w * 0.042)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="${Math.min(w * 0.035, 32)}" fill="white" letter-spacing="1">KONAB</text>
      <text x="${Math.round(w * 0.1)}" y="${Math.round(w * 0.066)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="500" font-size="${Math.min(w * 0.02, 16)}" fill="${VERT}" letter-spacing="3">MARCKET</text>
    </g>
    ${typeLabel ? `<rect x="${w/2 - 90}" y="${h * 0.11}" width="180" height="${Math.round(h * 0.035)}" rx="${Math.round(h * 0.018)}" fill="rgba(57,211,83,0.15)" stroke="${VERT}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="${w/2}" y="${h * 0.11 + Math.round(h * 0.023)}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${infoS}" fill="${VERT}" letter-spacing="2">${typeLabel}</text>` : ''}
    <text x="${w/2}" y="${h * titleY}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="${titleS}" fill="white" filter="url(#shadow)">
      ${titleEsc.length > 20 ? `<tspan x="${w/2}" dy="0">${titleEsc.slice(0, 20)}</tspan><tspan x="${w/2}" dy="${titleS + 6}">${titleEsc.slice(20, 42)}</tspan>` : `<tspan x="${w/2}" dy="0">${titleEsc}</tspan>`}
    </text>
    ${price ? `<text x="${w/2}" y="${h * priceY}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="${priceS}" fill="${OR}" filter="url(#shadow)">${price}</text>` : ''}
    <rect x="${w * 0.15}" y="${h * infoY}" width="${w * 0.7}" height="1" fill="url(#bottom-line)"/>
    ${villeEsc ? `<text x="${w/2}" y="${h * infoY + h * 0.035}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="${infoS}" fill="rgba(255,255,255,0.65)">${villeEsc}</text>` : ''}
    ${secteurEsc ? `<text x="${w/2}" y="${h * infoY + h * 0.065}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="${smallS}" fill="rgba(255,255,255,0.45)">${secteurEsc}</text>` : ''}
    ${waEsc ? `<text x="${w/2}" y="${h * infoY + h * 0.095}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="${smallS}" fill="rgba(57,211,83,0.7)">${waEsc}</text>` : ''}
    <rect x="0" y="${h - 40}" width="${w}" height="40" fill="rgba(8,8,8,0.85)"/>
    ${flagStripSVG(w, h - 40)}
    <g transform="translate(${w * 0.05}, ${h - 34})">
      <image href="/logokb.png" width="${Math.round(w * 0.035)}" height="${Math.round(w * 0.035)}" preserveAspectRatio="xMidYMid meet"/>
      <text x="${Math.round(w * 0.055)}" y="${Math.round(w * 0.025)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${brandS}" fill="rgba(57,211,83,0.8)">Konab Marcket</text>
      <text x="${Math.round(w * 0.055)}" y="${Math.round(w * 0.04)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="${Math.round(brandS * 0.65)}" fill="rgba(57,211,83,0.35)">Achetez mieux · Vendez plus</text>
    </g>
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
    ctx.fillRect(0, y, bw, 5);
    ctx.fillStyle = OR;
    ctx.fillRect(bw, y, bw, 5);
    ctx.fillStyle = VERT;
    ctx.fillRect(bw * 2, y, bw, 5);
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

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setErrorMsg('');
    try {
      const ctx = canvas.getContext('2d');
      const { w, h } = size;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(2, 2);

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
      }

      ctx.fillStyle = NOIR;
      ctx.fillRect(0, 0, w, h);

      if (loadedOk) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = imageUrl;
        });
        if (img.complete && img.naturalWidth) {
          const imgScale = Math.max(w / img.width, h / img.height);
          ctx.drawImage(img, (w - img.width * imgScale) / 2, (h - img.height * imgScale) / 2, img.width * imgScale, img.height * imgScale);
          const grad = ctx.createLinearGradient(0, h * 0.45, 0, h);
          grad.addColorStop(0, 'rgba(0,0,0,0.0)');
          grad.addColorStop(0.4, 'rgba(0,0,0,0.55)');
          grad.addColorStop(1, 'rgba(0,0,0,0.95)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      if (!loadedOk) {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
        grad.addColorStop(0, '#1a1a1a');
        grad.addColorStop(1, NOIR);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      const title = annonce?.titre || 'Annonce';
      const price = annonce?.prix != null
        ? (annonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(annonce.prix)} FCFA`)
        : '';
      const ville = annonce?.ville || '';
      const type = annonce?.type || '';
      const secteur = annonce?.secteur || '';
      const whatsapp = annonce?.whatsapp || '';

      const titleS = Math.min(w * 0.075, 64);
      const priceS = Math.min(w * 0.05, 42);
      const infoS = Math.min(w * 0.028, 24);
      const brandS = Math.min(w * 0.022, 20);
      const smallS = Math.min(w * 0.021, 18);

      const padX = w * 0.08;
      const textW = w - padX * 2;

      drawFlagStrip(ctx, w, 0);

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      await new Promise(r => { logo.onload = r; logo.onerror = r; logo.src = '/logokb.png'; });
      const logoW = w * 0.08;
      ctx.drawImage(logo, w * 0.05, h * 0.025, logoW, logoW);

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFF';
      ctx.font = `800 ${Math.min(w * 0.035, 32)}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('KONAB', w * 0.05 + logoW + w * 0.015, h * 0.025 + logoW * 0.38);
      ctx.fillStyle = VERT;
      ctx.font = `500 ${Math.min(w * 0.02, 16)}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText('MARCKET', w * 0.05 + logoW + w * 0.015, h * 0.025 + logoW * 0.62);
      ctx.shadowBlur = 0;

      if (type) {
        const typeLabels = { offre: 'OFFRE', emploi: 'EMPLOI', formation: 'FORMATION', article: 'ARTICLE', recherche: 'RECHERCHE' };
        const lbl = typeLabels[type] || type.toUpperCase();
        const badgeW = 180;
        const badgeH = h * 0.035;
        const badgeX = w / 2 - 90;
        const badgeY = h * 0.11;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fillStyle = 'rgba(57,211,83,0.12)';
        ctx.fill();
        ctx.strokeStyle = VERT;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = VERT;
        ctx.font = `600 ${infoS}px Inter, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, w / 2, badgeY + badgeH / 2);
      }

      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 ${titleS}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const titleLines = wrapText(ctx, title, textW);
      const titleBlockH = titleLines.length * (titleS + 8);
      let tY = h * 0.82 - titleBlockH / 2;
      for (const line of titleLines) {
        ctx.fillText(line, w / 2, tY);
        tY += titleS + 8;
      }
      ctx.shadowBlur = 0;

      if (price) {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = OR;
        ctx.font = `900 ${priceS}px Inter, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(price, w / 2, h * 0.73);
        ctx.shadowBlur = 0;
      }

      const infoY = h * 0.89;

      ctx.strokeStyle = 'rgba(57,211,83,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, infoY);
      ctx.lineTo(w * 0.85, infoY);
      ctx.stroke();

      if (ville) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = `400 ${infoS}px Inter, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ville, w / 2, infoY + h * 0.03);
      }

      if (secteur) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = `400 ${smallS}px Inter, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(secteur, w / 2, infoY + h * 0.058);
      }

      if (whatsapp) {
        ctx.fillStyle = 'rgba(57,211,83,0.7)';
        ctx.font = `400 ${smallS}px Inter, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(whatsapp, w / 2, infoY + h * 0.086);
      }

      ctx.fillStyle = 'rgba(8,8,8,0.85)';
      ctx.fillRect(0, h - 40, w, 40);
      drawFlagStrip(ctx, w, h - 40);

      const bLogoW = w * 0.035;
      ctx.drawImage(logo, w * 0.05, h - 34, bLogoW, bLogoW);
      ctx.fillStyle = 'rgba(57,211,83,0.8)';
      ctx.font = `600 ${brandS}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Konab Marcket', w * 0.05 + bLogoW + w * 0.01, h - 32);
      ctx.fillStyle = 'rgba(57,211,83,0.35)';
      ctx.font = `400 ${Math.round(brandS * 0.65)}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText('Achetez mieux · Vendez plus', w * 0.05 + bLogoW + w * 0.01, h - 32 + brandS * 0.7);

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
        const text = `Découvrez "${annonce?.titre}" sur Konab Marcket !\n${window.location.origin}/annonce/${annonce?.id}\n\nGénéré par Konab Marcket`;
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
      <motion.div className="modal" style={{ maxWidth: 520 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={16} color="white" />
              </div>
              Créer l'affiche
            </h3>
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
                onClick={() => setSizeIdx(i)}
                style={{ borderRadius: 100, fontSize: 12 }}>
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
            border: '1px solid rgba(255,255,255,0.06)',
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
            L'affiche inclut le titre, prix, localisation, secteur et contact. Design professionnel prêt à partager.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
