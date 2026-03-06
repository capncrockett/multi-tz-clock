const {
  deriveViewportFlags,
  is24hNumeralVisible,
  is12hNumeralVisible,
  get24hNumeralStyle,
  get12hNumeralStyle,
  getBezelLabelLayout
} = require('../../assets/js/clock-utils.js');

describe('clock-utils: viewport tiers', () => {
  test('deriveViewportFlags resolves xsmall/small/medium', () => {
    expect(deriveViewportFlags(180, 300, 220)).toEqual({
      isSmall: true,
      isXSmall: true,
      tier: 'xsmall'
    });
    expect(deriveViewportFlags(260, 300, 220)).toEqual({
      isSmall: true,
      isXSmall: false,
      tier: 'small'
    });
    expect(deriveViewportFlags(420, 300, 220)).toEqual({
      isSmall: false,
      isXSmall: false,
      tier: 'medium'
    });
  });
});

describe('clock-utils: numeral visibility rules', () => {
  test('24h visibility reduces density by tier', () => {
    expect(is24hNumeralVisible(3, false, false)).toBe(true);
    expect(is24hNumeralVisible(3, true, false)).toBe(false);
    expect(is24hNumeralVisible(4, true, false)).toBe(true);
    expect(is24hNumeralVisible(8, true, true)).toBe(true);
    expect(is24hNumeralVisible(6, true, true)).toBe(false);
  });

  test('12h visibility keeps all except xsmall quarter markers', () => {
    expect(is12hNumeralVisible(5, false)).toBe(true);
    expect(is12hNumeralVisible(6, true)).toBe(true);
    expect(is12hNumeralVisible(5, true)).toBe(false);
  });
});

describe('clock-utils: sizing/layout helpers', () => {
  test('24h and 12h numeral style scales by tier', () => {
    const medium24 = get24hNumeralStyle(200, false, false);
    const small24 = get24hNumeralStyle(200, true, false);
    const xsmall24 = get24hNumeralStyle(200, true, true);
    expect(medium24.fontSize).toBeCloseTo(18);
    expect(small24.fontSize).toBeCloseTo(28);
    expect(xsmall24.fontSize).toBeCloseTo(32);

    const medium12 = get12hNumeralStyle(200, false, false);
    const small12 = get12hNumeralStyle(200, true, false);
    const xsmall12 = get12hNumeralStyle(200, true, true);
    expect(medium12.fontSize).toBeCloseTo(28);
    expect(small12.fontSize).toBeCloseTo(36);
    expect(xsmall12.fontSize).toBeCloseTo(40);
  });

  test('bezel label layout moves outside on xsmall', () => {
    const medium = getBezelLabelLayout(150, 70, false, false);
    const small = getBezelLabelLayout(150, 70, true, false);
    const xsmall = getBezelLabelLayout(150, 70, true, true);

    expect(medium.fontSize).toBe(13);
    expect(small.fontSize).toBe(12);
    expect(xsmall.fontSize).toBe(10);

    expect(medium.bezelRadius).toBeLessThanOrEqual(150 * 0.62);
    expect(small.bezelRadius).toBeLessThanOrEqual(150 * 0.62);
    expect(xsmall.bezelRadius).toBe(162);
  });
});
