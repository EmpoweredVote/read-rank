import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { searchPoliticians } from '../data/api';
import { apiFetch } from '../lib/auth';
import useGooglePlacesAutocomplete from '../hooks/useGooglePlacesAutocomplete';
import { useAuthState } from '../hooks/useAuthState';
import { evContext, useEvContextPromotion } from '@empoweredvote/ev-ui';

// Pulls a USPS 2-letter state code out of a formatted address. Looks for the
// 2-letter token directly preceding the ZIP, or any 2-letter all-caps segment.
function parseStateFromAddress(addr: string): string | null {
  if (!addr) return null;
  const m = addr.match(/\b([A-Z]{2})\b\s*\d{5}(?:-\d{4})?/);
  if (m) return m[1];
  const segs = addr.split(',').map((s) => s.trim());
  for (const seg of segs) {
    const sm = seg.match(/^([A-Z]{2})(?:\s+\d{5}.*)?$/);
    if (sm) return sm[1];
  }
  return null;
}

// Push the current address to ev-context, merging with any existing top-level keys
// so we don't clobber compass/verdicts state owned by other apps.
//
// When `userId` is provided (authed user, 260426-mc5), additionally mirror into
// the userId-stamped authed slice so cross-subdomain hydration is namespaced.
function writeAddressToContext(addr: string, userId?: string | null) {
  const state = parseStateFromAddress(addr);
  if (!state) return; // need state to be useful for filtering apps
  const payload = { addr, state, ts: Date.now() };
  evContext.get().then((current) => {
    const next = { ...(current || {}), address: payload };
    evContext.set(next).catch(() => {});
  }).catch(() => {});
  if (userId) {
    evContext.setAuthedSlice(userId, { address: payload }).catch(() => {});
  }
}

interface AddressFilterInputProps {
  onFilterApplied?: (politicianIds: string[]) => void;
}

interface BrowseState {
  abbreviation: string;
  fips: string;
  politician_count: number;
}

interface BrowseArea {
  geo_id: string;
  name: string;
  mtfcc: string;
  area_type: string;
}

const AREA_TYPE_LABELS: Record<string, string> = {
  county: 'County',
  city: 'City',
  township: 'Township',
};

export function AddressFilterInput({ onFilterApplied }: AddressFilterInputProps) {
  const { locationFilter, setLocationFilter, clearLocationFilter } = useReadRankStore();
  const { isLoggedIn, userId } = useAuthState();
  const [searching, setSearching] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [noMatchWarning, setNoMatchWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mode: 'address' or 'browse'
  const [mode, setMode] = useState<'address' | 'browse'>('address');

  // Browse state
  const [states, setStates] = useState<BrowseState[]>([]);
  const [areas, setAreas] = useState<BrowseArea[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedAreaType, setSelectedAreaType] = useState('');
  const [selectedArea, setSelectedArea] = useState<BrowseArea | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Load states on mount
  useEffect(() => {
    apiFetch('/essentials/browse/states')
      .then((res) => res && res.ok ? res.json() : [])
      .then((data: BrowseState[]) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]));
  }, []);

  // Load areas when state changes
  useEffect(() => {
    if (!selectedState) { setAreas([]); return; }
    apiFetch(`/essentials/browse/states/${selectedState}/areas`)
      .then((res) => res && res.ok ? res.json() : [])
      .then((data: BrowseArea[]) => setAreas(Array.isArray(data) ? data : []))
      .catch(() => setAreas([]));
  }, [selectedState]);

  // Address search handler
  const handlePlaceSelected = useCallback(async (formattedAddress: string) => {
    setSearching(true);
    setNoMatchWarning(false);

    const result = await searchPoliticians(formattedAddress);
    const politicianIds = result.data.map((p) => p.id);

    if (politicianIds.length > 0) {
      setLocationFilter({ address: formattedAddress, politicianIds });
      writeAddressToContext(formattedAddress, isLoggedIn ? userId : null);
    } else {
      setNoMatchWarning(true);
      setTimeout(() => setNoMatchWarning(false), 3000);
    }

    setSearching(false);
    onFilterApplied?.(politicianIds);
  }, [setLocationFilter, onFilterApplied, isLoggedIn, userId]);

  useGooglePlacesAutocomplete(inputRef, { onPlaceSelected: handlePlaceSelected });

  // 260426-mw6 — guest → authed promotion: when the user is logged in, has no
  // active locationFilter, and ev-context has a guest address, surface a
  // banner offering to apply it. apiWriter routes through the same
  // handlePlaceSelected path so the existing search/save/sync logic runs.
  const addressPromoteWriter = useCallback(async (addressPayload: unknown) => {
    const a = addressPayload as { addr?: string; formatted?: string } | null;
    const addr = (a && (a.formatted || a.addr)) || '';
    if (!addr) throw new Error('Missing address');
    await handlePlaceSelected(addr);
  }, [handlePlaceSelected]);
  const {
    shouldPrompt: promoteAddressShouldPrompt,
    payload: promoteAddressPayload,
    promote: promoteAddress,
    dismiss: dismissAddressPromotion,
    status: promoteAddressStatus,
    error: promoteAddressError,
  } = useEvContextPromotion({
    domain: 'address',
    isLoggedIn,
    userId,
    apiData: locationFilter, // null when nothing applied; truthy object when set
    apiWriter: addressPromoteWriter,
  });

  // Silent auto-apply on mount: if a saved address exists in ev-context (from
  // essentials/compass/etc.) and the user hasn't already chosen a filter, apply
  // it as if they typed it. A subsequent address search replaces it via
  // writeAddressToContext, so user intent always wins.
  //
  // Authed users (260426-mc5): prefer the userId-stamped authed slice; fall
  // back to the guest slice when missing or on userId mismatch.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (locationFilter) return; // user-chosen filter already exists
    const TTL_MS = 30 * 24 * 60 * 60 * 1000;
    const tryHydrate = async () => {
      try {
        if (isLoggedIn && userId) {
          const slice = await evContext.getAuthedSlice(userId);
          const a = slice && (slice as { address?: { addr?: string; ts?: number } }).address;
          if (a && typeof a.addr === 'string' && (!a.ts || Date.now() - a.ts <= TTL_MS)) {
            handlePlaceSelected(a.addr);
            return;
          }
        }
        const shared = await evContext.get();
        const a = shared && (shared as { address?: { addr?: string; ts?: number } }).address;
        if (!a || typeof a.addr !== 'string') return;
        if (a.ts && Date.now() - a.ts > TTL_MS) return;
        handlePlaceSelected(a.addr);
      } catch { /* broker offline — silent fallthrough */ }
    };
    autoAppliedRef.current = true;
    tryHydrate();
  }, [locationFilter, handlePlaceSelected, isLoggedIn, userId]);

  // Browse handler
  const handleBrowse = async () => {
    if (!selectedArea) return;
    setSearching(true);
    setBrowseError(null);

    try {
      const res = await apiFetch('/essentials/browse/by-area', {
        method: 'POST',
        body: JSON.stringify({ geo_id: selectedArea.geo_id, mtfcc: selectedArea.mtfcc }),
      });

      if (!res || !res.ok) {
        setBrowseError('No representatives found for this area.');
        setSearching(false);
        return;
      }

      const data = await res.json() as Array<{ id: string }>;
      const politicianIds = data.map((p) => p.id);

      if (politicianIds.length > 0) {
        const addrLabel = `${selectedArea.name}, ${selectedState}`;
        setLocationFilter({ address: addrLabel, politicianIds });
        writeAddressToContext(addrLabel, isLoggedIn ? userId : null);
      } else {
        setBrowseError('No representatives found with quotes for this area.');
      }

      onFilterApplied?.(politicianIds);
    } catch {
      setBrowseError('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const areaTypes = [...new Set(areas.map((a) => a.area_type))];
  const filteredAreas = selectedAreaType ? areas.filter((a) => a.area_type === selectedAreaType) : [];

  const truncatedAddress = locationFilter?.address
    ? locationFilter.address.length > 40
      ? locationFilter.address.slice(0, 40) + '\u2026'
      : locationFilter.address
    : '';

  // Shared styles
  const selectStyle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif",
    fontSize: '0.875rem',
    border: '1px solid #e8e2d9',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#fffefb',
    color: '#1a1a2e',
    outline: 'none',
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Manrope', sans-serif",
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: active ? '#00657c' : '#e8e2d9',
    color: active ? '#fff' : '#4a4a4a',
    transition: 'background-color 0.2s, color 0.2s',
  });

  return (
    <div style={{ maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
      {/* 260426-mw6 — guest → authed address promotion banner */}
      {promoteAddressShouldPrompt && (
        <AddressPromotionBanner
          payload={promoteAddressPayload}
          onSave={promoteAddress}
          onDismiss={dismissAddressPromotion}
          status={promoteAddressStatus}
          error={promoteAddressError}
        />
      )}
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
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#00657c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: '0.875rem', color: '#1a1a2e', fontWeight: 500 }}>
                {truncatedAddress}
              </span>
              <button
                onClick={() => { clearLocationFilter(); setSelectedState(''); setSelectedAreaType(''); setSelectedArea(null); }}
                aria-label="Clear filter"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '1.25rem', height: '1.25rem', borderRadius: '9999px',
                  border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                  color: '#64748b', fontSize: '1rem', lineHeight: 1, padding: 0,
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
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
              <button style={pillStyle(mode === 'address')} onClick={() => setMode('address')}>
                Address
              </button>
              <button style={pillStyle(mode === 'browse')} onClick={() => setMode('browse')}>
                Browse Location
              </button>
            </div>

            {mode === 'address' ? (
              <>
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
                    <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                      <div style={{
                        width: '1rem', height: '1rem',
                        border: '2px solid #e8e2d9', borderTopColor: '#00657c',
                        borderRadius: '9999px', animation: 'spin 0.7s linear infinite',
                      }} />
                    </div>
                  )}
                </div>
                {noMatchWarning && (
                  <p style={{ color: '#e64a34', fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                    No representatives found with quotes for this address.
                  </p>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select
                    value={selectedState}
                    onChange={(e) => { setSelectedState(e.target.value); setSelectedAreaType(''); setSelectedArea(null); setBrowseError(null); }}
                    style={{ ...selectStyle, flex: '1 1 auto', minWidth: '7rem' }}
                  >
                    <option value="">State</option>
                    {states.map((s) => (
                      <option key={s.abbreviation} value={s.abbreviation}>{s.abbreviation}</option>
                    ))}
                  </select>

                  {selectedState && areaTypes.length > 0 && (
                    <select
                      value={selectedAreaType}
                      onChange={(e) => { setSelectedAreaType(e.target.value); setSelectedArea(null); setBrowseError(null); }}
                      style={{ ...selectStyle, flex: '1 1 auto', minWidth: '7rem' }}
                    >
                      <option value="">Type</option>
                      {areaTypes.map((t) => (
                        <option key={t} value={t}>{AREA_TYPE_LABELS[t] || t}</option>
                      ))}
                    </select>
                  )}

                  {selectedAreaType && filteredAreas.length > 0 && (
                    <select
                      value={selectedArea?.geo_id || ''}
                      onChange={(e) => {
                        const area = areas.find((a) => a.geo_id === e.target.value) || null;
                        setSelectedArea(area);
                        setBrowseError(null);
                      }}
                      style={{ ...selectStyle, flex: '2 1 auto', minWidth: '9rem' }}
                    >
                      <option value="">Select {AREA_TYPE_LABELS[selectedAreaType]?.toLowerCase() || 'area'}</option>
                      {filteredAreas.map((a) => (
                        <option key={a.geo_id} value={a.geo_id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedArea && (
                  <button
                    onClick={handleBrowse}
                    disabled={searching}
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      padding: '0.5rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: '#00657c',
                      color: '#fff',
                      cursor: searching ? 'not-allowed' : 'pointer',
                      opacity: searching ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {searching ? 'Loading...' : 'Filter'}
                  </button>
                )}

                {browseError && (
                  <p style={{ color: '#e64a34', fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}>
                    {browseError}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 260426-mw6 — inline banner shown above the address input when the user is
// logged in but read-rank has no locationFilter and ev-context has a guest
// address.
interface AddressPromotionBannerProps {
  payload: unknown;
  onSave: () => void;
  onDismiss: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: Error | null;
}
function AddressPromotionBanner({ payload, onSave, onDismiss, status, error }: AddressPromotionBannerProps) {
  const a = (payload && typeof payload === 'object') ? payload as { addr?: string; formatted?: string } : null;
  const addr = (a && (a.formatted || a.addr)) || '';
  if (!addr) return null;
  const saving = status === 'saving';
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
        background: '#e8f4f6', borderRadius: '0.5rem',
        fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem',
        color: '#003E4D',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Use <strong>{addr}</strong>?
        {status === 'error' && error && (
          <span style={{ color: '#e64a34', marginLeft: 6 }}>({error.message})</span>
        )}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '0.25rem 0.75rem', borderRadius: '9999px', border: 'none',
          background: '#00657c', color: '#fff', fontWeight: 600, fontSize: '0.75rem',
          cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Use it'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        disabled={saving}
        aria-label="Dismiss"
        style={{
          padding: '0.125rem 0.375rem', border: 'none', background: 'transparent',
          color: '#64748b', fontSize: '1rem', lineHeight: 1, cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
