import { useState, useCallback } from 'react';
import { API_BASE } from '../services/api';
import { calculateDistanceMeters } from '../utils/imageCompressor';

export interface DuplicateNeedMatch {
  id: string;
  title: string;
  category: string;
  urgency: string;
  distanceMeters: number;
  location: string;
  imageUrl?: string | null;
  createdAt: string;
  similarityScore: number;
}

/**
 * Basic Jaccard token similarity between two text strings
 */
function computeTextSimilarity(str1: string, str2: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const set1 = tokenize(str1);
  const set2 = tokenize(str2);

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export function useDuplicateCheck() {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateNeedMatch | null>(null);

  const checkDuplicates = useCallback(
    async (
      lat: number,
      lng: number,
      category: string,
      title: string
    ): Promise<DuplicateNeedMatch | null> => {
      setIsChecking(true);
      try {
        // Query backend needs within 200m radius
        const url = `${API_BASE}/needs/duplicates?lat=${lat}&lng=${lng}&category=${encodeURIComponent(
          category
        )}&radiusMeters=200&days=7`;

        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.duplicates && data.duplicates.length > 0) {
            // Find most relevant duplicate
            const scored = data.duplicates.map((need: any) => {
              const textSim = computeTextSimilarity(title, need.title);
              const dist = need.distanceMeters || calculateDistanceMeters(lat, lng, need.latitude, need.longitude);
              return {
                id: need.id,
                title: need.title,
                category: need.category,
                urgency: need.urgency,
                distanceMeters: dist,
                location: need.location,
                imageUrl: need.imageUrl,
                createdAt: need.createdAt,
                similarityScore: textSim,
              };
            });

            // Sort by closest distance and highest text similarity
            scored.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);
            const topMatch = scored[0];
            setDuplicateMatch(topMatch);
            setIsChecking(false);
            return topMatch;
          }
        }
      } catch (err) {
        console.warn('Duplicate check note: fallback query or server check bypassed', err);
      } finally {
        setIsChecking(false);
      }

      setDuplicateMatch(null);
      return null;
    },
    []
  );

  const clearDuplicateMatch = useCallback(() => {
    setDuplicateMatch(null);
  }, []);

  return {
    isChecking,
    duplicateMatch,
    checkDuplicates,
    clearDuplicateMatch,
  };
}
