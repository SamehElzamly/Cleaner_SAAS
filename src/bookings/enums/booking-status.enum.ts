export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

// Statuses that occupy a staff member's time (used for overlap detection).
export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

// The only legal status moves. completed and canceled are terminal.
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELED],
  [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELED]: [],
};
