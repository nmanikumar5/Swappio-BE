import escapeStringRegexp from 'escape-string-regexp';

/**
 * Sanitize string input for safe use in MongoDB queries
 * Prevents NoSQL injection by removing special characters
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  // Remove special MongoDB operators and null bytes
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
};

// export function sanitize(str = "") {
//   return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

/**
 * Sanitize query object for MongoDB
 * Removes potentially dangerous operators from nested objects
 */
export const sanitizeQuery = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized: any = {};
  for (const key in obj) {
    // Skip MongoDB operators (keys starting with $)
    if (key.startsWith('$')) continue;

    const value = obj[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Escape string for safe use in regular expressions
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 */
export const escapeRegex = (str: string): string => {
  return escapeStringRegexp(str);
};

/**
 * Create a safe case-insensitive regex from user input
 */
export const createSafeRegex = (str: string): RegExp => {
  return new RegExp(escapeRegex(str), 'i');
};
