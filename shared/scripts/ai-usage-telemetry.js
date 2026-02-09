(function() {
  'use strict';

  var STORAGE_KEY = 'telemetry-ai-usage-events-v1';
  var MAX_EVENTS = 3000;
  var DEDUPE_WINDOW_MS = 1500;

  function toText(value, maxLen) {
    return String(value || '').trim().slice(0, maxLen || 200);
  }

  function toAction(value) {
    var action = toText(value, 40).toLowerCase();
    return action || 'use';
  }

  function toType(value) {
    return value === 'asset' ? 'asset' : 'prompt';
  }

  function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function periodFromTimestamp(ts) {
    var d = new Date(ts);
    var year = d.getFullYear();
    var week = getWeekNumber(d);
    return year + '-W' + String(week).padStart(2, '0');
  }

  function readEvents() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeEvents(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // Ignore quota/storage errors; telemetry should never break UX.
    }
  }

  function emit(event) {
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('ai_usage_event', {
        usage_type: event.type,
        usage_action: event.action,
        ref_id: event.refId,
        period: event.period
      });
    }
  }

  function logEvent(meta) {
    var ts = Date.now();
    var event = {
      ts: ts,
      period: periodFromTimestamp(ts),
      type: toType(meta && meta.type),
      action: toAction(meta && meta.action),
      refId: toText(meta && (meta.refId || meta.id), 120),
      title: toText(meta && meta.title, 200),
      stage: toText(meta && meta.stage, 80),
      source: toText(meta && meta.source, 80) || window.location.pathname
    };

    if (!event.refId) return false;

    var list = readEvents();
    var latest = list[0];
    if (latest &&
        latest.refId === event.refId &&
        latest.type === event.type &&
        latest.action === event.action &&
        Math.abs(event.ts - (latest.ts || 0)) <= DEDUPE_WINDOW_MS) {
      return false;
    }

    list.unshift(event);
    if (list.length > MAX_EVENTS) list.length = MAX_EVENTS;
    writeEvents(list);
    emit(event);
    return true;
  }

  function logPromptUsage(meta) {
    return logEvent({
      type: 'prompt',
      action: (meta && meta.action) || 'copy',
      refId: meta && (meta.refId || meta.id),
      title: meta && meta.title,
      stage: meta && meta.stage,
      source: (meta && meta.source) || '/prompts/'
    });
  }

  function logAssetUsage(meta) {
    return logEvent({
      type: 'asset',
      action: (meta && meta.action) || 'copy',
      refId: meta && (meta.refId || meta.id),
      title: meta && meta.title,
      stage: meta && meta.stage,
      source: (meta && meta.source) || '/library/'
    });
  }

  window.AIUsageTelemetry = {
    storageKey: STORAGE_KEY,
    logEvent: logEvent,
    logPromptUsage: logPromptUsage,
    logAssetUsage: logAssetUsage,
    getEvents: readEvents
  };
})();
