import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Spinner } from "react-bootstrap";
import { motion } from "framer-motion";
import axios from "axios";
import logo from './logo.png';
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DepensePage = () => {
  const [soldeInitial, setSoldeInitial] = useState(0);
  const [depenseGasoil, setDepenseGasoil] = useState(0);
  const [depenseMaintenance, setDepenseMaintenance] = useState(0);
  const [détailsGasoil, setDétailsGasoil] = useState([]);
  const [détailsMaintenance, setDétailsMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  const chargerDonnées = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/bilan-complet");
      setSoldeInitial(res.data.soldeInitial || 0);
      setDepenseGasoil(res.data.depenseGasoil || 0);
      setDepenseMaintenance(res.data.depenseMaintenance || 0);
      setDétailsGasoil(res.data.detailsGasoil || []);
      setDétailsMaintenance(res.data.detailsMaintenance || []);
    } catch (err) {
      console.error("Erreur chargement dépenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnées();
    const interval = setInterval(chargerDonnées, 15000);
    return () => clearInterval(interval);
  }, []);

  const soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;

  const chartData = {
    labels: ["Gasoil", "Maintenance"],
    datasets: [
      {
        label: "Dépenses (FCFA)",
        data: [depenseGasoil, depenseMaintenance],
        fill: false,
        borderColor: "#007bff",
        backgroundColor: "#007bff",
        tension: 0.3
      }
    ]
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement des données...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      {/* HEADER */}
      <header className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <img src={logo} alt="Logo" style={{ height: "50px" }} />
          <h2 className="fw-bold mb-0">Dashboard Dépenses</h2>
        </div>
        <Button variant="primary" onClick={chargerDonnées}>
          🔄 Actualiser
        </Button>
      </header>

      {/* STATS */}
      <Row className="mb-4">
        <Col md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-sm text-center p-3 border-0">
              <h5>💳 Solde Initial</h5>
              <h3 className="text-success fw-bold">
                {soldeInitial.toLocaleString()} FCFA
              </h3>
            </Card>
          </motion.div>
        </Col>
        <Col md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-sm text-center p-3 border-0">
              <h5>💰 Solde Actuel</h5>
              <h3 className="text-primary fw-bold">
                {soldeActuel.toLocaleString()} FCFA
              </h3>
            </Card>
          </motion.div>
        </Col>
        <Col md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-sm text-center p-3 border-0">
              <h5>📉 Dépenses Totales</h5>
              <h3 className="text-danger fw-bold">
                {(depenseGasoil + depenseMaintenance).toLocaleString()} FCFA
              </h3>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* GRAPH */}
     <Card className="mb-5 shadow-lg border-0 p-4">
  <h4 className="mb-4 fw-bold">📊 Evolution des Dépenses</h4>
  <Line
    data={{
      ...chartData,
      datasets: [
        {
          ...chartData.datasets[0],
          backgroundColor: "rgba(0, 123, 255, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#007bff",
          pointHoverRadius: 8,
        },
      ],
    }}
    options={{
      responsive: true,
      plugins: {
        legend: { labels: { font: { size: 14 } } },
        tooltip: { backgroundColor: "#333", titleFont: { size: 14 }, bodyFont: { size: 12 } }
      },
      scales: {
        x: { ticks: { font: { size: 12 } } },
        y: { ticks: { font: { size: 12 } } }
      }
    }}
  />
</Card>

      <Row>
        {/* TABLE GASOIL */}
        <Col md={6}>
          <Card className="shadow-sm border-0 p-3 mb-4">
            <h5>⛽ Approvisionnements Gasoil</h5>
            <Table hover responsive>
              <thead className="table-primary">
                <tr>
                  <th>Date</th>
                  <th>Fournisseur</th>
                  <th>Quantité (L)</th>
                  <th>Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {détailsGasoil.length > 0 ? (
                  détailsGasoil.map((item, idx) => (
                    <tr key={idx}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.fournisseur}</td>
                      <td>{item.quantite?.toLocaleString()}</td>
                      <td>{item.montantTotal?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      Aucun approvisionnement
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </Col>

        {/* TABLE MAINTENANCE */}
        <Col md={6}>
          <Card className="shadow-sm border-0 p-3 mb-4">
            <h5>🔧 Dépenses Maintenance</h5>
            <Table hover responsive>
              <thead className="table-danger">
                <tr>
                  <th>Article</th>
                  <th>Quantité</th>
                  <th>Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {détailsMaintenance.length > 0 ? (
                  détailsMaintenance.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.itemName}</td>
                      <td>{item.totalQuantity}</td>
                      <td>{item.totalAmount?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">
                      Aucun achat
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DepensePage;
