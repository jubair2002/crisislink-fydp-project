import { useCallback, useEffect } from 'react';
import * as Location from 'expo-location';

import { useLocationStore } from '../../store/locationStore';

export function useHomeLocation() {
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const permissionDenied = useLocationStore((s) => s.permissionDenied);
  const setCoords = useLocationStore((s) => s.setCoords);
  const setPermissionDenied = useLocationStore((s) => s.setPermissionDenied);

  const refreshCoords = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setCoords(null, null);
        return null;
      }
      setPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords(lat, lng);
      return { latitude: lat, longitude: lng };
    } catch {
      setCoords(null, null);
      return null;
    }
  }, [setCoords, setPermissionDenied]);

  useEffect(() => {
    void refreshCoords();
  }, [refreshCoords]);

  return {
    latitude,
    longitude,
    permissionDenied,
    refreshCoords,
  };
}
