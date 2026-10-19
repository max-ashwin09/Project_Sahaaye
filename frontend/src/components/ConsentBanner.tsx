import React from 'react';

export const ConsentBanner: React.FC = () => {
  return (
    <div role="region" aria-label="Consent Notice" className="consent-banner">
      <p>We respect your privacy under the DPDP Act 2023. We only process data for humanitarian matching with your consent.</p>
    </div>
  );
};
