export default function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} toolchest — free online tools · built
        with <span style={{ color: 'var(--accent)' }}>♥</span>
      </p>
    </footer>
  );
}