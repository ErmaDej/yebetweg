/**
 * Form Input Validation & Sanitization Module
 * Prevents database injection, XSS, and data integrity issues
 */

const MAX_SHORT_TEXT = 100;
const MAX_LONG_TEXT = 5000;
const MAX_EMAIL = 254;

/**
 * Email validation using strict regex pattern
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL) return false;
  // RFC 5322 simplified pattern
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Phone number validation (international format support)
 * Accepts formats like +251911234567, 0911234567, (251) 911-234-567
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s-()]/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) return false;
  // Should only contain digits, optionally starting with +
  return /^\+?\d{7,15}$/.test(cleaned);
}

/**
 * Sanitizes text by trimming and enforcing max length
 */
export function sanitizeText(
  input: string | null | undefined,
  maxLength: number = MAX_LONG_TEXT,
): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Validates person/business name
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= MAX_SHORT_TEXT;
}

/**
 * Validates location string
 */
export function validateLocation(location: string): boolean {
  if (!location || typeof location !== 'string') return false;
  const trimmed = location.trim();
  return trimmed.length >= 2 && trimmed.length <= MAX_SHORT_TEXT;
}

/**
 * Validates numeric price (non-negative, within reasonable bounds)
 */
export function validatePrice(price: unknown): boolean {
  const parsed = typeof price === 'string' ? Number(price) : price;
  if (typeof parsed !== 'number' || isNaN(parsed)) return false;
  return parsed >= 0 && parsed <= 999999999; // Up to ~1 billion ETB
}

/**
 * Validates title for listings (1-200 chars)
 */
export function validateTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

/**
 * Validates description (up to 5000 chars)
 */
export function validateDescription(description: string): boolean {
  if (!description || typeof description !== 'string') return false;
  const trimmed = description.trim();
  return trimmed.length >= 10 && trimmed.length <= MAX_LONG_TEXT;
}

/**
 * Validates specialty field (restricted to allowed values)
 */
export const ALLOWED_SPECIALTIES = [
  'architect',
  'engineer',
  'contractor',
  'electrician',
  'plumber',
  'mason',
  'surveyor',
] as const;

export function validateSpecialty(specialty: string): boolean {
  if (!specialty || typeof specialty !== 'string') return false;
  return ALLOWED_SPECIALTIES.includes(
    specialty.toLowerCase() as (typeof ALLOWED_SPECIALTIES)[number],
  );
}

/**
 * Validates contact message/inquiry (50-5000 chars)
 */
export function validateMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length >= 10 && trimmed.length <= MAX_LONG_TEXT;
}

/**
 * Form data validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates contact inquiry form
 */
export function validateContactForm(data: {
  name: unknown;
  email: unknown;
  phone?: unknown;
  message: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!validateName(String(data.name))) {
    errors.push({ field: 'name', message: 'Name must be 2-100 characters' });
  }

  if (!validateEmail(String(data.email))) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (data.phone && !validatePhone(String(data.phone))) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  if (!validateMessage(String(data.message))) {
    errors.push({ field: 'message', message: 'Message must be 10-5000 characters' });
  }

  return errors;
}

/**
 * Validates marketplace listing form
 */
export function validateListingForm(data: {
  title: unknown;
  description: unknown;
  price?: unknown;
  location: unknown;
  phone?: unknown;
  email?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!validateTitle(String(data.title))) {
    errors.push({ field: 'title', message: 'Title must be 1-200 characters' });
  }

  if (!validateDescription(String(data.description))) {
    errors.push({ field: 'description', message: 'Description must be 10-5000 characters' });
  }

  if (data.price && !validatePrice(data.price)) {
    errors.push({ field: 'price', message: 'Please enter a valid price' });
  }

  if (!validateLocation(String(data.location))) {
    errors.push({ field: 'location', message: 'Location must be 2-100 characters' });
  }

  if (data.phone && !validatePhone(String(data.phone))) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  if (data.email && !validateEmail(String(data.email))) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return errors;
}

/**
 * Validates professional registration form
 */
export function validateProfessionalForm(data: {
  name: unknown;
  specialty: unknown;
  location: unknown;
  phone?: unknown;
  email?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!validateName(String(data.name))) {
    errors.push({ field: 'name', message: 'Name must be 2-100 characters' });
  }

  if (!validateSpecialty(String(data.specialty))) {
    errors.push({
      field: 'specialty',
      message: 'Please select a valid specialty',
    });
  }

  if (!validateLocation(String(data.location))) {
    errors.push({ field: 'location', message: 'Location must be 2-100 characters' });
  }

  if (data.phone && !validatePhone(String(data.phone))) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  if (data.email && !validateEmail(String(data.email))) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return errors;
}

/**
 * Validates newsletter subscription
 */
export function validateEmailSubscription(email: unknown): ValidationError[] {
  if (!validateEmail(String(email))) {
    return [{ field: 'email', message: 'Please enter a valid email address' }];
  }
  return [];
}
