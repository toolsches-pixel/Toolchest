import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span
            key={i}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}
          >
            {item.to && !isLast ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span className={isLast ? 'crumb-current' : ''}>{item.label}</span>
            )}
            {!isLast && <span className="crumb-sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}