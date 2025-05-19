import React from 'react';

const Loader = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
      <div 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: '#0d6efd', 
          margin: '0 5px',
          animation: 'bounce 1.4s infinite ease-in-out both'
        }}
      ></div>
      <div 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: '#0d6efd', 
          margin: '0 5px',
          animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: '0.16s'
        }}
      ></div>
      <div 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: '#0d6efd', 
          margin: '0 5px',
          animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: '0.32s'
        }}
      ></div>
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
          }
        `}
      </style>
    </div>
  );
};

export default Loader;
