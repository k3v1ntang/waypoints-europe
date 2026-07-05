import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { springSheet } from '../config/motion';
import styles from './BottomSheet.module.css';

// Phase 5b: reusable modal bottom sheet in the glass system - grab handle,
// spring entrance, scrim backdrop. The old version faked exit animations
// with an isAnimating state + transitionend; AnimatePresence replaces all
// of that (see SearchSheet.tsx for the concept note).

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const BottomSheet = ({ isOpen, onClose, title, children }: BottomSheetProps) => {
  // Keep the page behind the sheet from scrolling while it's open.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
          >
            <button className={styles.handle} aria-label="Close" onClick={onClose} />
            {title && (
              <div className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
              </div>
            )}
            <div className={styles.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
