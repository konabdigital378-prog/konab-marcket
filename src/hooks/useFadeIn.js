import { useEffect, useRef, useState } from 'react';

export function useFadeIn({ threshold = 0.1, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}

export function FadeIn({ children, className = '', ...props }) {
  const [ref, visible] = useFadeIn(props);
  return (
    <div ref={ref} className={`fade-in ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function FadeInFast({ children, className = '', ...props }) {
  const [ref, visible] = useFadeIn({ ...props, threshold: 0.05 });
  return (
    <div ref={ref} className={`fade-in-fast ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  );
}
