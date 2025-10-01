import { useState, useEffect } from 'react';
import Markdown from 'markdown-to-jsx';

const GuideViewer = ({ cityId, onClose }) => {
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/guides/${cityId}.md`);

        if (!response.ok) {
          throw new Error(`Guide not found for ${cityId}`);
        }

        const text = await response.text();
        setMarkdownContent(text);
      } catch (err) {
        console.error('Error loading guide:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (cityId) {
      fetchGuide();
    }
  }, [cityId]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent background scroll when guide is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
            Walking Tour Guide
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#111827')}
            onMouseLeave={(e) => (e.target.style.color = '#6b7280')}
            aria-label="Close guide"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            WebkitOverflowScrolling: 'touch',
          }}
          className="guide-content"
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading guide...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
              <p>Error loading guide: {error}</p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Guide not available for this city yet.
              </p>
            </div>
          )}

          {!loading && !error && markdownContent && (
            <Markdown
              options={{
                overrides: {
                  h1: {
                    props: {
                      style: {
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#111827',
                        marginTop: 0,
                        marginBottom: '16px',
                        lineHeight: 1.2,
                      },
                    },
                  },
                  h2: {
                    props: {
                      style: {
                        fontSize: '22px',
                        fontWeight: 600,
                        color: '#2563eb',
                        marginTop: '32px',
                        marginBottom: '12px',
                        lineHeight: 1.3,
                      },
                    },
                  },
                  h3: {
                    props: {
                      style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#374151',
                        marginTop: '24px',
                        marginBottom: '8px',
                        lineHeight: 1.4,
                      },
                    },
                  },
                  p: {
                    props: {
                      style: {
                        fontSize: '16px',
                        lineHeight: 1.7,
                        color: '#374151',
                        marginBottom: '16px',
                      },
                    },
                  },
                  strong: {
                    props: {
                      style: {
                        fontWeight: 600,
                        color: '#111827',
                      },
                    },
                  },
                  em: {
                    props: {
                      style: {
                        fontStyle: 'italic',
                        color: '#6b7280',
                      },
                    },
                  },
                  a: {
                    props: {
                      style: {
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 500,
                      },
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                  },
                  hr: {
                    props: {
                      style: {
                        border: 'none',
                        borderTop: '1px solid #e5e7eb',
                        margin: '24px 0',
                      },
                    },
                  },
                  blockquote: {
                    props: {
                      style: {
                        borderLeft: '4px solid #2563eb',
                        paddingLeft: '16px',
                        marginLeft: 0,
                        color: '#6b7280',
                        fontStyle: 'italic',
                      },
                    },
                  },
                  ul: {
                    props: {
                      style: {
                        paddingLeft: '24px',
                        marginBottom: '16px',
                      },
                    },
                  },
                  ol: {
                    props: {
                      style: {
                        paddingLeft: '24px',
                        marginBottom: '16px',
                      },
                    },
                  },
                  li: {
                    props: {
                      style: {
                        marginBottom: '8px',
                        lineHeight: 1.6,
                        color: '#374151',
                      },
                    },
                  },
                },
              }}
            >
              {markdownContent}
            </Markdown>
          )}
        </div>
      </div>

      <style>
        {`
          .guide-content a:hover {
            text-decoration: underline;
          }

          @media (max-width: 640px) {
            .guide-content h1 {
              font-size: 24px !important;
            }
            .guide-content h2 {
              font-size: 20px !important;
            }
            .guide-content h3 {
              font-size: 16px !important;
            }
            .guide-content p, .guide-content li {
              font-size: 15px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default GuideViewer;
