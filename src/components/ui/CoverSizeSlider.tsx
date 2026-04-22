import { useId } from "react";
type CoverSizeSliderProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export default function CoverSizeSlider({
  value,
  onChange,
  min = 100,
  max = 200,
}: CoverSizeSliderProps) {
  const sliderId = useId();
  return (
    <div className="cover-size-slider-container">
      <input
        id={sliderId}
        name={`coverSize-${sliderId.replace(/:/g, "-")}`}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cover-size-slider"
        aria-label="Cover size"
      />
    </div>
  );
}
