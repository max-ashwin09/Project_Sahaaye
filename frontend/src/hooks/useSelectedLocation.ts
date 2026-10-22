import { useLocationStore } from '../stores/useLocationStore';
import { getShortState } from '../utils/geohash';

/**
 * Clean reusable hook for any page or component to access the selected location
 * and app-wide filtering state.
 */
export function useSelectedLocation() {
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setRadius = useLocationStore((s) => s.setRadius);
  const setArea = useLocationStore((s) => s.setArea);
  const isAppFiltering = useLocationStore((s) => s.isAppFiltering);
  const filterToast = useLocationStore((s) => s.filterToast);
  const clearFilterToast = useLocationStore((s) => s.clearFilterToast);

  const formattedDisplay = `${location.area ? `${location.area}, ` : ''}${location.city}, ${getShortState(
    location.state
  )}`;

  return {
    location,
    city: location.city,
    state: location.state,
    area: location.area,
    lat: location.lat,
    lng: location.lng,
    geohash: location.geohash,
    radiusKm: location.radiusKm,
    formattedDisplay,
    isAppFiltering,
    filterToast,
    setLocation,
    setRadius,
    setArea,
    clearFilterToast,
  };
}
