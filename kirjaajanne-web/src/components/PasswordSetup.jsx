import React, { useState } from 'react';

export default function PasswordSetup({ onPasswordSet }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Salasanan tulee olla vähintään 8 merkkiä pitkä.');
      return;
    }
    setError('');
    onPasswordSet(password);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Tervetuloa Kirjaajaan!</h2>
      <p>
        Kaikki kirjauksesi salataan paikallisesti koneellasi.
        Syötä salasana, jolla avaat ohjelman jatkossa.
        <strong> Älä hukkaa tätä, tai menetät vanhat kirjauksesi.</strong>
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <input
          type="password"
          placeholder="Syötä pääsalasana..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '0.8rem', fontSize: '1rem' }}
        />
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit" style={{ padding: '0.8rem', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px' }}>
          Avaa Ohjelma
        </button>
      </form>
    </div>
  );
}
