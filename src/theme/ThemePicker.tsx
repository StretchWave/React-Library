// Theme switcher UI (M3): labeled select (Auto + every taxonomy theme) and
// previous/next cycle buttons.
import { AUTO_THEME_ID, isExplicitThemeId } from "./theme";
import { useTheme } from "./ThemeProvider";
import "./theme-picker.css";

export function ThemePicker() {
  const { selection, setThemeId, cycleTheme, themes } = useTheme();
  const selectValue = isExplicitThemeId(selection, themes) ? selection : AUTO_THEME_ID;

  return (
    <div className="theme-picker">
      <label className="theme-picker-label" htmlFor="theme-select">
        Theme
      </label>
      <select
        id="theme-select"
        className="theme-picker-select"
        value={selectValue}
        onChange={(event) => setThemeId(event.target.value)}
      >
        <option value={AUTO_THEME_ID}>Auto (system)</option>
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="theme-picker-cycle"
        aria-label="Previous theme"
        title="Previous theme"
        onClick={() => cycleTheme(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className="theme-picker-cycle"
        aria-label="Next theme"
        title="Next theme"
        onClick={() => cycleTheme(1)}
      >
        ›
      </button>
    </div>
  );
}
