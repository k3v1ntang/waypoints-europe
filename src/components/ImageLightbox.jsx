import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

/**
 * ImageLightbox - Modern lightbox component using Yet Another React Lightbox
 *
 * Features:
 * - Professional mobile touch support (pinch-to-zoom, double-tap, swipe)
 * - Prevents background scroll (NoScroll module built-in)
 * - Keyboard navigation (Esc, +/-, arrow keys)
 * - Responsive and accessible
 *
 * @param {boolean} isOpen - Controls lightbox visibility
 * @param {function} onClose - Callback when lightbox closes
 * @param {Array<{src: string, alt?: string, title?: string}>} slides - Images to show
 * @param {number} index - Slide to open on (default 0)
 */
const ImageLightbox = ({ isOpen, onClose, slides, index = 0 }) => {
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
        buttons: [
          'close'
        ]
      }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)'
        }
      }}
      render={{
        iconClose: () => '×'
      }}
    />
  );
};

export default ImageLightbox;