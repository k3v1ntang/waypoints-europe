const FloatingActionButton = ({ onClick, icon, label, badge }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        backgroundColor: '#2563eb',
        border: 'none',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: 'white',
        zIndex: 999,
        transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.05)';
        e.target.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
      }}
      onMouseDown={(e) => {
        e.target.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.target.style.transform = 'scale(1.05)';
      }}
      aria-label={label}
      title={label}
    >
      {icon}

      {/* Badge for notifications/count */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '10px',
            minWidth: '20px',
            height: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}
        >
          {badge}
        </div>
      )}
    </button>
  );
};

export default FloatingActionButton;