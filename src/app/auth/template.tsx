"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Transición sutil entre pantallas de autenticación (template se vuelve a montar en cada navegación). */
export default function AuthTemplate({ children }: { children: ReactNode }) {
  const reducir = useReducedMotion();
  return (
    <motion.div
      initial={reducir ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
