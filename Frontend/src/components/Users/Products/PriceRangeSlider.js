const SLIDER_STYLES = `
.price-range-input {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
}
.price-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: all;
  height: 1.125rem;
  width: 1.125rem;
  border-radius: 9999px;
  border: 2px solid #fff;
  background: #4f46e5;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
  cursor: pointer;
}
.price-range-input::-moz-range-thumb {
  pointer-events: all;
  height: 1.125rem;
  width: 1.125rem;
  border-radius: 9999px;
  border: 2px solid #fff;
  background: #4f46e5;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
  cursor: pointer;
}
`

export const PRICE_SLIDER_MIN = 0
export const PRICE_SLIDER_MAX = 100000
export const PRICE_SLIDER_STEP = 500

export function isPriceFilterActive(minValue, maxValue) {
  return minValue > PRICE_SLIDER_MIN || maxValue < PRICE_SLIDER_MAX
}

export function formatPriceRangeLabel(minValue, maxValue) {
  const fmt = (n) => Number(n).toLocaleString('en-IN')
  return `₹${fmt(minValue)} – ₹${fmt(maxValue)}`
}

function trackPercent(value) {
  return ((value - PRICE_SLIDER_MIN) / (PRICE_SLIDER_MAX - PRICE_SLIDER_MIN)) * 100
}

export default function PriceRangeSlider({ minValue, maxValue, onChange }) {
  const handleMinChange = (nextMin) => {
    const clamped = Math.max(
      PRICE_SLIDER_MIN,
      Math.min(nextMin, maxValue - PRICE_SLIDER_STEP)
    )
    onChange(clamped, maxValue)
  }

  const handleMaxChange = (nextMax) => {
    const clamped = Math.min(
      PRICE_SLIDER_MAX,
      Math.max(nextMax, minValue + PRICE_SLIDER_STEP)
    )
    onChange(minValue, clamped)
  }

  const left = trackPercent(minValue)
  const right = 100 - trackPercent(maxValue)

  return (
    <div>
      <style>{SLIDER_STYLES}</style>
      <div className="mb-3 flex items-center justify-between text-sm font-medium text-stone-800">
        <span>{formatPriceRangeLabel(minValue, maxValue)}</span>
        {isPriceFilterActive(minValue, maxValue) && (
          <button
            type="button"
            onClick={() => onChange(PRICE_SLIDER_MIN, PRICE_SLIDER_MAX)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Reset
          </button>
        )}
      </div>
      <div className="relative mx-1 h-7">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-stone-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-indigo-500"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          type="range"
          min={PRICE_SLIDER_MIN}
          max={PRICE_SLIDER_MAX}
          step={PRICE_SLIDER_STEP}
          value={minValue}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          aria-label="Minimum price"
          className="price-range-input absolute inset-0 z-20 w-full"
        />
        <input
          type="range"
          min={PRICE_SLIDER_MIN}
          max={PRICE_SLIDER_MAX}
          step={PRICE_SLIDER_STEP}
          value={maxValue}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          aria-label="Maximum price"
          className="price-range-input absolute inset-0 z-30 w-full"
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-stone-400">
        <span>₹0</span>
        <span>₹{PRICE_SLIDER_MAX.toLocaleString('en-IN')}+</span>
      </div>
    </div>
  )
}
