import React, { useState } from 'react';
import PasswordSetup from './components/PasswordSetup';
import DictationView from './components/DictationView';
import './App.css';

function App() {
  const [masterPassword, setMasterPassword] = useState(null);

  return (
    <div className="App" style={{ fontFamily: 'sans-serif' }}>
      {!masterPassword ? (
        <PasswordSetup onPasswordSet={setMasterPassword} />
      ) : (
        <DictationView password={masterPassword} />
      )}
    </div>
  );
}

export default App;
