import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy per-candidate alignment page. In the redesigned flow, candidate detail
 * lives in the end-of-race reveal and on the candidate's Essentials profile, so
 * this route now just bounces back to the hub.
 */
export const CandidateAlignmentPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-page)' }}>
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Taking you back to Read &amp; Rank…
        </p>
        <button onClick={() => navigate('/', { replace: true })} className="ev-button-primary">Go now</button>
      </div>
    </div>
  );
};
