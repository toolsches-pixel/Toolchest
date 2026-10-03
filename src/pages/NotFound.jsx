import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('404 · toolchest');
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>This tool doesn't exist (yet).</p>
      <Link to="/" className="btn-home">
        ← back to home
      </Link>
    </div>
  );
}