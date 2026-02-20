/**
 * Ramzinex API client. Public endpoints only for prices/orderbook (no auth).
 * Endpoints: GET pairs, GET orderbooks/{id}/buys_sells.
 */
(function(global) {
  'use strict';
  var C = global.RamzinexConfig || {};
  var BASE = (C.API_BASE || 'https://publicapi.ramzinex.com').replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:' && window.location.host) {
    BASE = window.location.origin + '/api/ramzinex';
  }
  var API_KEY = C.API_KEY || '';

  function fetchApi(path, opts) {
    var url = BASE + path;
    var headers = { 'Cache-Control': 'no-store' };
    if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;
    return fetch(url, Object.assign({ cache: 'no-store', headers: headers }, opts || {}));
  }

  /**
   * Fetch all pairs; returns { stats: { 'btc-rls': { bestBuy, bestSell, latest, dayChange, volumeDst }, ... }, pairIds: { 'btc-rls': 272, ... } }.
   */
  function fetchMarkets() {
    return fetchApi('/exchange/api/v1.0/exchange/pairs').then(function(r) { return r.json(); }).then(function(d) {
      var list = d.data || d.result && d.result.data || [];
      var stats = {};
      var pairIds = {};
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var base = typeof p.base_currency_symbol === 'string' ? p.base_currency_symbol.toLowerCase() : (p.base_currency_symbol && (p.base_currency_symbol.en || p.base_currency_symbol.fa)) ? String(p.base_currency_symbol.en || p.base_currency_symbol.fa).toLowerCase() : '';
        var q = typeof p.quote_currency_symbol === 'string' ? p.quote_currency_symbol.toLowerCase() : (p.quote_currency_symbol && (p.quote_currency_symbol.en || p.quote_currency_symbol.fa)) ? String(p.quote_currency_symbol.en || p.quote_currency_symbol.fa).toLowerCase() : '';
        var quote = (q === 'irr' || q === 'irt' || q === 'rial') ? 'rls' : (q === 'usdt' ? 'usdt' : q);
        if (!base || !quote) continue;
        var pairKey = base + '-' + quote;
        var buy = parseFloat(p.buy);
        var sell = parseFloat(p.sell);
        var fin = p.financial && p.financial.last24h;
        var change = fin && fin.change_percent != null ? parseFloat(fin.change_percent) : '';
        var vol = fin && fin.quote_volume != null ? parseFloat(fin.quote_volume) : 0;
        stats[pairKey] = {
          bestBuy: buy,
          bestSell: sell,
          latest: sell || buy,
          dayChange: change !== '' ? String(change) : '',
          volumeDst: vol
        };
        if (p.pair_id != null) pairIds[pairKey] = p.pair_id;
      }
      return { stats: stats, pairIds: pairIds };
    });
  }

  /**
   * Fetch orderbook for pair_id. Returns { asks: [[price,amount],...], bids: [[price,amount],...], lastTradePrice }.
   */
  function fetchOrderbook(pairId) {
    return fetchApi('/exchange/api/v1.0/exchange/orderbooks/' + Number(pairId) + '/buys_sells').then(function(r) { return r.json(); }).then(function(d) {
      var data = d.data || d;
      var sells = (data.sells || []).slice(0, 50).map(function(x) { return [String(x[0]), parseFloat(x[1]) || 0]; });
      var buys = (data.buys || []).slice(0, 50).map(function(x) { return [String(x[0]), parseFloat(x[1]) || 0]; });
      var last = (sells[0] && sells[0][0]) || (buys[0] && buys[0][0]);
      return { status: 'ok', asks: sells, bids: buys, lastTradePrice: last };
    });
  }

  global.RamzinexApi = {
    fetch: fetchApi,
    fetchMarkets: fetchMarkets,
    fetchOrderbook: fetchOrderbook
  };
})(typeof window !== 'undefined' ? window : this);
