export default function CategoryPills({ categories, active, onChange }) {
  return (
    <div className="category-pills">
      {categories.map((cat) => (
        <button
          key={cat}
          className={`category-pill ${active === cat ? 'active' : ''}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}