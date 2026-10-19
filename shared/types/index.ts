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

export type ModerationActionType = 'WARN' | 'SUSPEND' | 'BAN' | 'CONTENT_TAKEDOWN';
export type ModerationTargetType = 'USER' | 'NEED' | 'MEDIA';
export type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ModerationAction {
  id: string;
  moderator_id: string;
  target_type: ModerationTargetType;
  target_id: string;
  action: ModerationActionType;
  reason: string;
  created_at: Date | string;
}

export interface Appeal {
  id: string;
  action_id: string;
  user_id: string;
  statement: string;
  status: AppealStatus;
  reviewed_by?: string | null;
  created_at: Date | string;
  resolved_at?: Date | string | null;
}

