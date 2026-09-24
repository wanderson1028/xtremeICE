import React, { useEffect, useRef, useState } from "react";

// Animates from 0 (or from) to target over duration ms.
export default function CountUp({ target = 0, duration = 1000, className = "" }) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <span className={`sg-tabular ${className}`}>{Math.round(value)}</span>;
}