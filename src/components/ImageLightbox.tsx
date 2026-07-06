import Lightbox, { type SlideImage } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

/**
 * ImageLightbox - lightbox wrapper around Yet Another React Lightbox.
 *
 * Features:
 * - Professional mobile touch support (pinch-to-zoom, double-tap, swipe)
 * - Prevents background scroll (NoScroll module built-in)
 * - Keyboard navigation (Esc, +/-, arrow keys)
 * - Responsive and accessible
 */

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideImage[];
  /** Slide to open on (default 0). */
  index?: number;
}

const ImageLightbox = ({ isOpen, onClose, slides, index = 0 }: ImageLightboxProps) => {
  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={index}
      plugins={[Zoom]}
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: false
      }}
      carousel={{
        finite: true
      }}
      controller={{
        closeOnBackdropClick: true,
        closeOnPullDown: true,
        closeOnPullUp: true
      }}
      animation={{
        fade: 250,
        swipe: 500
      }}
      toolbar={{
        buttons: ['close']
      }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)'
        },
        // The installed PWA renders under the iOS status bar
        // (black-translucent); keep the toolbar's buttons out of the
        // clock/battery zone. env() is 0 in ordinary browser tabs.
        toolbar: {
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }
      }}
    />
  );
};

export default ImageLightbox;
