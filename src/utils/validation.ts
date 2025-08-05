import { ValidationError } from './errorHandler.js';

export function validatePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new ValidationError('Phone number is required');
  }

  // Remove any whitespace and special characters
  const cleaned = phone.replace(/\s+/g, '').replace(/[-()]/g, '');

  // Check if it's a valid format (starts with 263 or 0, followed by 9 digits)
  if (!/^(263\d{9}|0\d{9})$/.test(cleaned)) {
    throw new ValidationError('Invalid phone number format');
  }

  return cleaned;
}

export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateQuantity(quantity: string | number): number {
  const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;

  if (isNaN(qty) || qty < 1 || qty > 10) {
    throw new ValidationError('Quantity must be between 1 and 10');
  }

  return qty;
}

export function validateEventId(eventId: string): string {
  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    throw new ValidationError('Event ID is required');
  }

  return eventId.trim();
}

export function validateTicketTypeId(ticketTypeId: string): string {
  if (
    !ticketTypeId ||
    typeof ticketTypeId !== 'string' ||
    ticketTypeId.trim().length === 0
  ) {
    throw new ValidationError('Ticket type ID is required');
  }

  return ticketTypeId.trim();
}

export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any potentially harmful characters while preserving normal text
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[{}]/g, '') // Remove curly braces
    .trim()
    .substring(0, 1000); // Limit length
}

export function validateEnvironmentVariable(
  key: string,
  value: string | undefined
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is not set or is empty`);
  }
  return value.trim();
}

export function isValidPaymentMethod(method: string): boolean {
  const validMethods = ['ecocash', 'innbucks', 'web'];
  return validMethods.includes(method.toLowerCase());
}

export function normalizePhoneNumber(phone: string): string {
  // Convert phone from 263... format to 0... format
  if (phone.startsWith('263')) {
    return `0${phone.slice(3)}`;
  }
  return phone;
}
