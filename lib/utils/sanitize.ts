import DOMPurify from 'dompurify';
import { formatProperName } from '@/lib/utils/proper-name';
import { countryCodes, getCountryCodeByName } from '@/lib/data/country-codes';

// Configuration for DOMPurify
const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
};

// Sanitize text input
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  // Basic string sanitization
  let sanitized = input.trim();

  // Remove any potential script content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  return sanitized;
}

// Sanitize HTML content (if needed for rich text)
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, CONFIG);
}

// Validate and sanitize name
export function sanitizeName(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  // Allow only letters, spaces, hyphens, apostrophes, dots, commas, and parentheses
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s\-\'\.\,\(\)]+$/;

  if (!nameRegex.test(sanitized)) {
    throw new Error('Format nama tidak valid. Hanya perbolehkan huruf, spasi, tanda hubung (-), kutip (\'), titik (.), koma (,), dan kurung ().');
  }

  const formatted = formatProperName(sanitized);

  // Limit length
  if (formatted.length > 100) {
    throw new Error('Name too long');
  }

  return formatted;
}

// Validate and sanitize email
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input.toLowerCase());

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  // Limit length
  if (sanitized.length > 254) {
    throw new Error('Email too long');
  }

  return sanitized;
}

const sortedCountryCodes = [...countryCodes].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

export function sanitizePhone(input: string | null | undefined, countryCode?: string): string {
  if (!input) return '';

  // Remove all non-digit characters except + and -
  let sanitized = input.replace(/[^\d\+\-\s\(\)]/g, '');

  // Remove spaces and formatting characters for processing
  sanitized = sanitized.replace(/[\s\-\(\)]/g, '');

  // If input already starts with + and has a country code, validate it
  if (sanitized.startsWith('+')) {
    // Try to find a matching country code by checking all possible dial codes (longest prefix first)
    let matchingCountry = null;
    for (const country of sortedCountryCodes) {
      if (sanitized.startsWith(country.dialCode)) {
        matchingCountry = country;
        break;
      }
    }

    if (!matchingCountry) {
      throw new Error('Kode negara tidak valid. Format: ID +62 [nomor telepon]');
    }

    // Check if it matches the selected country
    if (countryCode) {
      const selectedCountry = getCountryCodeByName(countryCode);
      if (selectedCountry && matchingCountry.dialCode !== selectedCountry.dialCode) {
        throw new Error(`Kode negara (${matchingCountry.dialCode}) tidak cocok dengan negara yang dipilih (${selectedCountry.dialCode})`);
      }
    }
  } else if (countryCode) {
    // If no country code in input but country is selected, add it
    const country = getCountryCodeByName(countryCode);
    if (country) {
      sanitized = country.dialCode + sanitized;
    }
  } else {
    // Default to adding + if no country code at all
    sanitized = '+' + sanitized;
  }

  // Validate phone number format - should start with + followed by 8-15 digits
  const phoneRegex = /^\+\d{8,15}$/;

  if (!phoneRegex.test(sanitized)) {
    throw new Error('Format nomor telepon tidak valid. Format: ID +62 [nomor telepon]');
  }

  return sanitized;
}

export function validatePhoneNumberFormat(phoneNumber: string, countryCode?: string): boolean {
  try {
    const sanitized = sanitizePhone(phoneNumber, countryCode);

    // Basic validation: should be 8-15 digits after +
    const digits = sanitized.substring(1);
    if (digits.length < 8 || digits.length > 15) {
      return false;
    }

    // If country code is specified, validate specific format
    if (countryCode) {
      const country = getCountryCodeByName(countryCode);
      if (country) {
        // Check if phone number starts with correct country code
        if (!sanitized.startsWith(country.dialCode)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Validate and sanitize address
export function sanitizeAddress(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  // Limit length
  if (sanitized.length > 500) {
    throw new Error('Address too long');
  }

  // Remove any URL or link attempts
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const sanitizedAddress = sanitized.replace(urlRegex, '');

  return sanitizedAddress;
}

// Validate and sanitize city/province
export function sanitizeCity(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  // Limit length
  if (sanitized.length > 100) {
    throw new Error('City name too long');
  }

  // Allow letters, spaces, and common punctuation
  const cityRegex = /^[a-zA-Z\u00C0-\u024F\s\-\.,\(\)]+$/;

  if (!cityRegex.test(sanitized)) {
    throw new Error('Invalid city format');
  }

  return sanitized;
}

// Sanitize UUID
export function sanitizeUUID(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  // UUID v4 regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(sanitized)) {
    throw new Error('Invalid UUID format');
  }

  return sanitized;
}

// Sanitize textarea content
export function sanitizeTextarea(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  // Limit length
  if (sanitized.length > 2000) {
    throw new Error('Content too long');
  }

  return sanitized;
}

// Generic sanitization for other fields
export function sanitizeGeneric(input: string | null | undefined, maxLength: number = 255): string {
  if (!input) return '';

  const sanitized = sanitizeText(input);

  if (sanitized.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength}`);
  }

  return sanitized;
}
