/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useState } from 'react';
import { useXTerm } from 'react-xtermjs';
import './App.css';

function App() {
  const { ref: terminalRef, instance: terminal } = useXTerm({
    options: { cursorBlink: true, theme: { background: '#1e1e1e' } },
    listeners: {
      onData: handleData,
    },
  });
  const [status, setStatus] = useState('DISCONNECTED');
  const ws = useRef<WebSocket | null>(null);

  function handleData(data: string) {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'stdin', data }));
    } else {
      console.log('WebSocket is not connected.');
    }
  }

  useEffect(() => {
    // Focus the terminal on load
    if (terminal) {
      terminal.focus();
    }

    console.log('Attempting to connect to WebSocket...');
    setStatus('CONNECTING');
    ws.current = new WebSocket('ws://localhost:8080');

    ws.current.onopen = () => {
      console.log('WebSocket connection established.');
      setStatus('CONNECTED');
      terminal?.writeln('\x1b[32mWelcome to Gemini Web-CLI!\x1b[0m');
      terminal?.writeln('\x1b[32mConnected to backend server.\x1b[0m');
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (terminal) {
        if (message.type === 'stdout' || message.type === 'stderr') {
          terminal.write(message.data);
        }
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('ERROR');
      if (terminal) {
        terminal.writeln(
          '\x1b[31mWebSocket connection error. See browser console for details.\x1b[0m',
        );
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed.');
      setStatus('DISCONNECTED');
      if (terminal) {
        terminal.writeln('\x1b[31mConnection to backend server lost.\x1b[0m');
      }
    };

    const currentWs = ws.current;

    return () => {
      currentWs.close();
    };
  }, [terminal]);

  return (
    <div className="App">
      <div className="status-bar">
        <span>STATUS:</span>
        <span className={`status-${status.toLowerCase()}`}>{status}</span>
      </div>
      <div ref={terminalRef} />
    </div>
  );
}

export default App;
