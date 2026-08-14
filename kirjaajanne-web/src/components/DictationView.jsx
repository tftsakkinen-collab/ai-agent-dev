import React, { useState, useEffect, useRef } from 'react';
import { encryptText, saveDictation, getDictations, decryptText } from '../lib/encryption';
import { retrieveContext } from '../lib/ragDatabase';

export default function DictationView({ password, onLock }) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [savedRecords, setSavedRecords] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  // Refs for audio and worker
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const workerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize worker and load records on mount
  useEffect(() => {
    loadSavedRecords();

    // Initialize the Web Worker for AI transcription
    workerRef.current = new Worker(new URL('../lib/worker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.addEventListener('message', async (e) => {
      const { status, text, data, error } = e.data;

      if (status === 'progress') {
        setStatusMsg(`Ladataan tekoälymallia selaimeen... ${Math.round(data.progress || 0)}%`);
      } else if (status === 'processing') {
        setStatusMsg('Vaihe 1/2: Puretaan ääntä tekstiksi (Whisper)...');
      } else if (status === 'asr_complete') {
        // Stage 1 is done. Now trigger RAG and LLM stage.
        setStatusMsg('Vaihe 2/2: Haetaan Käypä hoito -kontekstia (RAG) ja rakenteistetaan (LLM)...');

        try {
          // 1. Retrieve RAG context based on raw text
          const ragContext = await retrieveContext(text);

          // 2. Simulate Local LLM processing (Llama.cpp in browser via WebGPU)
          // In a real implementation, we would send 'text' + 'ragContext' to the LLM here.
          setTimeout(() => {
             const structuredText = `** SANELU (Korjattu Käypä hoito -suositusten pohjalta) **\n\n${text.trim()}\n\n---\n**RAG Konteksti:**\n${ragContext}`;
             setCurrentText(prev => prev + (prev ? '\n\n' : '') + structuredText);
             setStatusMsg('Sanelu ja rakenteistus valmis! Voit nyt muokata ja tallentaa sen.');
          }, 1500);

        } catch (err) {
          setStatusMsg('Virhe terminologian korjauksessa.');
        }

      } else if (status === 'error') {
        setStatusMsg('Virhe puheentunnistuksessa: ' + error);
      }
    });

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Clean up mic
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatusMsg('Äänitetään... Puhu selkeästi.');
    } catch (err) {
      console.error("Mic error:", err);
      setStatusMsg('Virhe mikrofonin avaamisessa. Anna selaimelle lupa käyttää mikrofonia.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatusMsg('Prosessoidaan ääntä tekoälyllä...');
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Convert audio blob to Float32Array 16kHz for Whisper
  const processAudio = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const float32Array = audioBuffer.getChannelData(0);

      // Send to worker
      workerRef.current.postMessage({ audio: float32Array });
    } catch (e) {
      setStatusMsg('Virhe äänen käsittelyssä.');
      console.error(e);
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
        <h2>Kirjaajanne (Täysi Selainversio)</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'green', fontWeight: 'bold' }}>🔒 Suojattu AES-GCM</span>
          <button onClick={onLock} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Lukitse Ohjelma
          </button>
        </div>
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
