import DOMPurify from 'dompurify';

export const sanitizeHtml = (input, options = {}) => {
  const raw = typeof input === 'string' ? input : String(input ?? '');
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ...options,
  });
};

export default sanitizeHtml;
