import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotion, DUR } from '../motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { searchPoliticians } from '../data/api';
import useGooglePlacesAutocomplete from '../hooks/useGooglePlacesAutocomplete';
import { useAuthState } from '../hooks/useAuthState';
import { evContext, useEvContextPromotion } from '@empoweredvote/ev-ui';
import { parseStateFromAddress } from '../utils/parseStateFromAddress';
import { resolveQueryRoute } from '../lib/localitySearch';
import { track } from '../lib/analytics';

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
  const m = useMotion();
  const { locationFilter, setLocationFilter, clearLocationFilter, counties, setBrowseTarget, browseTarget } = useReadRankStore();
  const { isLoggedIn, userId } = useAuthState();
  const [searching, setSearching] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [noMatchWarning, setNoMatchWarning] = useState(false);
  const [editing, setEditing] = useState(false);
  const showInput = locationFilter === null || editing;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);
  const restoreFocus = useRef<'change' | 'input' | null>(null);
  const focusChangeBtn = useCallback((el: HTMLButtonElement | null) => {
    if (el && restoreFocus.current === 'change') {
      el.focus();
      restoreFocus.current = null;
    }
  }, []);
  const setInputNode = useCallback((el: HTMLInputElement | null) => {
    inputRef.current = el;
    setInputEl(el);
  }, []);

  const handlePlaceSelected = useCallback(async (formattedAddress: string, opts?: { track?: boolean }) => {
    if (!formattedAddress.trim()) return;
    setSearching(true);
    setNoMatchWarning(false);

    const result = await searchPoliticians(formattedAddress);
    const politicianIds = result.data.map((p) => p.id);

    // Only count searches the user actively triggered — not silent auto-hydrate.
    if (opts?.track !== false) {
      track('readrank_address_searched', {
        state: parseStateFromAddress(formattedAddress),
        matched_count: politicianIds.length,
        matched: politicianIds.length > 0,
      });
    }

    if (politicianIds.length > 0) {
      setLocationFilter({
        address: formattedAddress,
        politicianIds,
        state: parseStateFromAddress(formattedAddress),
        county: result.county?.geoid ?? null,
        countyName: result.county?.name ?? null,
        jurisdiction: result.jurisdiction ?? null,
      });
      writeAddressToContext(formattedAddress, isLoggedIn ? userId : null);
      restoreFocus.current = 'change';
      setEditing(false);
    } else {
      setNoMatchWarning(true);
      setTimeout(() => setNoMatchWarning(false), 3000);
    }

    setSearching(false);
    onFilterApplied?.(politicianIds);
  }, [setLocationFilter, onFilterApplied, isLoggedIn, userId]);

  useGooglePlacesAutocomplete(inputRef, { onPlaceSelected: handlePlaceSelected, attachKey: inputEl });

  useEffect(() => {
    if ((editing || restoreFocus.current === 'input') && inputEl) {
      inputEl.focus();
      if (restoreFocus.current === 'input') restoreFocus.current = null;
    }
  }, [editing, inputEl]);

  // Manual submit (Search button / Enter). Classify the free text first: place names
  // (state/county/city) route into browse; anything else — and any failure — falls through
  // to the address search. A picked autocomplete place is unambiguous, so it keeps calling
  // handlePlaceSelected directly.
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setSearching(true);
    const route = await resolveQueryRoute(value, counties);
    setSearching(false);
    if (route.kind === 'browse-state') { setEditing(false); setBrowseTarget({ state: route.state, geoid: null }); return; }
    if (route.kind === 'browse-county') { setEditing(false); setBrowseTarget({ state: route.state, geoid: route.geoid }); return; }
    await handlePlaceSelected(value);
  }, [handlePlaceSelected, setBrowseTarget, counties]);

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
            handlePlaceSelected(a.addr, { track: false });
            return;
          }
        }
        const shared = await evContext.get();
        const a = shared && (shared as { address?: { addr?: string; ts?: number } }).address;
        if (!a || typeof a.addr !== 'string') return;
        if (a.ts && Date.now() - a.ts > TTL_MS) return;
        handlePlaceSelected(a.addr, { track: false });
      } catch { /* broker offline — silent fallthrough */ }
    };
    autoAppliedRef.current = true;
    tryHydrate();
  }, [locationFilter, handlePlaceSelected, isLoggedIn, userId]);

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
        {!showInput ? (
          <motion.p
            key="line"
            className="rr-address-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={m.transition(DUR.base)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              className="rr-address-line__pin">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="rr-address-line__text">
              {browseTarget ? 'Your address: ' : 'Races for '}
              <strong className="rr-address-line__addr" title={locationFilter?.address}>{locationFilter?.address}</strong>
            </span>
            <button ref={focusChangeBtn} type="button" className="rr-text-btn" aria-label="Change address" onClick={() => setEditing(true)}>
              Change
            </button>
          </motion.p>
        ) : (
          <motion.div
            key="input"
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={m.transition(DUR.base)}
          >
            <div className="flex gap-2">
              <input
                ref={setInputNode}
                type="text"
                aria-label="Street address"
                placeholder="If you reside in an Alpha Community, enter your street address"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(inputValue);
                  if (e.key === 'Escape' && editing) { restoreFocus.current = 'change'; setEditing(false); }
                }}
                className="flex-1 min-w-0 px-3 py-4 text-sm border-2 border-ev-yellow rounded-xl focus:outline-none focus:ring-2 focus:ring-ev-yellow bg-[var(--surface-card)] text-[var(--text-ink)] placeholder:text-[var(--text-tertiary)] shadow-sm"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
              <button
                onClick={() => handleSubmit(inputValue)}
                disabled={!inputValue.trim() || searching}
                className="px-5 py-4 text-base font-bold text-black bg-ev-yellow rounded-xl hover:bg-ev-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {editing && (
              <div className="flex gap-4 mt-2">
                <button type="button" className="rr-text-btn" onClick={() => { restoreFocus.current = 'change'; setEditing(false); }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rr-text-btn rr-text-btn--muted"
                  onClick={() => { restoreFocus.current = 'input'; setEditing(false); clearLocationFilter(); }}
                >
                  Clear address
                </button>
              </div>
            )}
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
      className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-[var(--text-link)] text-[0.8125rem]"
      style={{ background: 'var(--surface-raised)', fontFamily: "'Manrope', sans-serif" }}
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
        className="px-3 py-1 rounded-full border-none text-[var(--action-primary-ink)] text-xs font-semibold cursor-pointer"
        style={{ background: 'var(--action-primary)', opacity: saving ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}
      >
        {saving ? 'Saving…' : 'Use it'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        disabled={saving}
        aria-label="Dismiss"
        className="px-1.5 py-0.5 border-none bg-transparent text-[var(--text-tertiary)] text-base leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
