import { z } from 'zod';
import { ABUSE_CATEGORIES } from '../constants/abuseCategories';

export const reportAbuseSchema = z.object({
  targetType: z.enum(['USER', 'NEED', 'MEDIA']),
  targetId: z.string().uuid(),
  category: z.nativeEnum(ABUSE_CATEGORIES),
  description: z.string().min(10).max(1000),
});

export const reportNeedSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(2000),
  category: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isMinorInvolved: z.boolean().default(false),
});

export const moderationActionSchema = z.object({
  targetType: z.enum(['USER', 'NEED', 'MEDIA']),
  targetId: z.string().uuid(),
  action: z.enum(['WARN', 'SUSPEND', 'BAN', 'CONTENT_TAKEDOWN']),
  reason: z.string().min(5).max(1000),
});

export const submitAppealSchema = z.object({
  actionId: z.string().uuid(),
  statement: z.string().min(10).max(2000),
});

export const reviewAppealSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  resolutionNotes: z.string().min(3).max(1000).optional(),
});

export const contentTakedownSchema = z.object({
  targetType: z.enum(['NEED', 'MEDIA']),
  targetId: z.string().uuid(),
  reason: z.string().min(5).max(1000),
});

