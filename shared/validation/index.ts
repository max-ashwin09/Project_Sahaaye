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
