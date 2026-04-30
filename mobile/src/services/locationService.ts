import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { updateVolunteerLocation } from './taskService';

let trackingSubscription: LocationSubscription | null = null;
let trackingVolunteerId: string | null = null;

const LOCATION_INTERVAL_MS = 30_000;

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}

export async function startTracking(volunteerId: string): Promise<void> {
  trackingVolunteerId = volunteerId;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Location permission denied.');

  await Location.requestBackgroundPermissionsAsync();

  const location = await getCurrentLocation();
  if (location) {
    await updateVolunteerLocation(volunteerId, location.lat, location.lng);
  }

  await stopTracking();
  trackingSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_INTERVAL_MS,
      distanceInterval: 0,
    },
    async (pos) => {
      if (!trackingVolunteerId) return;
      try {
        await updateVolunteerLocation(
          trackingVolunteerId,
          pos.coords.latitude,
          pos.coords.longitude,
        );
      } catch (err) {
        console.warn('[locationService] updateVolunteerLocation failed:', err);
      }
    },
  );
}

export async function stopTracking(): Promise<void> {
  if (trackingSubscription) {
    trackingSubscription.remove();
    trackingSubscription = null;
  }
  trackingVolunteerId = null;
}
