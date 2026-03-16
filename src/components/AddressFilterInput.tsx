import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { searchPoliticians } from '../data/api';
import useGooglePlacesAutocomplete from '../hooks/useGooglePlacesAutocomplete';

interface AddressFilterInputProps {
  onFilterApplied?: (politicianIds: string[]) => void;
}

export function AddressFilterInput({ onFilterApplied }: AddressFilterInputProps) {
  const { locationFilter, setLocationFilter, clearLocationFilter } = useReadRankStore();
  const [searching, setSearching] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [noMatchWarning, setNoMatchWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelected = useCallback(async (formattedAddress: string) => {
    setSearching(true);
    setNoMatchWarning(false);

    const result = await searchPoliticians(formattedAddress);
    const politicianIds = result.data.map((p) => p.id);

    if (politicianIds.length > 0) {
      setLocationFilter({ address: formattedAddress, politicianIds });
    } else {
      setNoMatchWarning(true);
      setTimeout(() => setNoMatchWarning(false), 3000);
    }

    setSearching(false);
    onFilterApplied?.(politicianIds);
  }, [setLocationFilter, onFilterApplied]);

  useGooglePlacesAutocomplete(inputRef, { onPlaceSelected: handlePlaceSelected });

  const truncatedAddress = locationFilter?.address
    ? locationFilter.address.length > 40
      ? locationFilter.address.slice(0, 40) + '\u2026'
      : locationFilter.address
    : '';

  return (
    <div style={{ maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
      <AnimatePresence mode="wait">
        {locationFilter !== null ? (
          <motion.div
            key="chip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#e8f4f6',
                borderRadius: '9999px',
                padding: '0.5rem 1rem',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {/* Pin icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00657c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span
                style={{
                  fontSize: '0.875rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {truncatedAddress}
              </span>
              <button
                onClick={clearLocationFilter}
                aria-label="Clear address filter"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.25rem',
                  height: '1.25rem',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#1a1a2e'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
              >
                &times;
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Filter by address..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.9375rem',
                  border: '1px solid #e8e2d9',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  width: '100%',
                  backgroundColor: '#fffefb',
                  color: '#1a1a2e',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#00657c'; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#e8e2d9'; }}
              />
              {searching && (
                <div
                  style={{
                    position: 'absolute',
                    right: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid #e8e2d9',
                      borderTopColor: '#00657c',
                      borderRadius: '9999px',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                </div>
              )}
            </div>
            {noMatchWarning && (
              <p
                style={{
                  color: '#e64a34',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.8125rem',
                  marginTop: '0.375rem',
                }}
              >
                No representatives found with quotes for this address.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
