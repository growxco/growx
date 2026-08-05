import { useEffect, useId, useRef } from 'react';

export default function ImageLightbox({ item, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!item) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b09] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-sm font-semibold text-white sm:text-base">{item.title || item.alt}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-2xl leading-none text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
            aria-label="Fechar imagem ampliada"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-black/35 p-2 sm:p-4">
          <img
            src={item.src}
            alt={item.alt}
            className="mx-auto max-h-[78vh] w-auto max-w-full object-contain"
          />
        </div>
        {item.caption && (
          <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-white/65 sm:px-5">
            {item.caption}
          </p>
        )}
      </div>
    </div>
  );
}
