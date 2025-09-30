import { useState, useEffect, useRef } from 'react';

const ImageLightbox = ({ isOpen, onClose, imageSrc, imageAlt, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen]);

  // Touch/Mouse event handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1) {
      // Drag start
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      if (lastPinchDistance > 0) {
        const scaleChange = distance / lastPinchDistance;
        const newScale = Math.max(0.5, Math.min(5, scale * scaleChange));
        setScale(newScale);
      }
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Drag when zoomed
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastPinchDistance(0);
  };

  // Mouse events for desktop
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Utility functions
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev * 1.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev / 1.5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
      }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header with title and close button */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          padding: '16px 20px',
          zIndex: 10001,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {title && (
          <h3
            style={{
              color: 'white',
              margin: 0,
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            {title}
          </h3>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          aria-label="Close lightbox"
        >
          ×
        </button>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px 20px 20px',
          overflow: 'hidden'
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              color: 'white',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            Loading map...
          </div>
        )}

        <img
          ref={imageRef}
          src={imageSrc}
          alt={imageAlt}
          onLoad={handleImageLoad}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto'
          }}
          draggable={false}
        />
      </div>

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          padding: '20px',
          zIndex: 10001,
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            opacity: scale <= 0.5 ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          aria-label="Zoom out"
        >
          −
        </button>

        <button
          onClick={resetZoom}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          aria-label="Reset zoom"
        >
          Fit
        </button>

        <button
          onClick={handleZoomIn}
          disabled={scale >= 5}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            opacity: scale >= 5 ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageLightbox;