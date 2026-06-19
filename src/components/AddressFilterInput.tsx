import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { searchPoliticians } from '../data/api';
import useGooglePlacesAutocomplete from '../hooks/useGooglePlacesAutocomplete';
import { useAuthState } from '../hooks/useAuthState';
import { evContext, useEvContextPromotion } from '@empoweredvote/ev-ui';
import { parseStateFromAddress } from '../utils/parseStateFromAddress';

function writeAddressToContext(addr: string, userId?: string | null) {
  const state = parseStateFromAddress(addr);
  if (!state) return;
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

export function AddressFilterInput({ onFilterApplied }: AddressFilterInputProps) {
  const { locationFilter, setLocationFilter, clearLocationFilter } = useReadRankStore();
  const { isLoggedIn, userId } = useAuthState();
  const [searching, setSearching] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [noMatchWarning, setNoMatchWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelected = useCallback(async (formattedAddress: string) => {
    if (!formattedAddress.trim()) return;
    setSearching(true);
    setNoMatchWarning(false);

    const result = await searchPoliticians(formattedAddress);
    const politicianIds = result.data.map((p) => p.id);

    if (politicianIds.length > 0) {
      setLocationFilter({
        address: formattedAddress,
        politicianIds,
        state: parseStateFromAddress(formattedAddress),
      });
      writeAddressToContext(formattedAddress, isLoggedIn ? userId : null);
    } else {
      setNoMatchWarning(true);
      setTimeout(() => setNoMatchWarning(false), 3000);
    }

    setSearching(false);
    onFilterApplied?.(politicianIds);
  }, [setLocationFilter, onFilterApplied, isLoggedIn, userId]);

  useGooglePlacesAutocomplete(inputRef, { onPlaceSelected: handlePlaceSelected });

  // 260426-mw6 — guest → authed promotion banner
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
    apiData: locationFilter,
    apiWriter: addressPromoteWriter,
  });

  // Silent auto-apply: hydrate from ev-context on mount if no filter is set
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (locationFilter) return;
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

  const truncatedAddress = locationFilter?.address
    ? locationFilter.address.length > 40
      ? locationFilter.address.slice(0, 40) + '…'
      : locationFilter.address
    : '';

  return (
    <div>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f4f6]">
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#00657c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#1a1a2e', fontFamily: "'Manrope', sans-serif" }}>
                {truncatedAddress}
              </span>
              <button
                onClick={() => clearLocationFilter()}
                aria-label="Clear filter"
                className="flex items-center justify-center w-5 h-5 rounded-full border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-800 transition-colors text-base leading-none p-0"
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
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="If you reside in an Alpha Community, enter your street address"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlaceSelected(inputValue)}
                className="flex-1 min-w-0 px-3 py-4 text-sm border-2 border-ev-yellow rounded-xl focus:outline-none focus:ring-2 focus:ring-ev-yellow bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 shadow-sm"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
              <button
                onClick={() => handlePlaceSelected(inputValue)}
                disabled={!inputValue.trim() || searching}
                className="px-5 py-4 text-base font-bold text-black bg-ev-yellow rounded-xl hover:bg-ev-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {noMatchWarning && (
              <p className="mt-2 text-sm text-red-500" style={{ fontFamily: "'Manrope', sans-serif" }}>
                No representatives found with quotes for this address.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 260426-mw6 — inline banner shown when the user is logged in but read-rank has
// no locationFilter and ev-context has a guest address.
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
      className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-[#003E4D] text-[0.8125rem]"
      style={{ background: '#e8f4f6', fontFamily: "'Manrope', sans-serif" }}
    >
      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        Use <strong>{addr}</strong>?
        {status === 'error' && error && (
          <span className="text-red-500 ml-1.5">({error.message})</span>
        )}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-3 py-1 rounded-full border-none text-white text-xs font-semibold cursor-pointer"
        style={{ background: '#00657c', opacity: saving ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}
      >
        {saving ? 'Saving…' : 'Use it'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        disabled={saving}
        aria-label="Dismiss"
        className="px-1.5 py-0.5 border-none bg-transparent text-slate-400 text-base leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
