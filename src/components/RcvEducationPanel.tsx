import React from 'react';

export interface RcvEducationPanelProps {
  usesRcv?: boolean;
}

/**
 * The one place the mechanic is named (REDESIGN_SPEC §1.4 step 5, §9).
 * Evidence-toned: present the comparison, never editorialize.
 */
export const RcvEducationPanel: React.FC<RcvEducationPanelProps> = ({ usesRcv }) => {
  return (
    <section className="rcv-panel">
      <h3 className="rcv-panel-heading">What you just did mirrors ranked choice voting.</h3>
      <p className="rcv-panel-body">
        You ordered preferences instead of picking one winner.
        {usesRcv === true && (
          <>
            &nbsp; This race is decided exactly this way.&nbsp; Your real ballot will ask for the
            same ordered preferences you just made.
          </>
        )}
        {usesRcv === false && (
          <>
            &nbsp; This race is decided with a single choice instead.&nbsp; On a traditional
            ballot, only your top pick would count.
          </>
        )}
      </p>
    </section>
  );
};
