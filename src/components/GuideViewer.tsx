import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Markdown from 'markdown-to-jsx/react';
import { springSheet } from '../config/motion';
import { useBodyScrollLock, useEscapeKey } from '../hooks/useSheetDismiss';
import { CloseIcon } from './icons';
import './GuideViewer.css';

// Phase 5b: full-height "large title" sheet rendering a walking tour's
// markdown guide. Markdown typography lives in GuideViewer.css on the
// token system (dark mode included) instead of per-element inline props.

interface GuideViewerProps {
  /** Walking tour id - guides live at /guides/{tourId}.md */
  tourId: string;
  onClose: () => void;
}

const GuideViewer = ({ tourId, onClose }: GuideViewerProps) => {
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ❓ CONCEPT: fetch-in-effect with a cancellation flag
    // 📝 EXPLANATION: if the component unmounts (or tourId changes) while
    // the fetch is in flight, the stale response must not land in state -
    // the flag makes the old invocation's callbacks no-ops.
    let cancelled = false;
    const fetchGuide = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/guides/${tourId}.md`);
        if (!response.ok) {
          throw new Error(`Guide not found for ${tourId}`);
        }
        const text = await response.text();
        if (!cancelled) setMarkdownContent(text);
      } catch (err) {
        console.error('Error loading guide:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchGuide();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  useEscapeKey(onClose);
  useBodyScrollLock();

  return (
    <>
      <motion.div
        className="guide-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="guide-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Walking tour guide"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springSheet}
      >
        {/* Decorative only (this sheet has no drag gesture): a second
            close BUTTON here would give screen readers two adjacent,
            identically-labeled "Close guide" stops (review finding). */}
        <div className="guide-handle" aria-hidden="true" />
        <div className="guide-header">
          <h2 className="guide-title">Walking Tour Guide</h2>
          <button className="guide-close" aria-label="Close guide" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="guide-content">
          {loading && <div className="guide-status">Loading guide...</div>}

          {error && (
            <div className="guide-status guide-status--error">
              <p>Error loading guide: {error}</p>
              <p className="guide-status-hint">Guide not available for this city yet.</p>
            </div>
          )}

          {!loading && !error && markdownContent && (
            <Markdown
              options={{
                disableParsingRawHTML: true,
                overrides: {
                  a: {
                    props: {
                      target: '_blank',
                      rel: 'noopener noreferrer'
                    }
                  }
                }
              }}
            >
              {markdownContent}
            </Markdown>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default GuideViewer;
