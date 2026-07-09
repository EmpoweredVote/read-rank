import React, { useState } from 'react';
import { candidateLines } from '../utils/candidateLines';
import { EssentialsLogo } from './EssentialsLogo';

export interface PoliticianIdentityCardProps {
  name: string;
  photo: string;
  essentialsUrl: string;
  office: string;
  title?: string;
  chamber?: string;
  district?: string;
  onEssentialsClick?: () => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Faithful to Essentials `PoliticianCard` (photo · teal name · position ·
 * jurisdiction) but themed with read-rank vars for dark mode, and with the
 * Essentials symbol top-right (a slot ev-ui's card doesn't expose). Fixed height:
 * the photo never stretches, so the drawer below can grow independently.
 */
export const PoliticianIdentityCard: React.FC<PoliticianIdentityCardProps> = ({
  name, photo, essentialsUrl, office, title, chamber, district, onEssentialsClick,
}) => {
  const [imgOk, setImgOk] = useState(true);
  const { line2, line3 } = candidateLines({ office, title, chamber, district });
  return (
    <div className="pid-card">
      <div className="pid-photo">
        {photo && imgOk
          ? <img src={photo} alt={name} onError={() => setImgOk(false)} />
          : <span className="pid-initials">{initials(name)}</span>}
      </div>
      <div className="pid-content">
        <div className="pid-lines">
          <p className="pid-name">{name}</p>
          <p className="pid-position">{line2}</p>
          {line3 && <p className="pid-district">{line3}</p>}
        </div>
        <EssentialsLogo href={essentialsUrl} onClick={onEssentialsClick} />
      </div>
    </div>
  );
};
