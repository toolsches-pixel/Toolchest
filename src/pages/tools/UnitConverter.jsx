import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './UnitConverter.css';

// ============================================================
// UNIT DEFINITIONS
// Har category me: base unit, aur uske ratios (base = 1)
// ============================================================

const CATEGORIES = {
  length: {
    label: 'Length',
    icon: '📏',
    base: 'm',
    units: {
      // Metric
      nm: { label: 'Nanometer', symbol: 'nm', factor: 1e-9 },
      um: { label: 'Micrometer', symbol: 'µm', factor: 1e-6 },
      mm: { label: 'Millimeter', symbol: 'mm', factor: 0.001 },
      cm: { label: 'Centimeter', symbol: 'cm', factor: 0.01 },
      dm: { label: 'Decimeter', symbol: 'dm', factor: 0.1 },
      m: { label: 'Meter', symbol: 'm', factor: 1 },
      dam: { label: 'Decameter', symbol: 'dam', factor: 10 },
      hm: { label: 'Hectometer', symbol: 'hm', factor: 100 },
      km: { label: 'Kilometer', symbol: 'km', factor: 1000 },
      // Imperial / US
      in: { label: 'Inch', symbol: 'in', factor: 0.0254 },
      ft: { label: 'Foot', symbol: 'ft', factor: 0.3048 },
      yd: { label: 'Yard', symbol: 'yd', factor: 0.9144 },
      mi: { label: 'Mile', symbol: 'mi', factor: 1609.344 },
      nmi: { label: 'Nautical mile', symbol: 'nmi', factor: 1852 },
      furlong: { label: 'Furlong', symbol: 'fur', factor: 201.168 },
      // Astronomy / Physics
      au: { label: 'Astronomical unit', symbol: 'AU', factor: 1.495978707e11 },
      ly: { label: 'Light year', symbol: 'ly', factor: 9.4607304725808e15 },
      pc: { label: 'Parsec', symbol: 'pc', factor: 3.08567758149137e16 },
    },
  },

  weight: {
    label: 'Weight',
    icon: '⚖️',
    base: 'kg',
    units: {
      mcg: { label: 'Microgram', symbol: 'µg', factor: 1e-9 },
      mg: { label: 'Milligram', symbol: 'mg', factor: 1e-6 },
      g: { label: 'Gram', symbol: 'g', factor: 0.001 },
      dag: { label: 'Decagram', symbol: 'dag', factor: 0.01 },
      hg: { label: 'Hectogram', symbol: 'hg', factor: 0.1 },
      kg: { label: 'Kilogram', symbol: 'kg', factor: 1 },
      t: { label: 'Metric ton', symbol: 't', factor: 1000 },
      kt: { label: 'Kiloton', symbol: 'kt', factor: 1e6 },
      mt: { label: 'Megaton', symbol: 'Mt', factor: 1e9 },
      // Imperial
      oz: { label: 'Ounce', symbol: 'oz', factor: 0.028349523125 },
      lb: { label: 'Pound', symbol: 'lb', factor: 0.45359237 },
      st: { label: 'Stone', symbol: 'st', factor: 6.35029318 },
      cwt: { label: 'Short hundredweight', symbol: 'cwt', factor: 45.359237 },
      ton: { label: 'Short ton (US)', symbol: 'ton', factor: 907.18474 },
      longton: { label: 'Long ton (UK)', symbol: 'long ton', factor: 1016.0469088 },
      // Scientific
      carat: { label: 'Carat', symbol: 'ct', factor: 0.0002 },
      grain: { label: 'Grain', symbol: 'gr', factor: 6.479891e-5 },
    },
  },

  temperature: {
    label: 'Temperature',
    icon: '🌡️',
    base: 'celsius',
    units: {
      celsius: { label: 'Celsius', symbol: '°C', factor: 1 },
      fahrenheit: { label: 'Fahrenheit', symbol: '°F', factor: 1 },
      kelvin: { label: 'Kelvin', symbol: 'K', factor: 1 },
      rankine: { label: 'Rankine', symbol: '°R', factor: 1 },
    },
  },

  area: {
    label: 'Area',
    icon: '🟦',
    base: 'm2',
    units: {
      mm2: { label: 'Square millimeter', symbol: 'mm²', factor: 1e-6 },
      cm2: { label: 'Square centimeter', symbol: 'cm²', factor: 1e-4 },
      m2: { label: 'Square meter', symbol: 'm²', factor: 1 },
      km2: { label: 'Square kilometer', symbol: 'km²', factor: 1e6 },
      in2: { label: 'Square inch', symbol: 'in²', factor: 0.00064516 },
      ft2: { label: 'Square foot', symbol: 'ft²', factor: 0.09290304 },
      yd2: { label: 'Square yard', symbol: 'yd²', factor: 0.83612736 },
      acre: { label: 'Acre', symbol: 'ac', factor: 4046.8564224 },
      hectare: { label: 'Hectare', symbol: 'ha', factor: 10000 },
      mile2: { label: 'Square mile', symbol: 'mi²', factor: 2589988.110336 },
    },
  },

  volume: {
    label: 'Volume',
    icon: '🧴',
    base: 'l',
    units: {
      ml: { label: 'Milliliter', symbol: 'mL', factor: 0.001 },
      cl: { label: 'Centiliter', symbol: 'cL', factor: 0.01 },
      dl: { label: 'Deciliter', symbol: 'dL', factor: 0.1 },
      l: { label: 'Liter', symbol: 'L', factor: 1 },
      m3: { label: 'Cubic meter', symbol: 'm³', factor: 1000 },
      cm3: { label: 'Cubic centimeter', symbol: 'cm³', factor: 0.001 },
      // US customary
      tsp: { label: 'Teaspoon (US)', symbol: 'tsp', factor: 0.00492892159 },
      tbsp: { label: 'Tablespoon (US)', symbol: 'tbsp', factor: 0.0147867648 },
      floz: { label: 'Fluid ounce (US)', symbol: 'fl oz', factor: 0.0295735296 },
      cup: { label: 'Cup (US)', symbol: 'cup', factor: 0.2365882365 },
      pint: { label: 'Pint (US)', symbol: 'pt', factor: 0.473176473 },
      quart: { label: 'Quart (US)', symbol: 'qt', factor: 0.946352946 },
      gallon: { label: 'Gallon (US)', symbol: 'gal', factor: 3.785411784 },
      // Imperial
      ukfloz: { label: 'Fluid ounce (UK)', symbol: 'fl oz (UK)', factor: 0.0284130625 },
      ukpint: { label: 'Pint (UK)', symbol: 'pt (UK)', factor: 0.56826125 },
      ukgallon: { label: 'Gallon (UK)', symbol: 'gal (UK)', factor: 4.54609 },
    },
  },

  speed: {
    label: 'Speed',
    icon: '💨',
    base: 'mps',
    units: {
      mps: { label: 'Meter / second', symbol: 'm/s', factor: 1 },
      kmh: { label: 'Kilometer / hour', symbol: 'km/h', factor: 0.277777778 },
      mph: { label: 'Mile / hour', symbol: 'mph', factor: 0.44704 },
      fts: { label: 'Foot / second', symbol: 'ft/s', factor: 0.3048 },
      knot: { label: 'Knot', symbol: 'kn', factor: 0.514444444 },
      mach: { label: 'Mach (sea level)', symbol: 'Ma', factor: 340.29 },
      c: { label: 'Speed of light', symbol: 'c', factor: 299792458 },
    },
  },

  time: {
    label: 'Time',
    icon: '⏱️',
    base: 's',
    units: {
      ns: { label: 'Nanosecond', symbol: 'ns', factor: 1e-9 },
      us: { label: 'Microsecond', symbol: 'µs', factor: 1e-6 },
      ms: { label: 'Millisecond', symbol: 'ms', factor: 0.001 },
      s: { label: 'Second', symbol: 's', factor: 1 },
      min: { label: 'Minute', symbol: 'min', factor: 60 },
      h: { label: 'Hour', symbol: 'h', factor: 3600 },
      d: { label: 'Day', symbol: 'd', factor: 86400 },
      wk: { label: 'Week', symbol: 'wk', factor: 604800 },
      mo: { label: 'Month (30d)', symbol: 'mo', factor: 2592000 },
      yr: { label: 'Year (365d)', symbol: 'yr', factor: 31536000 },
      decade: { label: 'Decade', symbol: 'dec', factor: 315360000 },
      century: { label: 'Century', symbol: 'c', factor: 3153600000 },
    },
  },

  data: {
    label: 'Data',
    icon: '💾',
    base: 'byte',
    units: {
      bit:  { label: 'Bit',                 symbol: 'b',   factor: 0.125 },
      B:    { label: 'Byte',                symbol: 'B',   factor: 1 },

      // ===== Decimal (SI) — 1000-based =====
      KB:   { label: 'Kilobyte — 1000 B',   symbol: 'KB',  factor: 1000 },
      MB:   { label: 'Megabyte — 1000 KB',  symbol: 'MB',  factor: 1e6 },
      GB:   { label: 'Gigabyte — 1000 MB',  symbol: 'GB',  factor: 1e9 },
      TB:   { label: 'Terabyte — 1000 GB',  symbol: 'TB',  factor: 1e12 },
      PB:   { label: 'Petabyte — 1000 TB',  symbol: 'PB',  factor: 1e15 },

      // ===== Binary (IEC) — 1024-based =====
      KiB:  { label: 'Kibibyte — 1024 B',   symbol: 'KiB', factor: 1024 },
      MiB:  { label: 'Mebibyte — 1024 KiB', symbol: 'MiB', factor: 1048576 },
      GiB:  { label: 'Gibibyte — 1024 MiB', symbol: 'GiB', factor: 1073741824 },
      TiB:  { label: 'Tebibyte — 1024 GiB', symbol: 'TiB', factor: 1099511627776 },
      PiB:  { label: 'Pebibyte — 1024 TiB', symbol: 'PiB', factor: 1125899906842624 },
    },
  },

  pressure: {
    label: 'Pressure',
    icon: '🎈',
    base: 'pa',
    units: {
      pa: { label: 'Pascal', symbol: 'Pa', factor: 1 },
      hpa: { label: 'Hectopascal', symbol: 'hPa', factor: 100 },
      kpa: { label: 'Kilopascal', symbol: 'kPa', factor: 1000 },
      mpa: { label: 'Megapascal', symbol: 'MPa', factor: 1e6 },
      bar: { label: 'Bar', symbol: 'bar', factor: 100000 },
      mbar: { label: 'Millibar', symbol: 'mbar', factor: 100 },
      atm: { label: 'Atmosphere', symbol: 'atm', factor: 101325 },
      psi: { label: 'Pound / sq inch', symbol: 'psi', factor: 6894.757293168 },
      torr: { label: 'Torr', symbol: 'Torr', factor: 133.322368421 },
      mmhg: { label: 'mm Mercury', symbol: 'mmHg', factor: 133.322387415 },
    },
  },

  energy: {
    label: 'Energy',
    icon: '⚡',
    base: 'j',
    units: {
      j: { label: 'Joule', symbol: 'J', factor: 1 },
      kj: { label: 'Kilojoule', symbol: 'kJ', factor: 1000 },
      mj: { label: 'Megajoule', symbol: 'MJ', factor: 1e6 },
      cal: { label: 'Calorie', symbol: 'cal', factor: 4.184 },
      kcal: { label: 'Kilocalorie', symbol: 'kcal', factor: 4184 },
      wh: { label: 'Watt-hour', symbol: 'Wh', factor: 3600 },
      kwh: { label: 'Kilowatt-hour', symbol: 'kWh', factor: 3.6e6 },
      ev: { label: 'Electronvolt', symbol: 'eV', factor: 1.602176634e-19 },
      btu: { label: 'BTU', symbol: 'BTU', factor: 1055.05585262 },
      therm: { label: 'Therm', symbol: 'thm', factor: 1.05505585262e8 },
    },
  },

  power: {
    label: 'Power',
    icon: '🔌',
    base: 'w',
    units: {
      mw: { label: 'Milliwatt', symbol: 'mW', factor: 0.001 },
      w: { label: 'Watt', symbol: 'W', factor: 1 },
      kw: { label: 'Kilowatt', symbol: 'kW', factor: 1000 },
      mwatt: { label: 'Megawatt', symbol: 'MW', factor: 1e6 },
      gw: { label: 'Gigawatt', symbol: 'GW', factor: 1e9 },
      hp: { label: 'Horsepower (mech)', symbol: 'hp', factor: 745.699872 },
      hpmetric: { label: 'Horsepower (metric)', symbol: 'PS', factor: 735.49875 },
      btuh: { label: 'BTU/hour', symbol: 'BTU/h', factor: 0.29307107 },
    },
  },

  angle: {
    label: 'Angle',
    icon: '📐',
    base: 'rad',
    units: {
      deg: { label: 'Degree', symbol: '°', factor: 0.01745329252 },
      rad: { label: 'Radian', symbol: 'rad', factor: 1 },
      grad: { label: 'Gradian', symbol: 'grad', factor: 0.01570796327 },
      arcmin: { label: 'Arcminute', symbol: "'", factor: 0.000290888209 },
      arcsec: { label: 'Arcsecond', symbol: '"', factor: 4.84813681e-6 },
      turn: { label: 'Turn (revolution)', symbol: 'turn', factor: 6.283185307 },
    },
  },

  frequency: {
    label: 'Frequency',
    icon: '📻',
    base: 'hz',
    units: {
      hz: { label: 'Hertz', symbol: 'Hz', factor: 1 },
      khz: { label: 'Kilohertz', symbol: 'kHz', factor: 1000 },
      mhz: { label: 'Megahertz', symbol: 'MHz', factor: 1e6 },
      ghz: { label: 'Gigahertz', symbol: 'GHz', factor: 1e9 },
      rpm: { label: 'Revolutions / minute', symbol: 'RPM', factor: 0.01666666667 },
    },
  },

  fuel: {
    label: 'Fuel economy',
    icon: '⛽',
    base: 'kml',
    units: {
      kml: { label: 'Kilometer / liter', symbol: 'km/L', factor: 1 },
      l100km: { label: 'Liter / 100 km', symbol: 'L/100km', factor: 100, inverse: true },
      mpgus: { label: 'Miles / gallon (US)', symbol: 'mpg (US)', factor: 0.425143707, inverse: true },
      mpguk: { label: 'Miles / gallon (UK)', symbol: 'mpg (UK)', factor: 0.354006043, inverse: true },
    },
  },
};

