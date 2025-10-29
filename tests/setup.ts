import '@testing-library/jest-dom';

// Polyfill for jsdom - Radix UI compatibility
// Radix UI components use pointer capture APIs that jsdom doesn't implement
// Only apply these polyfills if Element is defined (jsdom environment for component tests)
if (typeof Element !== 'undefined') {
  if (typeof Element.prototype.hasPointerCapture === 'undefined') {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
  }

  if (typeof Element.prototype.setPointerCapture === 'undefined') {
    Element.prototype.setPointerCapture = function () {
      // noop
    };
  }

  if (typeof Element.prototype.releasePointerCapture === 'undefined') {
    Element.prototype.releasePointerCapture = function () {
      // noop
    };
  }

  // Polyfill for scrollIntoView - used by Radix UI Select
  if (typeof Element.prototype.scrollIntoView === 'undefined') {
    Element.prototype.scrollIntoView = function () {
      // noop
    };
  }
}
