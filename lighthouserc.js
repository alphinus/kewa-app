// lighthouserc.js
// Lighthouse CI configuration for automated performance testing
// Thresholds: Performance >= 75, LCP < 4000ms, CLS < 0.1, TTI < 7000ms
module.exports = {
  ci: {
    collect: {
      // Start with login page only for CI (unauthenticated)
      // Authenticated pages require local script with Puppeteer
      url: ['http://localhost:3000/login'],
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 60000,
      settings: {
        chromeFlags: '--disable-gpu --no-sandbox --headless',
        onlyCategories: ['performance'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.75 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'interactive': ['warn', { maxNumericValue: 7000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
