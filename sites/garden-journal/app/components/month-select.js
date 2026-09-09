import { MONTHS_LONG } from "../lib/garden-data.js";

export function MonthSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {MONTHS_LONG.map((month, index) => (
        <option key={month} value={index + 1}>{month}</option>
      ))}
    </select>
  );
}
