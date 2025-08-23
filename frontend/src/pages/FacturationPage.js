import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Image, Modal, Badge, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './FacturePage.css';

export default function FacturePage() {
  const [truckers, setTruckers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    truckPlate: '',
    truckType: '',
    unitPrice: 0,
    trips: 0,
    totalAmount: 0,
    balance: 0,
    status: 0
  });
  const [facture, setFacture] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingFactureRef = useRef(null);

  const prixParType = {
    '6 roues': 30000,
    '10 roues': 45000,
    '12 roues': 80000
  };

  useEffect(() => {
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/truckers');
      setTruckers(res.data || []);
    } catch (err) {
      console.error('Erreur fetch truckers', err.message);
    }
  };

  useEffect(() => {
    const trucker = truckers.find(t => t.truckPlate === form.truckPlate);
    if (trucker) {
      setForm(prev => ({
        ...prev,
        name: trucker.name || '',
        truckType: trucker.truckType || '',
        unitPrice: prixParType[trucker.truckType] || 0,
        balance: Number(trucker.balance || 0)
      }));
    }
  }, [form.truckPlate, truckers]);

  useEffect(() => {
    const unit = Number(form.unitPrice) || 0;
    const trips = Number(form.trips) || 0;
    const total = unit * trips;
    const balance = Number(form.balance) || 0;
    const status = balance - total;
    setForm(prev => ({ ...prev, totalAmount: total, status }));
  }, [form.unitPrice, form.trips, form.balance]);

  const handleChange = e => {
    const { name, value } = e.target;
    if (['trips', 'unitPrice', 'balance'].includes(name)) {
      setForm(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (name === 'truckType') {
      setForm(prev => ({ ...prev, unitPrice: prixParType[value] || 0 }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.status < 0) {
      alert('Solde insuffisant — facture non générée.');
      return;
    }
    pendingFactureRef.current = { ...form, date: new Date().toISOString() };
    setShowConfirm(true);
  };

  const confirmGenerate = async () => {
    setShowConfirm(false);
    const newFacture = pendingFactureRef.current;
    setFacture({ ...newFacture, date: new Date(newFacture.date).toLocaleString() });
    try {
      await axios.post('http://localhost:5000/api/factures', newFacture);
      fetchHistorique();
      fetchTruckers();
    } catch (err) {
      console.error('Erreur enregistrement facture:', err.message);
    }
  };

  const fetchHistorique = async () => {
    try {
      setLoadingHist(true);
      const res = await axios.get('http://localhost:5000/api/factures');
      setHistorique(res.data || []);
      setShowHistorique(true);
    } catch (err) {
      alert('Impossible de charger l\'historique');
    } finally {
      setLoadingHist(false);
    }
  };

  const imprimerFacture = (f) => {
    const content = buildPrintableHTML(f);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // const buildPrintableHTML = (f) => {
  //   const qrData = encodeURIComponent(`Facture ${f.truckPlate} - Total: ${f.totalAmount} FCFA`);
  //   const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;
  
  //   return `
  //     <!doctype html>
  //     <html>
  //     <head>
  //       <meta charset="utf-8" />
  //       <title>Facture</title>
  //       <style>
  //         body {
  //           font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  //           padding: 30px;
  //           background: #fff;
  //           color: #1a1a1a;
  //         }
  //         .facture-container {
  //           position: relative;
  //           border: 2px solid #0b3d91;
  //           max-width: 700px;
  //           margin: auto;
  //           padding: 30px;
  //           box-sizing: border-box;
  //         }
  //         .header {
  //           display: flex;
  //           justify-content: space-between;
  //           align-items: center;
  //           border-bottom: 3px solid #0b3d91;
  //           padding-bottom: 10px;
  //           margin-bottom: 25px;
  //         }
  //         .logo {
  //           height: 60px;
  //           object-fit: contain;
  //         }
  //         h2 {
  //           flex-grow: 1;
  //           text-align: center;
  //           margin: 0;
  //           font-weight: 700;
  //           font-size: 2.5rem;
  //           color: #0b3d91;
  //         }
  //         table {
  //           width: 100%;
  //           border-collapse: collapse;
  //         }
  //         th, td {
  //           border: 1px solid #0b3d91;
  //           padding: 12px 15px;
  //           font-size: 1rem;
  //         }
  //         th {
  //           background-color: #e9f0fb;
  //           color: #0b3d91;
  //           text-align: left;
  //           width: 35%;
  //         }
  //         td {
  //           text-align: right;
  //         }
  //         .footer {
  //           display: flex;
  //           justify-content: flex-end;
  //           margin-top: 35px;
  //         }
  //         .qr {
  //           height: 120px;
  //           width: 120px;
  //           border: 2px solid #0b3d91;
  //           border-radius: 6px;
  //         }
  //         .sticker {
  //           position: absolute;
  //           top: 30px;
  //           left: -40px;
  //           background-color: #d32f2f;
  //           color: white;
  //           font-weight: 900;
  //           font-size: 1.5rem;
  //           padding: 10px 70px;
  //           transform: rotate(-30deg);
  //           box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  //           user-select: none;
  //           pointer-events: none;
  //           z-index: 10;
  //         }
  //       </style>
  //     </head>
  //     <body>
  //       <div class="facture-container">
  //         <div class="sticker">FACTURÉ</div>
  //         <div class="header">
  //           <img src="${window.location.origin}/logo.png" alt="Logo" class="logo" />
  //           <h2>FACTURE</h2>
  //           <div style="width:60px"></div> <!-- espace pour alignement -->
  //         </div>
  //         <table>
  //           <tbody>
  //             <tr><th>Date</th><td>${f.date}</td></tr>
  //             <tr><th>Nom</th><td>${f.name}</td></tr>
  //             <tr><th>Plaque</th><td>${f.truckPlate}</td></tr>
  //             <tr><th>Type</th><td>${f.truckType}</td></tr>
  //             <tr><th>Prix Unitaire</th><td>${f.unitPrice.toLocaleString()} FCFA</td></tr>
  //             <tr><th>Voyages</th><td>${f.trips}</td></tr>
  //             <tr><th>Total</th><td>${f.totalAmount.toLocaleString()} FCFA</td></tr>
  //             <tr><th>Solde</th><td>${f.balance.toLocaleString()} FCFA</td></tr>
  //             <tr><th>Statut</th><td>${f.status.toLocaleString()} FCFA</td></tr>
  //           </tbody>
  //         </table>
  //         <div class="footer">
  //           <img src="${qrUrl}" alt="QR Code" class="qr" />
  //         </div>
  //       </div>
  //     </body>
  //     </html>
  //   `;
  // };
  
  const buildPrintableHTML = (f) => {
    const qrData = encodeURIComponent(`Facture ${f.truckPlate} - Total: ${f.totalAmount} FCFA`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}`;
  
    // Fonction pour badge couleur selon le statut
    const statusColor = (status) => {
      if (typeof status === 'string') {
        // au cas où, gérer chaîne
        switch (status.toLowerCase()) {
          case 'payé': return '#4caf50';
          case 'en attente': return '#ff9800';
          case 'impayé': return '#f44336';
          default: return '#607d8b';
        }
      }
      // Si c'est un nombre (ex: solde restant)
      if (status < 0) return '#f44336';        // rouge : solde négatif = impayé
      if (status === 0) return '#ff9800';       // orange : en attente / solde nul
      if (status > 0) return '#4caf50';         // vert : payé / solde positif
      return '#607d8b';                         // gris bleu par défaut
    };
    
  
    return `
    <!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Facture</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
  
        body {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 40px 20px;
          background-color: #f7f9fc;
          color: #333;
        }
        .facture-container {
          max-width: 720px;
          margin: auto;
          background: white;
          border-radius: 12px;
          padding: 40px 50px 60px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          position: relative;
        }
        .sticker {
          position: absolute;
          top: 30px;
          left: -50px;
          background-color: #d32f2f;
          color: white;
          font-weight: 700;
          font-size: 1.6rem;
          padding: 12px 80px;
          transform: rotate(-30deg);
          box-shadow: 0 6px 10px rgba(0,0,0,0.2);
          user-select: none;
          pointer-events: none;
          z-index: 10;
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #0b3d91;
          padding-bottom: 18px;
          margin-bottom: 35px;
        }
        .logo {
          height: 65px;
          object-fit: contain;
        }
        .header-title {
          font-size: 2.8rem;
          font-weight: 600;
          color: #0b3d91;
          flex-grow: 1;
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 12px;
        }
        thead th {
          text-align: center;
          color: #0b3d91;
          font-weight: 600;
          padding-bottom: 10px;
          font-size: 1.1rem;
        }
        tbody tr {
          background: #f0f4ff;
          border-radius: 8px;
          box-shadow: inset 0 0 0 1px #0b3d91;
        }
        tbody td {
          padding: 14px 10px;
          text-align: center;
          font-size: 1rem;
          color: #222;
          vertical-align: middle;
        }
        tbody tr td:first-child {
          border-radius: 8px 0 0 8px;
        }
        tbody tr td:last-child {
          border-radius: 0 8px 8px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: center;
        }
        .qr {
          width: 140px;
          height: 140px;
          border: 3px solid #0b3d91;
          border-radius: 12px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        }
      </style>
    </head>
    <body>
      <div class="facture-container">
        <div class="sticker">FACTURÉ</div>
        <header>
          <img src="${window.location.origin}/logo.png" alt="Logo" class="logo" />
          <div class="header-title">FACTURE</div>
          <div style="width:65px"></div> <!-- pour aligner -->
        </header>
  
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Nom</th>
              <th>Plaque</th>
              <th>Type</th>
              <th>Prix Unitaire</th>
              <th>Voyages</th>
              <th>Total</th>
              <th>Solde</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${f.date}</td>
              <td>${f.name}</td>
              <td>${f.truckPlate}</td>
              <td>${f.truckType}</td>
              <td>${f.unitPrice.toLocaleString()} FCFA</td>
              <td>${f.trips}</td>
              <td>${f.totalAmount.toLocaleString()} FCFA</td>
              <td>${f.balance.toLocaleString()} FCFA</td>
              <td>
  <span class="status-badge" style="background-color: ${statusColor(f.status)};">
    ${f.status < 0 ? 'Impayé' : f.status === 0 ? 'En attente' : 'Payé'} (${f.status.toLocaleString()} FCFA)
  </span>
</td>

              </td>
            </tr>
          </tbody>
        </table>
  
        <div class="footer">
          <img src="${qrUrl}" alt="QR Code" class="qr" />
        </div>
      </div>
    </body>
    </html>
    `;
  };
  
  const renderStatusBadge = (value) => {
    if (value < 0) return <Badge bg="danger">Solde insuffisant</Badge>;
    if (value === 0) return <Badge bg="warning">Solde nul</Badge>;
    return <Badge bg="success">Solde positif</Badge>;
  };

  return (
    <Container className="mt-4">
      <motion.h2
        className="text-center mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🚚 Génération de Facture
      </motion.h2>

      {/* Formulaire */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="p-4 shadow-lg rounded-3">
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Plaque</Form.Label>
                  <Form.Control name="truckPlate" value={form.truckPlate} onChange={handleChange} list="plates" required />
                  <datalist id="plates">
                    {truckers.map(t => <option key={t._id} value={t.truckPlate} />)}
                  </datalist>
                </Form.Group>
              </Col>
              <Col md={4}><Form.Group><Form.Label>Nom</Form.Label><Form.Control value={form.name} readOnly /></Form.Group></Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="truckType" value={form.truckType} onChange={handleChange} required>
                    <option value="">-- Choisir --</option>
                    {Object.keys(prixParType).map(type => <option key={type} value={type}>{type}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}><Form.Group><Form.Label>Prix Unitaire</Form.Label><Form.Control value={form.unitPrice} readOnly /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Voyages</Form.Label><Form.Control type="number" name="trips" value={form.trips} onChange={handleChange} min="0" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Total</Form.Label><Form.Control value={form.totalAmount} readOnly /></Form.Group></Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Solde</Form.Label><Form.Control value={form.balance} readOnly /></Form.Group></Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control value={form.status} readOnly style={{ backgroundColor: form.status < 0 ? '#ffe6e6' : '#e6ffe6' }} />
                    {renderStatusBadge(form.status)}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-between">
              <div>
                <Button type="submit" variant="primary">💰 Générer</Button>{' '}
                <Button variant="secondary" onClick={fetchHistorique}>📜 Historique</Button>
              </div>
              <small className="text-muted">Rouge = fonds insuffisants</small>
            </div>
          </Form>
        </Card>
      </motion.div>

      {/* Facture affichée */}
      <AnimatePresence>
  {facture && (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Card className="mt-5 p-4 shadow-lg border-primary facture-custom">
        <div className="facture-header">
          <img src="/logo.png" alt="Logo" className="facture-logo" />
          <h3>FACTURE</h3>
        </div>
        <Table bordered responsive className="facture-table">
          <tbody>
            {Object.entries({
              Date: facture.date,
              Nom: facture.name,
              Plaque: facture.truckPlate,
              Type: facture.truckType,
              'Prix Unitaire': facture.unitPrice.toLocaleString() + ' FCFA',
              Voyages: facture.trips,
              Total: facture.totalAmount.toLocaleString() + ' FCFA',
              Solde: facture.balance.toLocaleString() + ' FCFA',
              Statut: facture.status.toLocaleString() + ' FCFA'
            }).map(([label, val], i) => (
              <tr key={i}>
                <th>{label}</th>
                <td>
                  {label === 'Statut'
                    ? <>
                        {val} {renderStatusBadge(facture.status)}
                      </>
                    : val}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="facture-footer">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Facture%20${encodeURIComponent(facture.truckPlate)}%20-%20Total%20${facture.totalAmount}`}
            alt="QR Code"
            className="facture-qr"
          />
        </div>
        <div className="facture-sticker">FACTURÉ</div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button onClick={() => imprimerFacture(facture)} variant="outline-primary">🖨️ Imprimer / PDF</Button>
        </div>
      </Card>
    </motion.div>
  )}
</AnimatePresence>

      {/* Modal confirmation */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Voulez-vous vraiment générer cette facture pour <strong>{form.name}</strong> ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button variant="primary" onClick={confirmGenerate}>Confirmer</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal historique */}
      <Modal show={showHistorique} onHide={() => setShowHistorique(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Historique</Modal.Title></Modal.Header>
        <Modal.Body>
          {loadingHist ? (
            <div className="text-center p-4"><Spinner animation="border" /></div>
          ) : (
            <Table striped bordered hover responsive>
              <thead className="table-dark sticky-top">
                <tr>
                  <th>Date</th>
                  <th>Nom</th>
                  <th>Plaque</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Solde</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(f => (
                  <tr key={f._id}>
                    <td>{new Date(f.date).toLocaleString()}</td>
                    <td>{f.name}</td>
                    <td>{f.truckPlate}</td>
                    <td>{f.truckType}</td>
                    <td>{f.totalAmount.toLocaleString()} FCFA</td>
                    <td>{f.balance.toLocaleString()} FCFA</td>
                    <td>{renderStatusBadge(f.status)}</td>
                    <td><Button size="sm" variant="info" onClick={() => imprimerFacture(f)}>🖨️</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
