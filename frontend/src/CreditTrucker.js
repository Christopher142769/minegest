import React, { useState } from 'react';
import { Form, Button, Table, Container, Row, Col, Card, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function CreditTrucker() {
  const [plate, setPlate] = useState('');
  const [results, setResults] = useState([]);
  const [amount, setAmount] = useState(0);

  const search = async () => {
    const res = await axios.get('http://localhost:5000/api/truckers', {
      params: { plate }
    });
    setResults(res.data);
  };

  const credit = async id => {
    await axios.post(`http://localhost:5000/api/truckers/${id}/credit`, {
      amount: parseFloat(amount)
    });
    search();
  };

  return (
    <Container className="py-5">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-center mb-4 fw-bold" style={{ color: '#3A0CA3' }}>
          Créditer un compte camionneur
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-lg rounded-4 p-4">
          <Form>
            <Row className="align-items-center">
              <Col xs={12} md={8}>
                <InputGroup>
                  <Form.Control
                    placeholder="Entrez la plaque d'immatriculation"
                    value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    className="rounded-start-4"
                  />
                  <Button
                    onClick={search}
                    variant="primary"
                    className="rounded-end-4"
                  >
                    Rechercher
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Form>
        </Card>
      </motion.div>

      {results.length > 0 && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="shadow-lg rounded-4 p-4">
            <h4 className="mb-4 text-center">Résultats</h4>
            <div className="table-responsive">
              <Table striped bordered hover className="align-middle text-center">
                <thead className="table-dark">
                  <tr>
                    <th>Nom</th>
                    <th>Plaque</th>
                    <th>Type</th>
                    <th>Solde (FCFA)</th>
                    <th>Montant à ajouter</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(t => (
                    <motion.tr
                      key={t._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td>{t.name}</td>
                      <td>{t.truckPlate}</td>
                      <td>{t.truckType}</td>
                      <td>{t.balance.toLocaleString()}</td>
                      <td>
                        <Form.Control
                          type="number"
                          size="sm"
                          onChange={e => setAmount(e.target.value)}
                          placeholder="Montant"
                        />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => credit(t._id)}
                        >
                          Créditer
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </motion.div>
      )}
    </Container>
  );
}
