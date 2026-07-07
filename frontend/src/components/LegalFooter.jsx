import { Link } from 'react-router-dom';

// Persistent links to the legal documents, reachable from every screen.
export default function LegalFooter() {
  return (
    <footer
      className="muted"
      style={{
        marginTop: 40,
        paddingTop: 16,
        borderTop: '1px solid var(--paper-line)',
        fontSize: 13,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <span>© {new Date().getFullYear()} Openhouse</span>
      <Link to="/privacy">Privacy Policy</Link>
      <Link to="/terms">Terms &amp; Conditions</Link>
      <a href="mailto:support@openhouse.in">support@openhouse.in</a>
    </footer>
  );
}
