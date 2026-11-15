"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Native <dialog> with a closing animation. Gives focus trapping and Escape for free. */
export function Dialog({
  open,
  onClose,
  id,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setOut(false);
      d.showModal();
    } else if (!open && d.open) {
      setOut(true);
      const t = setTimeout(() => {
        d.close();
        setOut(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      className={out ? "out" : ""}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
