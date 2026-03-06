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

  return {
    deriveViewportFlags,
    is24hNumeralVisible,
    is12hNumeralVisible,
    get24hNumeralStyle,
    get12hNumeralStyle,
    getBezelLabelLayout
  };
});
