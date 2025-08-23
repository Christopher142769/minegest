import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Form,
  Card,
  Row,
  Col,
  Table,
  Spinner,
  Alert,
} from 'react-bootstrap';

function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [showBilan, setShowBilan] = useState(false);
  const [loadingBilan, setLoadingBilan] = useState(false);
  const [bilanData, setBilanData] = useState(null);

  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState(0);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const u = parseFloat(unitPrice);
    const q = parseInt(quantity, 10);
    setTotal(!isNaN(u) && !isNaN(q) ? u * q : 0);
  }, [unitPrice, quantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!name.trim() || !unitPrice || !quantity) {
      setError('Tous les champs sont obligatoires');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: name.trim(),
          unitPrice: parseFloat(unitPrice),
          quantity: parseInt(quantity, 10),
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de l\'ajout');
      await res.json();
      setMessage('Achat ajouté avec succès !');
      setName('');
      setUnitPrice('');
      setQuantity('');
      setTotal(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchBilan = async () => {
    setLoadingBilan(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/maintenance/bilan');
      if (!res.ok) throw new Error('Erreur récupération bilan');
      const { bilan, totalGlobalAmount } = await res.json();
      setBilanData({ bilan, totalGlobalAmount });
      setShowBilan(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBilan(false);
    }
  };

  return (
    <Container className="my-5">
      <h2 className="mb-4 text-center">Gestion Maintenance 🛠️</h2>

      <Row className="mb-4 justify-content-center gap-3">
        <Col xs="auto">
          <Button
            variant="success"
            size="lg"
            onClick={() => {
              setShowForm(!showForm);
              setShowBilan(false);
              setMessage(null);
              setError(null);
            }}
          >
            🛒 Achat maintenance
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            variant="info"
            size="lg"
            onClick={() => {
              fetchBilan();
              setShowForm(false);
            }}
            disabled={loadingBilan}
          >
            {loadingBilan ? <Spinner animation="border" size="sm" /> : '📊 Bilan maintenance'}
          </Button>
        </Col>
      </Row>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {showForm && (
        <Card className="mb-4 shadow p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nom de l'achat</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Courroie"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prix unitaire</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                placeholder="Ex: 2020.5"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Ex: 10"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Total</Form.Label>
              <Form.Control type="number" value={total} readOnly plaintext />
            </Form.Group>

            <Button type="submit" variant="success" className="w-100">
              Faire l'achat
            </Button>
          </Form>
        </Card>
      )}

      {showBilan && bilanData && (
        <Card className="shadow">
          <Card.Body>
            <h4>Bilan maintenance</h4>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Nombre total</th>
                  <th>Montant total (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {bilanData.bilan.map((cat) => (
                  <tr key={cat.itemName}>
                    <td>{cat.itemName}</td>
                    <td>{cat.totalQuantity}</td>
                    <td>{cat.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="2" className="text-end fw-bold">
                    Total Général
                  </td>
                  <td className="fw-bold text-primary">
                    {bilanData.totalGlobalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default MaintenancePage;