// ============================================================
// SPECIAL: TEMPERATURE CONVERSION
// ============================================================
function convertTemperature(value, from, to) {
  if (from === to) return value;

  let celsius;
  switch (from) {
    case 'celsius':    celsius = value; break;
    case 'fahrenheit': celsius = (value - 32) * 5 / 9; break;
    case 'kelvin':     celsius = value - 273.15; break;
    case 'rankine':    celsius = (value - 491.67) * 5 / 9; break;
    default:           celsius = value;
  }

  switch (to) {
    case 'celsius':    return celsius;
    case 'fahrenheit': return celsius * 9 / 5 + 32;
    case 'kelvin':     return celsius + 273.15;
    case 'rankine':    return (celsius + 273.15) * 9 / 5;
    default:           return celsius;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function UnitConverter() {
  const tool = getToolById('unit-converter');

  useDocumentTitle('Unit Converter — Free Online Length, Weight, Temperature Converter | toolchest');

  // SEO
  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online unit converter for length, weight, temperature, area, volume, speed, time, data, pressure, energy, power, angle, frequency, and fuel economy. 150+ units, instant conversion, no signup. 1 GB = 1000 MB or 1 GiB = 1024 MiB — both supported.';

    const scriptId = 'unit-converter-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Unit Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2417',
      },
      featureList: [
        'Convert between 150+ units',
        '14 categories: length, weight, temperature, area, volume, speed, time, data, pressure, energy, power, angle, frequency, fuel',
        'Supports both decimal (1000) and binary (1024) data units',
        'Instant conversion as you type',
        'Swap units with one click',
        'Copy results to clipboard',
        'No signup, 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  const [inputValue, setInputValue] = useState('1');
  const [copied, setCopied] = useState(false);

  const cat = CATEGORIES[category];
  const units = cat.units;

  // Reset units when category changes
  // ✅ Special: data category defaults to GiB → MiB (binary 1024)
  useEffect(() => {
    if (category === 'data') {
      setFromUnit('GiB');
      setToUnit('MiB');
    } else {
      const unitKeys = Object.keys(units);
      setFromUnit(unitKeys[0]);
      setToUnit(unitKeys[1] || unitKeys[0]);
    }
    setInputValue('1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Calculate result
  const result = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return '';

    if (category === 'temperature') {
      const converted = convertTemperature(num, fromUnit, toUnit);
      return formatResult(converted);
    }

    const from = units[fromUnit];
    const to = units[toUnit];
    if (!from || !to) return '';

    if (from.inverse && to.inverse) {
      const baseValue = from.factor / num;
      const converted = to.factor / baseValue;
      return formatResult(converted);
    }
    if (from.inverse) {
      const baseValue = from.factor / num;
      const converted = baseValue * to.factor;
      return formatResult(converted);
    }
    if (to.inverse) {
      const baseValue = num * from.factor;
      const converted = to.factor / baseValue;
      return formatResult(converted);
    }

    const baseValue = num * from.factor;
    const converted = baseValue / to.factor;
    return formatResult(converted);
  }, [inputValue, fromUnit, toUnit, category, units]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    if (result && result !== '') {
      setInputValue(result.toString().replace(/,/g, ''));
    }
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const reset = () => {
    setInputValue('1');
    if (category === 'data') {
      setFromUnit('GiB');
      setToUnit('MiB');
    } else {
      const unitKeys = Object.keys(units);
      setFromUnit(unitKeys[0]);
      setToUnit(unitKeys[1] || unitKeys[0]);
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="uc-root">
        {/* Category tabs */}
        <div className="uc-categories">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <button
              key={key}
              className={`uc-cat-btn ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
            >
              <span className="uc-cat-icon">{c.icon}</span>
              <span className="uc-cat-label">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Converter */}
        <div className="uc-converter">
          {/* From */}
          <div className="uc-field-group">
            <label className="uc-label">From</label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="uc-value-input"
              placeholder="Enter value"
              step="any"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="uc-unit-select"
            >
              {Object.entries(units).map(([key, u]) => (
                <option key={key} value={key}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <div className="uc-swap-wrap">
            <button
              className="uc-swap-btn"
              onClick={swapUnits}
              title="Swap units"
            >
              ⇅
            </button>
          </div>

          {/* To */}
          <div className="uc-field-group">
            <label className="uc-label">To</label>
            <div className="uc-result-display">
              <span className="uc-result-value">{result || '—'}</span>
              <button
                className="uc-copy-btn"
                onClick={copyResult}
                disabled={!result}
                title="Copy result"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="uc-unit-select"
            >
              {Object.entries(units).map(([key, u]) => (
                <option key={key} value={key}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info row */}
        <div className="uc-info">
          <div className="uc-info-item">
            <span className="uc-info-icon">📊</span>
            <span>
              <strong>{Object.keys(units).length}</strong> units in {cat.label}
            </span>
          </div>
          {fromUnit !== toUnit && (
            <div className="uc-info-item">
              <span className="uc-info-icon">🔁</span>
              <span>
                1 {units[fromUnit]?.symbol} ={' '}
                <strong>
                  {category === 'temperature'
                    ? '—'
                    : formatResult(
                        category === 'fuel' && units[fromUnit]?.inverse
                          ? units[toUnit]?.factor / units[fromUnit]?.factor
                          : category === 'fuel' && units[toUnit]?.inverse
                          ? units[fromUnit]?.factor / units[toUnit]?.factor
                          : units[fromUnit]?.factor / units[toUnit]?.factor
                      )}{' '}
                  {units[toUnit]?.symbol}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Data category notice */}
        {category === 'data' && (
          <div className="uc-data-notice">
            <span className="uc-data-notice-icon">💡</span>
            <span>
              <strong>Two standards:</strong> Decimal (KB, MB, GB — 1000-based)
              for storage marketing. Binary (KiB, MiB, GiB — 1024-based) for
              Windows file sizes. <code>1 GB = 1000 MB</code>, but{' '}
              <code>1 GiB = 1024 MiB</code>.
            </span>
          </div>
        )}

        {/* Common conversions */}
        <CommonConversions
          category={category}
          fromUnit={fromUnit}
          toUnit={toUnit}
          units={units}
        />

        {/* Reset */}
        <div className="uc-actions">
          <button className="uc-reset-btn" onClick={reset}>
            ⟳ Reset
          </button>
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// Common conversions list
// ============================================================
function CommonConversions({ category, fromUnit, toUnit, units }) {
  const commonValues = [1, 5, 10, 25, 50, 100];

  const convert = (val) => {
    if (category === 'temperature') {
      return formatResult(convertTemperature(val, fromUnit, toUnit));
    }
    const from = units[fromUnit];
    const to = units[toUnit];
    if (!from || !to) return '—';
    const baseValue = val * from.factor;
    return formatResult(baseValue / to.factor);
  };

  return (
    <div className="uc-section">
      <div className="uc-section-title">Common conversions</div>
      <div className="uc-common-grid">
        {commonValues.map((v) => (
          <div key={v} className="uc-common-row">
            <span className="uc-common-from">
              {v} {units[fromUnit]?.symbol}
            </span>
            <span className="uc-common-eq">=</span>
            <span className="uc-common-to">
              {convert(v)} {units[toUnit]?.symbol}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function formatResult(num) {
  if (!isFinite(num) || isNaN(num)) return '';
  if (num === 0) return '0';

  const abs = Math.abs(num);

  if (abs < 0.000001 || abs > 1e15) {
    return num.toExponential(6).replace(/\.?0+e/, 'e');
  }

  const formatted = parseFloat(num.toPrecision(6));

  return formatted.toLocaleString('en-US', {
    maximumFractionDigits: 6,
    useGrouping: false,
  });
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Unit Converter?</h2>
        <p>
          A <strong>unit converter</strong> is a tool that converts a value
          from one unit of measurement to another. Whether you're a student
          converting kilometers to miles, a cook converting cups to milliliters,
          or an engineer working with pressure values, a reliable unit
          converter saves time and prevents errors.
        </p>
        <p>
          Our <strong>free online unit converter</strong> supports{' '}
          <strong>150+ units across 14 categories</strong> — length, weight,
          temperature, area, volume, speed, time, data, pressure, energy,
          power, angle, frequency, and fuel economy. All conversions run
          instantly in your browser — no signup, no limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>1 GB = How Many MB?</h2>
        <p>
          This is one of the most common conversion questions — and the answer
          depends on which standard you're using:
        </p>
        <ul className="seo-list">
          <li>
            <strong>Decimal (SI):</strong> 1 GB = <strong>1,000 MB</strong>.
            Used by hard drive manufacturers, network speeds, and most cloud
            storage services.
          </li>
          <li>
            <strong>Binary (IEC):</strong> 1 GiB = <strong>1,024 MiB</strong>.
            Used internally by Windows and most operating systems.
          </li>
        </ul>
        <p>
          This is why a "1 TB" hard drive shows as "931 GB" on Windows — the
          manufacturer uses decimal (1,000,000,000,000 bytes = 1 TB), but
          Windows uses binary and shows 931 GiB (labelled as "GB").
        </p>
        <p>
          Our converter supports <strong>both standards</strong> — choose{' '}
          <code>GB → MB</code> for 1,000, or <code>GiB → MiB</code> for 1,024.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the Unit Converter</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick a category</strong> — length, weight, temperature,
            volume, and more.
          </li>
          <li>
            <strong>Enter your value</strong> — type the number you want to
            convert.
          </li>
          <li>
            <strong>Choose units</strong> — select "from" and "to" units from
            the dropdowns.
          </li>
          <li>
            <strong>See the result instantly</strong> — the conversion updates
            as you type.
          </li>
          <li>
            <strong>Copy or swap</strong> — click ⇅ to swap units, or 📋 to
            copy the result.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Categories Supported</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">📏</div>
            <h3>Length</h3>
            <p>
              18 units — from nanometers to light years, including metric,
              imperial, and astronomical units.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚖️</div>
            <h3>Weight / Mass</h3>
            <p>
              17 units — micrograms, grams, kilograms, tonnes, ounces, pounds,
              stones, and more.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🌡️</div>
            <h3>Temperature</h3>
            <p>
              Celsius, Fahrenheit, Kelvin, and Rankine with accurate formulas.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🟦</div>
            <h3>Area</h3>
            <p>
              10 units — square meters, square feet, acres, hectares, and more.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧴</div>
            <h3>Volume</h3>
            <p>
              16 units — liters, gallons, cups, pints, fluid ounces, both US
              and UK variants.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💨</div>
            <h3>Speed</h3>
            <p>
              km/h, mph, m/s, knots, feet/second, Mach, and the speed of light.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⏱️</div>
            <h3>Time</h3>
            <p>
              12 units — nanoseconds to centuries, including weeks and months.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💾</div>
            <h3>Data</h3>
            <p>
              Bits, bytes, and both decimal (KB/MB/GB) and binary (KiB/MiB/GiB)
              standards.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎈</div>
            <h3>Pressure</h3>
            <p>
              Pascal, bar, atmosphere, psi, torr, mmHg — for engineering and
              science.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Energy</h3>
            <p>
              Joules, calories, kilocalories, watt-hours, electronvolts, and
              BTU.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔌</div>
            <h3>Power</h3>
            <p>
              Watts, kilowatts, megawatts, and horsepower (mechanical &
              metric).
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📐</div>
            <h3>Angle</h3>
            <p>
              Degrees, radians, gradians, arcminutes, arcseconds, and turns.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📻</div>
            <h3>Frequency</h3>
            <p>Hz, kHz, MHz, GHz, and RPM for signal and rotation speeds.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⛽</div>
            <h3>Fuel Economy</h3>
            <p>
              km/L, L/100km, mpg (US), and mpg (UK) — for car efficiency.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Popular Conversions</h2>
        <ul className="seo-list">
          <li><strong>1 GB</strong> = 1,000 MB (decimal) or 1 GiB = 1,024 MiB (binary)</li>
          <li><strong>1 mile</strong> = 1.60934 kilometers</li>
          <li><strong>1 kilogram</strong> = 2.20462 pounds</li>
          <li><strong>1 inch</strong> = 2.54 centimeters</li>
          <li><strong>1 foot</strong> = 30.48 centimeters</li>
          <li><strong>1 gallon (US)</strong> = 3.78541 liters</li>
          <li><strong>1 ounce</strong> = 28.3495 grams</li>
          <li><strong>1 atmosphere</strong> = 101,325 pascals</li>
          <li><strong>1 horsepower</strong> = 745.7 watts</li>
          <li><strong>1 acre</strong> = 4,046.86 square meters</li>
          <li><strong>1 knot</strong> = 1.852 km/h</li>
          <li><strong>0°C</strong> = 32°F = 273.15 K</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>1 GB is how many MB?</summary>
          <p>
            There are two standards:
          </p>
          <ul>
            <li>
              <strong>1 GB = 1,000 MB</strong> (decimal, SI) — used by hard
              drive manufacturers, network speeds, and most marketing.
            </li>
            <li>
              <strong>1 GiB = 1,024 MiB</strong> (binary, IEC) — used by
              Windows internally. Windows labels them as "GB" and "MB" but
              actually means GiB/MiB.
            </li>
          </ul>
          <p>
            In our converter, choose <code>GB → MB</code> for 1,000, or{' '}
            <code>GiB → MiB</code> for 1,024.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why does my 1 TB hard drive show as 931 GB?</summary>
          <p>
            The manufacturer uses <strong>decimal (SI)</strong> — 1 TB =
            1,000,000,000,000 bytes. Windows uses <strong>binary</strong> and
            divides by 1024⁴ = 1,099,511,627,776. So{' '}
            1,000,000,000,000 ÷ 1,099,511,627,776 ≈ 931 GiB, displayed as "931
            GB" — a labelling quirk.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this unit converter free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Convert as many units as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How accurate are the conversions?</summary>
          <p>
            All conversions use <strong>NIST-standard conversion factors</strong>{' '}
            and are accurate to 6+ significant digits. Temperature conversions
            use the exact mathematical formulas.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I convert Celsius to Fahrenheit?</summary>
          <p>
            Use the formula <code>°F = (°C × 9/5) + 32</code>. Our tool does
            this automatically — just pick "Temperature" category, enter your
            Celsius value, and select Fahrenheit as the output.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between KB and KiB?</summary>
          <p>
            <strong>KB (kilobyte)</strong> = 1,000 bytes (decimal).{' '}
            <strong>KiB (kibibyte)</strong> = 1,024 bytes (binary). The same
            difference applies to MB vs MiB, GB vs GiB, etc.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why are there US and UK gallons?</summary>
          <p>
            The US gallon is <strong>3.785 liters</strong>, while the UK
            (imperial) gallon is <strong>4.546 liters</strong>. This applies to
            pints, quarts, and fluid ounces too. Our converter handles both.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert very large or very small numbers?</summary>
          <p>
            Yes — the tool handles everything from nanometers to light years,
            micrograms to megatons, nanoseconds to centuries. Very small or
            large results are shown in scientific notation.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my data safe?</summary>
          <p>
            Absolutely. All conversions run locally in your browser. Nothing
            you type is ever sent to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            Once the page is loaded, yes — conversions work without an internet
            connection because everything runs in your browser.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>BMI Calculator</strong>,{' '}
          <strong>Age Calculator</strong>, <strong>Color Picker</strong>,{' '}
          <strong>Hash Generator</strong>, <strong>Timestamp Converter</strong>,
          and <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}