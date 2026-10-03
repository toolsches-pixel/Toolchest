export default function SearchBar({ value, onChange, placeholder = 'Search tools…' }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck="false"
        autoComplete="off"
      />
    </div>
  );
}