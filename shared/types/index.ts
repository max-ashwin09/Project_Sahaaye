export type UserRole = 'USER' | 'VOLUNTEER' | 'NGO' | 'MODERATOR' | 'ADMIN';

export type NeedStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'UNDER_REVIEW' | 'FLAGGED';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  fuzzed?: boolean;
}

export interface BeneficiaryProtection {
  isMinor: boolean;
  facesBlurred: boolean;
  exifStripped: boolean;
  consentObtained: boolean;
}
