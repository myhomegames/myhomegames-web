import "./CoverSizeSlider.css";

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
  return (
    <div className="cover-size-slider-container">
      <input
        id="cover-size-slider"
        name="coverSize"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cover-size-slider"
      />
    </div>
  );
}
