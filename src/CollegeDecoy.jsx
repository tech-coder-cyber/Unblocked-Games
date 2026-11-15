import { useState, useEffect } from 'react';

export default function CollegeDecoy({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  const SECRET_CODE = 'nb2026';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && unlocked) {
        setUnlocked(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlocked]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().toLowerCase() === SECRET_CODE) {
      setUnlocked(true);
      setSearchQuery('');
      setSearchMessage('');
    } else if (searchQuery.trim() !== '') {
      setSearchMessage(
        'No physical holdings matched "' +
          searchQuery +
          '". Try broadening your interlibrary loan filters.'
      );
    }
  };

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        color: '#1e293b',
      }}
    >
      <div
        style={{
          backgroundColor: '#14532d',
          color: '#ffffff',
          padding: '10px 24px',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>NORTHBRIDGE STATE COLLEGE • FOUNDERS MEMORIAL LIBRARY</span>
        <span>Fall Semester Hours: 7:30 AM – 11:00 PM</span>
      </div>

      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1040px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#14532d', fontWeight: '700' }}>
              Northbridge Research & Archives
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
              Academic Journals, Course Reserves, and Study Space Reservations
            </p>
          </div>
          <nav
            style={{
              display: 'flex',
              gap: '20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#334155',
            }}
          >
            <span style={{ cursor: 'pointer' }}>Databases A–Z</span>
            <span style={{ cursor: 'pointer' }}>Course Reserves</span>
            <span style={{ cursor: 'pointer' }}>Citation Guides</span>
            <span style={{ cursor: 'pointer' }}>Ask a Librarian</span>
          </nav>
        </div>
      </header>
      <main
        style={{
          maxWidth: '1040px',
          margin: '32px auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Search OneSearch Catalog</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books, peer-reviewed articles, ISBN, or course code..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#14532d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
            {searchMessage && (
              <p
                style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#b91c1c',
                  backgroundColor: '#fef2f2',
                  padding: '10px',
                  borderRadius: '6px',
                }}
              >
                {searchMessage}
              </p>
            )}
          </section>

          <section
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Popular Research Databases</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#14532d', marginBottom: '4px' }}>JSTOR Archival Journals</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Full-text humanities and social science periodicals.</div>
              </div>
              <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#14532d', marginBottom: '4px' }}>IEEE Xplore Digital</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Computer science, electrical engineering, and electronics.</div>
              </div>
              <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#14532d', marginBottom: '4px' }}>PubMed Central</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Biomedical and life sciences journal literature.</div>
              </div>
              <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#14532d', marginBottom: '4px' }}>ProQuest Dissertations</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Graduate theses and academic research papers.</div>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Group Study Rooms</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span>Room 204B (Quiet Zone)</span>
                <span style={{ color: '#15803d', fontWeight: '600' }}>Available</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span>Room 310A (Media Lab)</span>
                <span style={{ color: '#b45309', fontWeight: '600' }}>Reserved until 2 PM</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Room 312C (Whiteboard)</span>
                <span style={{ color: '#15803d', fontWeight: '600' }}>Available</span>
              </li>
            </ul>
          </section>

          <section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Library Notices</h3>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Interlibrary loan requests submitted after Friday at 4:00 PM will be processed the following Monday morning.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Printing kiosks on the 2nd floor are undergoing scheduled maintenance today.
            </p>
          </section>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: '40px' }}>
        <span>© </span>
        <span
          onClick={(e) => {
            if (e.detail === 3) setUnlocked(true);
          }}
          style={{ cursor: 'default', userSelect: 'none' }}
        >
          2026
        </span>
        <span> Northbridge State College Library • 800 College Ave, Northbridge • All Rights Reserved</span>
      </footer>
    </div>
  );
}
