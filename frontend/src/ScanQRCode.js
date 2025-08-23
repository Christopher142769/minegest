// src/ScanQRCode.js
import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

export default function ScanQRCode() {
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: 250
    });

    scanner.render(
      (decodedText, decodedResult) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.id) {
            scanner.clear().then(() => {
              navigate(`/trucker/${data.id}`);
            });
          } else {
            alert("QR Code invalide");
          }
        } catch (err) {
          alert("QR Code non reconnu");
        }
      },
      (error) => {
        console.warn(error);
      }
    );
  }, [navigate]);

  return (
    <div>
      <h2>Scanner une carte</h2>
      <div id="reader" style={{ width: '100%' }}></div>
    </div>
  );
}
