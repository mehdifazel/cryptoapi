/**
 * Ramzinex exchange configuration.
 * API: https://publicapi.ramzinex.com (public); https://docs.ramzinex.com/
 */
(function(global) {
  'use strict';
  global.RamzinexConfig = {
    API_BASE: 'https://publicapi.ramzinex.com',
    API_KEY: '', // optional; set if your key is required for public endpoints
    SETUP_DELAY_MS: 250,
    USDT_AVG_THROTTLE_MS: 12000,
    TV_INTERVAL_MS: 5000,
    SETUP_INTERVAL_MS: 5000,
    REST_POLL_MS: 5000,
    MT_DEFAULT: 1e9,
    TV_SOURCE: 'binance'
  };
})(typeof window !== 'undefined' ? window : this);
