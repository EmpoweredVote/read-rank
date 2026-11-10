import { useEffect, useRef } from 'react';

interface BrowseHeaderProps {
  /** "‹ Back to my ballot" with a location, otherwise "‹ Back". */
  backLabel: string;
  onBack: () => void;
}

/** Top of the Browse view: a text back link and the page H1. On mount it scrolls to
 *  the top and moves focus to the H1, so Browse reads as its own page. */
export function BrowseHeader({ backLabel, onBack }: BrowseHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="rr-browse-header">
      <button type="button" className="rr-browse-back" onClick={onBack}>{backLabel}</button>
      <h1 ref={titleRef} tabIndex={-1} className="rr-browse-title">Choose an election</h1>
    </div>
  );
}
