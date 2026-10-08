import DOMPurify from 'dompurify';

let hooksRegistered = false;

function registerHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  // Force links to open in a new tab without giving the target access to window.opener.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Sanitize untrusted HTML (e.g. fetched newsletter content) before rendering it
 * with dangerouslySetInnerHTML. Strips scripts, event-handler attributes and
 * javascript: URLs while keeping regular markup.
 *
 * DOMPurify needs a DOM, so outside the browser this returns an empty string
 * rather than passing unsanitized HTML through.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined' || !DOMPurify.isSupported) {
    return '';
  }
  registerHooks();
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
