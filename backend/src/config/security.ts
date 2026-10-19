export const securityConfig = {
  jwtExpiresIn: '1h',
  refreshTokenExpiresInDays: 7,
  bcryptSaltRounds: 12,
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
