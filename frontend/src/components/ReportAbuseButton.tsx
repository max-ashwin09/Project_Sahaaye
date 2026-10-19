import React from 'react';

export const ReportAbuseButton: React.FC<{ targetId: string; targetType: 'USER' | 'NEED' }> = ({ targetId, targetType }) => {
  return <button aria-label="Report Abuse">Report Issue</button>;
};
