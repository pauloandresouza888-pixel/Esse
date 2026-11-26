import { useId } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** 0..1 steps; 5% increments are comfortable with a thumb. */
  step?: number;
  icon?: React.ReactNode;
}

/** Volume style slider. Percentage text doubles as a non-audio visual cue. */
export function Slider({ label, value, onChange, step = 0.05, icon }: SliderProps) {
  const id = useId();
  const percent = Math.round(value * 100);
  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <label className={styles.label} htmlFor={id}>
          {icon ? <span className={styles.icon}>{icon}</span> : null}
          {label}
        </label>
        <output className={styles.value} htmlFor={id}>
          {percent}%
        </output>
      </div>
      <input
        id={id}
        className={styles.input}
        type="range"
        min={0}
        max={1}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${percent}%`}
      />
    </div>
  );
}
