import { setAvailabilityStatus } from './taskService';

/** Volunteer-facing alias for updating live availability / presence state. */
export async function updateAvailability(
  userId: string,
  status: 'online' | 'offline' | 'available' | 'busy',
): Promise<void> {
  await setAvailabilityStatus(userId, status);
}
