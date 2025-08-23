import React, { useState, useRef } from 'react';
import { Form, Button, Image, Card, Row, Col, Container } from 'react-bootstrap';
import axios from 'axios';
import logo from './logo.png'; // Logo de l’entreprise
import { motion } from 'framer-motion';

export default function CreateTrucker() {
  const [form, setForm] = useState({ name: '', truckPlate: '', truckType: '6 roues', balance: 0 });
  const [qr, setQr] = useState('');
  const [created, setCreated] = useState(false);
  const cardRef = useRef(null);

  const submit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/truckers', form);
      setQr(res.data.qr);
      setCreated(true);
    } catch (error) {
      alert('Erreur lors de la création : ' + (error.response?.data || error.message));
    }
  };

  const printCard = () => window.print();

  return (
    <Container className="py-5">
      <motion.h2
        className="text-center mb-4 fw-bold text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Créer un compte camionneur
      </motion.h2>

      <motion.div
        className="bg-light p-4 rounded-4 shadow-lg mx-auto"
        style={{ maxWidth: '600px' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Form onSubmit={submit}>
          <Form.Group className="mb-3">
            <Form.Label>Nom complet</Form.Label>
            <Form.Control
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nom et prénom"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Immatriculation</Form.Label>
            <Form.Control
              value={form.truckPlate}
              onChange={e => setForm({ ...form, truckPlate: e.target.value.toUpperCase() })}
              pattern={`[A-Z]{2}-\\d{3}-[A-Z]{2}`}
              placeholder="AB-123-CD"
              required
            />
            <Form.Text className="text-muted">Format Bénin: XX-999-XX</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Type de camion</Form.Label>
            <Form.Select
              value={form.truckType}
              onChange={e => setForm({ ...form, truckType: e.target.value })}
            >
              <option>6 roues</option>
              <option>10 roues</option>
              <option>12 roues</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Crédit initial (FCFA)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={form.balance}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setForm({ ...form, balance: isNaN(val) ? 0 : val });
              }}
            />
          </Form.Group>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button type="submit" className="w-100 btn btn-primary btn-lg">
              Créer & Générer QR-code
            </Button>
          </motion.div>
        </Form>
      </motion.div>

      {created && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-5"
        >
          <Card
            className="mx-auto shadow-lg p-4 rounded-4 border-0"
            style={{
              maxWidth: '450px',
              background: 'linear-gradient(135deg, #e0f7fa, #ffffff)',
              borderRadius: '20px',
            }}
            ref={cardRef}
            id="printableCard"
          >
            {/* <Row className="align-items-center">
              <Col xs={4}>
                <Image src={logo} fluid rounded />
              </Col>
              <Col>
                <h5 className="fw-bold mb-1 text-primary">{form.name}</h5>
                <p className="mb-1"><strong>Camion :</strong> {form.truckPlate}</p>
                <p className="mb-1"><strong>Type :</strong> {form.truckType}</p>
              </Col>
            </Row> */}

            <div className="text-center mt-3">
              {qr && <Image src={qr} alt="QR Code" fluid style={{ maxWidth: '150px' }} />}
            </div>

            {/* <div
              className="mt-4 p-2 border border-2 border-dashed rounded text-muted fst-italic"
              style={{ userSelect: 'none' }}
            >
              Zone puce RFID - Coller puce NFC ici
            </div> */}
          </Card>

          <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
            <a href={qr} download={`qr-${form.name}.png`} className="btn btn-outline-primary">
              Télécharger
            </a>
            <Button variant="success" onClick={printCard}>
              Imprimer la carte
            </Button>
          </div>
        </motion.div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printableCard, #printableCard * {
            visibility: visible;
          }
          #printableCard {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 400px;
            box-shadow: none !important;
            border: none !important;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </Container>
  );
}
