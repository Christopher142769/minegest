import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Spinner, Badge } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaTruck, FaGasPump, FaTools, FaMoneyBillWave } from "react-icons/fa";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import axios from "axios";

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [bilan, setBilan] = useState({});
  const [factures, setFactures] = useState([]);
  const [appros, setAppros] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bilanRes = await axios.get("http://localhost:5000/api/bilan-complet");
        const facturesRes = await axios.get("http://localhost:5000/api/factures");
        const approRes = await axios.get("http://localhost:5000/api/approvisionnement");
        const maintRes = await axios.get("http://localhost:5000/api/maintenance");

        setBilan(bilanRes.data);
        setFactures(facturesRes.data);
        setAppros(approRes.data);
        setMaintenance(maintRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" /> Chargement du tableau de bord...
      </div>
    );
  }

  // 📊 Données pour le BarChart
  const barData = [
    { name: "Dépenses Gasoil", montant: bilan.depenseGasoil || 0 },
    { name: "Dépenses Maintenance", montant: bilan.depenseMaintenance || 0 },
    { name: "Solde Actuel", montant: bilan.soldeActuel || 0 },
  ];

  // 📈 Données pour le LineChart (approvisionnements gasoil dans le temps)
  const approData = appros.map((a) => ({
    date: new Date(a.date).toLocaleDateString(),
    quantite: a.quantite,
  }));

  // 📈 Données factures dans le temps
  const facturesData = factures.map((f) => ({
    date: new Date(f.date).toLocaleDateString(),
    montant: f.totalAmount,
  }));

  return (
    <Container fluid className="py-4" style={{ background: "#f8f9fa" }}>
      <h2 className="mb-4 fw-bold text-center">📊 Tableau de bord Administrateur</h2>

      {/* Cartes principales */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="shadow-sm border-0 text-center p-3">
              <FaMoneyBillWave size={40} color="#28a745" />
              <h5 className="mt-2">Solde initial</h5>
              <h3 className="fw-bold text-success">{bilan.soldeInitial?.toLocaleString()} FCFA</h3>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="shadow-sm border-0 text-center p-3">
              <FaGasPump size={40} color="#dc3545" />
              <h5 className="mt-2">Dépenses Gasoil</h5>
              <h3 className="fw-bold text-danger">{bilan.depenseGasoil?.toLocaleString()} FCFA</h3>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="shadow-sm border-0 text-center p-3">
              <FaTools size={40} color="#ffc107" />
              <h5 className="mt-2">Dépenses Maintenance</h5>
              <h3 className="fw-bold text-warning">{bilan.depenseMaintenance?.toLocaleString()} FCFA</h3>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="shadow-sm border-0 text-center p-3">
              <FaMoneyBillWave size={40} color="#007bff" />
              <h5 className="mt-2">Solde Actuel</h5>
              <h3 className="fw-bold text-primary">{bilan.soldeActuel?.toLocaleString()} FCFA</h3>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Graphiques */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white fw-bold">📊 Répartition Dépenses</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="montant" fill="#007bff" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-success text-white fw-bold">⛽ Approvisionnements Gasoil</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={approData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="quantite" stroke="#28a745" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-warning text-dark fw-bold">📄 Montant des Factures</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={facturesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="montant" stroke="#ffc107" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
