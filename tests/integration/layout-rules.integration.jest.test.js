const {
  deriveViewportFlags,
  is24hNumeralVisible,
  is12hNumeralVisible,
  getBezelLabelLayout
} = require('../../assets/js/clock-utils.js');

function visible24hNumerals(flags) {
  const out = [];
  for (let n = 1; n <= 24; n++) {
    if (is24hNumeralVisible(n, flags.isSmall, flags.isXSmall)) out.push(n);
  }
  return out;
}

function visible12hNumerals(flags) {
  const out = [];
  for (let n = 1; n <= 12; n++) {
    if (is12hNumeralVisible(n, flags.isXSmall)) out.push(n);
  }
  return out;
}

describe('integration: viewport tier drives numeral density + bezel placement', () => {
  test('small tier keeps even 24h numerals and all 12h numerals', () => {
    const flags = deriveViewportFlags(260, 300, 220);
    expect(flags.tier).toBe('small');
    expect(visible24hNumerals(flags)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
    expect(visible12hNumerals(flags)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test('xsmall tier keeps sparse numerals and pushes bezel labels outside', () => {
    const flags = deriveViewportFlags(190, 300, 220);
    expect(flags.tier).toBe('xsmall');
    expect(visible24hNumerals(flags)).toEqual([4, 8, 12, 16, 20, 24]);
    expect(visible12hNumerals(flags)).toEqual([3, 6, 9, 12]);

    const layout = getBezelLabelLayout(120, 56, flags.isSmall, flags.isXSmall);
    expect(layout.bezelRadius).toBeGreaterThan(120);
    expect(layout.bezelRadius).toBe(126);
    expect(layout.fontSize).toBe(9);
  });

  test('medium tier keeps full numeral set and inner bezel placement', () => {
    const flags = deriveViewportFlags(520, 300, 220);
    expect(flags.tier).toBe('medium');
    expect(visible24hNumerals(flags).length).toBe(24);
    expect(visible12hNumerals(flags).length).toBe(12);

    const layout = getBezelLabelLayout(200, 93.6, flags.isSmall, flags.isXSmall);
    expect(layout.bezelRadius).toBeLessThan(200);
    expect(layout.fontSize).toBe(13);
  });
});
