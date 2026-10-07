import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

export default function AnimatedNumber({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => 
    isCurrency 
      ? `Rs. ${Math.round(latest).toLocaleString('en-US')}`
      : Math.round(latest).toLocaleString('en-US')
  );

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}
