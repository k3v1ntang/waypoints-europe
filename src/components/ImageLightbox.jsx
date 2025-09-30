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
 * @param {string} imageSrc - Image URL to display
 * @param {string} imageAlt - Alt text for accessibility
 * @param {string} title - Optional title displayed in toolbar
 */
const ImageLightbox = ({ isOpen, onClose, imageSrc, imageAlt, title }) => {
  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={[
        {
          src: imageSrc,
          alt: imageAlt,
          title: title
        }
      ]}
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
        iconClose: () => '×',
        buttonPrev: () => null,
        buttonNext: () => null
      }}
    />
  );
};

export default ImageLightbox;