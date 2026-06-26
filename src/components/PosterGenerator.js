import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Image as ImageIcon, CheckCircle, Loader } from 'lucide-react';
import { toast } from './Toast';

const SIZES = [
  { label: 'Carré 1:1', w: 1080, h: 1080 },
  { label: 'Story 9:16', w: 1080, h: 1350 },
  { label: 'Bannière 16:9', w: 1200, h: 675 },
];

export default function PosterGenerator({ annonce, onClose }) {
  const canvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [posterBlob, setPosterBlob] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const size = SIZES[sizeIdx];

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setErrorMsg('');
    try {
      const ctx = canvas.getContext('2d');
      const { w, h } = size;
      canvas.width = w;
      canvas.height = h;

      const bgColor = '#0A0A0A';

      const imageUrl = annonce?.affiche_url || annonce?.images?.[0];
      const img = new Image();

      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = imageUrl || '';
      });

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      if (imageUrl && img.width > 0) {
        const imgScale = Math.max(w / img.width, h / img.height);
        const imgW = img.width * imgScale;
        const imgH = img.height * imgScale;
        const imgX = (w - imgW) / 2;
        const imgY = (h - imgH) / 2;
        ctx.drawImage(img, imgX, imgY, imgW, imgH);
      } else {
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, w, h);
      }

      const grad = ctx.createLinearGradient(0, h * 0.4, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.2);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.2);

      ctx.textAlign = 'center';

      const title = annonce?.titre || 'Annonce';
      const price = annonce?.prix != null
        ? (annonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(annonce.prix)} FCFA`)
        : '';
      const ville = annonce?.ville || '';
      const type = annonce?.type || '';
      const whatsapp = annonce?.whatsapp || '';

      const titleSize = Math.min(w * 0.072, 64);
      const priceSize = Math.min(w * 0.055, 48);
      const infoSize = Math.min(w * 0.032, 28);
      const brandSize = Math.min(w * 0.024, 22);

      const padX = w * 0.06;
      const textW = w - padX * 2;

      ctx.textBaseline = 'bottom';
      let y = h - padX - 20;

      ctx.fillStyle = 'rgba(57,211,83,0.9)';
      ctx.font = `800 ${brandSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Généré par Konab Marcket', w / 2, y);
      y -= brandSize + 6;

      ctx.fillStyle = 'rgba(57,211,83,0.6)';
      ctx.font = `${Math.min(brandSize * 0.65, 14)}px sans-serif`;
      ctx.fillText('Konab Marcket — Achetez mieux · Vendez plus', w / 2, y);
      y -= brandSize + 10;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(57,211,83,0.3)';
      ctx.lineWidth = 1;
      ctx.moveTo(w / 2 - textW * 0.25, y);
      ctx.lineTo(w / 2 + textW * 0.25, y);
      ctx.stroke();
      y -= 4;

      if (whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${infoSize}px sans-serif`;
        ctx.fillText(whatsapp, w / 2, y);
        y -= infoSize + 4;
      }

      if (ville) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${infoSize}px sans-serif`;
        ctx.fillText(ville, w / 2, y);
        y -= infoSize + 4;
      }

      if (price) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${priceSize}px sans-serif`;
        ctx.textAlign = 'center';
        y -= priceSize * 0.3;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 16;
        ctx.fillText(price, w / 2, y);
        ctx.shadowBlur = 0;
        y -= priceSize + 8;
      }

      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 ${titleSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 20;

      const lines = wrapText(ctx, title.toUpperCase(), textW);
      for (let i = lines.length - 1; i >= 0; i--) {
        y -= titleSize + 4;
        ctx.fillText(lines[i], w / 2, y);
      }
      ctx.shadowBlur = 0;

      if (type) {
        const typeLabels = { offre: 'OFFRE', emploi: 'EMPLOI', formation: 'FORMATION', article: 'ARTICLE', recherche: 'RECHERCHE' };
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `700 ${infoSize * 0.85}px sans-serif`;
        ctx.fillText(typeLabels[type] || type.toUpperCase(), w / 2, padX + infoSize);
      }

      const blob = await new Promise(resolve => {
        try { canvas.toBlob(b => resolve(b), 'image/png'); }
        catch (_) { resolve(null); }
      });
      if (blob) {
        setPosterBlob(blob);
        setPosterUrl(URL.createObjectURL(blob));
      } else {
        setErrorMsg('Impossible de générer l\'image (peut-être un bloqueur de pub ?)');
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