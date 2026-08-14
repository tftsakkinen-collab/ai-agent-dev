import React, { useState, useEffect } from 'react';
import { encryptText, saveDictation, getDictations, decryptText } from '../lib/encryption';

export default function DictationView({ password }) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [savedRecords, setSavedRecords] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  // Ladataan vanhat sanelut, kun komponentti avataan
  useEffect(() => {
    loadSavedRecords();
  }, []);

  const loadSavedRecords = async () => {
    try {
      const records = await getDictations();
      const decrypted = await Promise.all(
        records.map(async (r) => {
          try {
            const text = await decryptText(r.data, password);
            return { id: r.id, text, date: new Date(r.timestamp).toLocaleString('fi-FI') };
          } catch (e) {
            return { id: r.id, text: '[Virhe salauksen purussa]', date: new Date(r.timestamp).toLocaleString('fi-FI') };
          }
        })
      );
      setSavedRecords(decrypted.reverse()); // Uusin ensin
    } catch (e) {
      console.error("Virhe ladattaessa kirjauksia:", e);
    }
  };

  const handleRecordToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      setCurrentText('');
      setStatusMsg('Äänitetään... (Tässä MVP:ssä simuloidaan puheentunnistusta. Odota hetki.)');

      // Simuloidaan taustapalvelimen (Whisper) vastausta
      setTimeout(() => {
        setCurrentText('Potilas kertoo, että oikea olkapää on ollut kipeä kaksi viikkoa. Kraniocervikaalinen testaus normaali. Suositellaan kiertäjäkalvosimen vahvistamista.');
        setIsRecording(false);
        setStatusMsg('Sanelu valmis! Voit nyt muokata ja tallentaa sen.');
      }, 3000);
    } else {
      setIsRecording(false);
      setStatusMsg('Sanelu keskeytetty.');
    }
  };

  const handleSave = async () => {
    if (!currentText.trim()) return;
    setStatusMsg('Salataan ja tallennetaan paikallisesti...');
    try {
      const encrypted = await encryptText(currentText, password);
      const id = 'dict_' + Date.now();
      await saveDictation(id, encrypted);
      setStatusMsg('Tallennettu onnistuneesti!');
      setCurrentText('');
      loadSavedRecords(); // Päivitä lista
    } catch (e) {
      setStatusMsg('Virhe tallennuksessa!');
      console.error(e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatusMsg('Kopioitu leikepöydälle!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h2>Kirjaajanne (Selain-MVP)</h2>
        <span style={{ color: 'green' }}>✓ Suojattu paikallisesti</span>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={handleRecordToggle}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            backgroundColor: isRecording ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {isRecording ? '⏹ Lopeta Äänitys' : '⏺ Aloita Sanelu'}
        </button>
      </div>

      {statusMsg && <p style={{ color: '#666', fontStyle: 'italic' }}>{statusMsg}</p>}

      <div style={{ marginBottom: '2rem' }}>
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          placeholder="Saneltu teksti ilmestyy tähän. Voit muokata sitä vapaasti..."
          style={{ width: '100%', height: '150px', padding: '1rem', fontSize: '1rem', boxSizing: 'border-box' }}
        />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
           <button onClick={handleSave} style={{ padding: '0.8rem', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
             Tallenna paikalliseen arkistoon
           </button>
           <button onClick={() => copyToClipboard(currentText)} style={{ padding: '0.8rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
             Kopioi potilastietojärjestelmään (Ctrl+C)
           </button>
        </div>
      </div>

      <hr />

      <div style={{ marginTop: '2rem' }}>
        <h3>Vanhat Kirjaukset (Purettu salauksesta)</h3>
        {savedRecords.length === 0 && <p>Ei tallennettuja kirjauksia.</p>}
        {savedRecords.map(record => (
          <div key={record.id} style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>{record.date}</div>
            <p style={{ margin: '0 0 1rem 0' }}>{record.text}</p>
            <button onClick={() => copyToClipboard(record.text)} style={{ fontSize: '0.9rem', padding: '0.5rem', cursor: 'pointer' }}>
              Kopioi
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
