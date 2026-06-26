import { useMemo } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import {
  APPAREL_SIZE_PRESETS,
  SIZE_MEASUREMENT_TYPE_OPTIONS,
  SIZE_LABEL_PLACEHOLDERS,
  defaultSizeLabelForType,
} from "../../../utils/sizeMeasurement";

const animatedComponents = makeAnimated();

export default function ProductSizeFields({ value, onChange }) {
  const {
    sizeMeasurementType = "apparel",
    sizeLabel = "",
    sizes = [],
  } = value || {};

  const apparelOptions = useMemo(
    () => APPAREL_SIZE_PRESETS.map((s) => ({ value: s, label: s })),
    []
  );
  const selectedOptions = sizes.map((s) => ({ value: s, label: s }));

  const handleTypeChange = (e) => {
    const type = e.target.value;
    onChange({
      sizeMeasurementType: type,
      sizeLabel: type === "none" ? "" : defaultSizeLabelForType(type),
      sizes: type === "none" ? [] : sizes,
    });
  };

  const handleLabelChange = (e) => {
    onChange({ ...value, sizeLabel: e.target.value });
  };

  const handleSizesChange = (opts) => {
    onChange({
      ...value,
      sizes: (opts || []).map((o) => o.value),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700">
          Size measurement type
        </label>
        <select
          name="sizeMeasurementType"
          value={sizeMeasurementType}
          onChange={handleTypeChange}
          className="mt-1 block w-full rounded-md border border-stone-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        >
          {SIZE_MEASUREMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">
          Choose how this product&apos;s sizes are defined for customers.
        </p>
      </div>

      {sizeMeasurementType !== "none" && (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Size label
            </label>
            <input
              name="sizeLabel"
              value={sizeLabel}
              onChange={handleLabelChange}
              placeholder={
                SIZE_LABEL_PLACEHOLDERS[sizeMeasurementType] || "Size"
              }
              className="mt-1 block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-stone-500">
              Shown on the product page (e.g. &quot;UK shoe size&quot;).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">
              {sizeMeasurementType === "apparel"
                ? "Select sizes"
                : "Size values"}
            </label>
            {sizeMeasurementType === "apparel" ? (
              <Select
                components={animatedComponents}
                isMulti
                name="sizes"
                options={apparelOptions}
                value={selectedOptions}
                className="basic-multi-select mt-1"
                classNamePrefix="select"
                isClearable
                isSearchable
                closeMenuOnSelect={false}
                onChange={handleSizesChange}
              />
            ) : (
              <CreatableSelect
                components={animatedComponents}
                isMulti
                name="sizes"
                value={selectedOptions}
                className="basic-multi-select mt-1"
                classNamePrefix="select"
                isClearable
                placeholder={
                  sizeMeasurementType === "numeric"
                    ? "Type a value and press Enter (e.g. 7, 8, 9)"
                    : "Type a value and press Enter"
                }
                closeMenuOnSelect={false}
                onChange={handleSizesChange}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
