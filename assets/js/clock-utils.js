(function (root, factory) {
  const utils = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = utils;
  }
  root.ClockUtils = Object.assign({}, root.ClockUtils || {}, utils);
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function deriveViewportFlags(size, smallBreakpoint, xsmallBreakpoint) {
    const isXSmall = size < xsmallBreakpoint;
    const isSmall = size < smallBreakpoint;
    const tier = isXSmall ? 'xsmall' : (isSmall ? 'small' : 'medium');
    return { isSmall, isXSmall, tier };
  }

  function is24hNumeralVisible(hour, isSmall, isXSmall) {
    if (isXSmall) return hour % 4 === 0;
    if (isSmall) return hour % 2 === 0;
    return true;
  }

  function is12hNumeralVisible(hour, isXSmall) {
    if (!isXSmall) return true;
    return hour % 3 === 0;
  }

  function get24hNumeralStyle(radius, isSmall, isXSmall) {
    return {
      fontSize: isXSmall ? radius * 0.16 : (isSmall ? radius * 0.14 : radius * 0.09),
      numeralRadius: isXSmall ? radius * 0.84 : (isSmall ? radius * 0.88 : radius * 0.76)
    };
  }

  function get12hNumeralStyle(radius, isSmall, isXSmall) {
    return {
      fontSize: isXSmall ? radius * 0.2 : (isSmall ? radius * 0.18 : radius * 0.14),
      numeralRadius: isXSmall ? radius * 0.82 : (isSmall ? radius * 0.85 : radius * 0.72)
    };
  }

  function getBezelLabelLayout(radius, handLength, isSmall, isXSmall) {
    return {
      fontSize: isXSmall ? 10 : (isSmall ? 12 : 13),
      bezelRadius: isXSmall
        ? (radius + 12)
        : Math.min(radius * 0.62, handLength + (isSmall ? 14 : 18))
    };
  }

  function getBezelLabelOffsets(count, spacing) {
    if (count <= 1) return [0];
    const gap = Number(spacing) || 0;
    return [-gap / 2, gap / 2];
  }

  function getHourHandValue(timeParts, use24h) {
    const hour = use24h ? timeParts.h24 : timeParts.h;
    const minute = Number(timeParts.m) || 0;
    return hour + (minute / 60);
  }

  function getZoneGroupKey(timeParts, use24h) {
    const hour = use24h ? timeParts.h24 : timeParts.h;
    return `${hour}:${String(timeParts.m).padStart(2, '0')}`;
  }

  function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const toRadians = (value) => value * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
      * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
  }

  function findNearestCity(lat, lon, catalog) {
    if (!Array.isArray(catalog) || catalog.length === 0) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    let best = null;
    let bestDistance = Infinity;
    for (const city of catalog) {
      if (!Number.isFinite(city?.lat) || !Number.isFinite(city?.lon)) continue;
      const distance = haversineDistanceKm(lat, lon, city.lat, city.lon);
      if (distance < bestDistance) {
        best = city;
        bestDistance = distance;
      }
    }
    return best;
  }

  return {
    deriveViewportFlags,
    is24hNumeralVisible,
    is12hNumeralVisible,
    get24hNumeralStyle,
    get12hNumeralStyle,
    getBezelLabelLayout,
    getBezelLabelOffsets,
    getHourHandValue,
    getZoneGroupKey,
    findNearestCity
  };
});
