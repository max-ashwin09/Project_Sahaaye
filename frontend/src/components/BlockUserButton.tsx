import React from 'react';

export const BlockUserButton: React.FC<{ userId: string }> = ({ userId }) => {
  return <button aria-label="Block User">Block User</button>;
};
