import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Container, Button, Form, Card, Row, Col, Table, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './GasoilDashboard.css'; // Re-adapted CSS for mobile-first styles
import logo from './logo.png';
import html2pdf from 'html2pdf.js'; // Note: This might not work as expected on native mobile devices.
// ... the rest of your imports
import { FaGasPump, FaTrash, FaFileExcel, FaTruck, FaWarehouse, FaHistory, FaPlus, FaCheck, FaTimes, FaSpinner, FaClock, FaPlay, FaStop, FaFileCsv, FaCamera } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx'; // Note: This might not work as expected on native mobile devices.
import moment from 'moment';

// =============================================================
//                   Fonctions Utilitaires
// =============================================================

// Formate un nombre pour l'affichage (ex: ajoute des séparateurs de milliers)
const formatNumber = (n) => (n === undefined || n === null ? '-' : n.toLocaleString());

// ... (fonctions d'exportation exportAllHistoryToExcel inchangées)

const exportAllHistoryToExcel = (data) => {
  // Implementation unchanged
};

// =============================================================
//                        Animations Framer Motion
// =============================================================

// Animations are fine and don't need changes for responsiveness
const pageVariants = {
    hidden: { opacity: 0, x: -100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

function GasoilDashboard() {
    // States
    const [truckers, setTruckers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [showForm, setShowForm] = useState(null); // 'addTrucker', 'attribGasoil', etc.

    const [newPlate, setNewPlate] = useState('');

    const [selectedPlate, setSelectedPlate] = useState('');
    const [liters, setLiters] = useState('');
    const [attribDate, setAttribDate] = useState('');
    const [machineType, setMachineType] = useState('6 roues');
    const [operator, setOperator] = useState('');
    const [activity, setActivity] = useState('');
    const [chauffeurName, setChauffeurName] = useState('');

    const [date, setDate] = useState('');
    const [fournisseur, setFournisseur] = useState('');
    const [quantite, setQuantite] = useState(0);
    const [prixUnitaire, setPrixUnitaire] = useState(0);
    const [approvisionnements, setApprovisionnements] = useState([]);
    const [receptionniste, setReceptionniste] = useState('');

    const [bilanData, setBilanData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [search, setSearch] = useState('');

    const [chronoRunning, setChronoRunning] = useState(false);
    const [chronoStart, setChronoStart] = useState(null);
    const [chronoDisplay, setChronoDisplay] = useState('00:00:00');
    const [volumeSable, setVolumeSable] = useState('');
    const [gasoilConsumed, setGasoilConsumed] = useState('');
    const [startKmPhoto, setStartKmPhoto] = useState(null);
    const [endKmPhoto, setEndKmPhoto] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [videoStream, setVideoStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [showDataInputs, setShowDataInputs] = useState(false);

    // ... (Effects and Data Fetching functions are unchanged)

    // Handlers
    const limits = {
        'CHARGEUSE': 300,
        'GRANDE DRAGUE': 200,
        'PETITE DRAGUE': 100
    };

    const fetchAll = async () => {
      // Implementation unchanged
    };

    const fetchTruckers = async () => {
      // Implementation unchanged
    };

    const fetchBilan = async () => {
      // Implementation unchanged
    };

    const fetchApprovisionnements = async () => {
      // Implementation unchanged
    };

    const fetchHistory = async () => {
      // Implementation unchanged
    };

    const handleDeleteAttribution = async (id) => {
      // Implementation unchanged
    };
    
    const handleAddTrucker = async (e) => {
      // Implementation unchanged
    };

    const handleAttribGasoil = async (e) => {
      // Implementation unchanged
    };

    const handleApprovisionnementSubmit = async (e) => {
      // Implementation unchanged
    };

    const takePhoto = (isEndPhoto = false) => {
        // Implementation unchanged
    };

    const handleStartChrono = async () => {
      // Implementation unchanged
    };

    const handleStopChrono = async (e) => {
      // Implementation unchanged
    };

    const handleTakePhoto = () => {
      // Implementation unchanged
    };

    const handleSaveData = async (e) => {
      // Implementation unchanged
    };

    const handleDeleteAppro = async (id) => {
      // Implementation unchanged
    };

    // Memoized data
    const attributionsHistory = useMemo(() => {
        // Implementation unchanged
    }, [historyData]);

    const chronoHistory = useMemo(() => {
        // Implementation unchanged
    }, [historyData]);

    const filteredAppro = useMemo(() => {
        // Implementation unchanged
    }, [approvisionnements, search]);

    const totalMontantAppro = useMemo(() => {
        // Implementation unchanged
    }, [approvisionnements]);

    const totalLitersAttributed = useMemo(() => {
        // Implementation unchanged
    }, [attributionsHistory]);

    const totalLitersUsed = useMemo(() => {
        // Implementation unchanged
    }, [chronoHistory]);

    const totalSable = useMemo(() => {
        // Implementation unchanged
    }, [chronoHistory]);

    const getGasoilDataForChart = () => {
      // Implementation unchanged
    };
    
    return (
        <div className="dashboard-container">
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

            {/* Main Section */}
            <div className="dashboard-main">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="dashboard-header-bar">
                    <div className="dashboard-logo-section">
                        <img src={logo} alt="Logo" className="dashboard-logo" />
                        <div className="dashboard-header-text">
                            <h4>Tableau de Bord Gasoil</h4>
                            <small>Suivi en temps réel des machines et du stock.</small>
                        </div>
                    </div>
                    <div className="dashboard-actions">
                        <Button variant="outline-dark" onClick={fetchAll} className="btn-icon w-100 mb-2">
                            <FaSpinner className="spin-on-hover" /> Actualiser
                        </Button>
                        <Button variant="outline-dark" onClick={() => exportAllHistoryToExcel({
                            attributions: attributionsHistory,
                            chrono: chronoHistory,
                            appro: filteredAppro,
                            totalLitersAttributed,
                            totalLitersUsed,
                            totalSable,
                            totalMontantAppro
                        })} className="btn-icon w-100">
                            <FaFileExcel /> Export Historique
                        </Button>
                    </div>
                </motion.div>

                {/* KPI Cards */}
                {/* `dashboard-kpi-grid` should be handled by CSS for flex-wrap or grid */}
                <motion.div variants={pageVariants} initial="hidden" animate="visible" className="dashboard-kpi-grid">
                    <motion.div variants={itemVariants} className="w-100">
                        <Card className="kpi-card card-glass">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title>Stock Restant</Card.Title>
                                        <Card.Text>
                                            <Badge bg="success" className="kpi-badge">{bilanData ? formatNumber(bilanData.restante) : '...'}</Badge> L
                                        </Card.Text>
                                    </div>
                                    <FaWarehouse className="kpi-icon" />
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} className="w-100">
                        <Card className="kpi-card card-glass">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title>Total Attribué</Card.Title>
                                        <Card.Text>
                                            <Badge bg="info" className="kpi-badge">{formatNumber(totalLitersAttributed)}</Badge> L
                                        </Card.Text>
                                    </div>
                                    <FaGasPump className="kpi-icon" />
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} className="w-100">
                        <Card className="kpi-card card-glass">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title>Total Machines</Card.Title>
                                        <Card.Text>
                                            <Badge bg="dark" className="kpi-badge">{truckers.length}</Badge>
                                        </Card.Text>
                                    </div>
                                    <FaTruck className="kpi-icon" />
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} className="w-100">
                        <Card className="kpi-card card-glass">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title>Total Sable</Card.Title>
                                        <Card.Text>
                                            <Badge bg="secondary" className="kpi-badge">{formatNumber(totalSable)}</Badge> m³
                                        </Card.Text>
                                    </div>
                                    <FaWarehouse className="kpi-icon" />
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Main Content Area with conditional rendering */}
                <div className="dashboard-content-area">
                    {/* Navigation Buttons as a sidebar or top bar */}
                    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="dashboard-nav-buttons w-100">
                        <Button variant={activeSection === 'dashboard' ? 'primary' : 'outline-primary'} onClick={() => setActiveSection('dashboard')} className="btn-nav w-100 mb-2">
                            Tableau de bord
                        </Button>
                        <Button variant={activeSection === 'forms' ? 'primary' : 'outline-primary'} onClick={() => setActiveSection('forms')} className="btn-nav w-100 mb-2">
                            Formulaires d'Actions
                        </Button>
                        <Button variant={activeSection === 'history' ? 'primary' : 'outline-primary'} onClick={() => setActiveSection('history')} className="btn-nav w-100">
                            Historique
                        </Button>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {activeSection === 'dashboard' && (
                            <motion.div key="dashboard-section" variants={pageVariants} initial="hidden" animate="visible" exit="hidden">
                                {/* Change Col sizes for mobile responsiveness */}
                                <Row className="g-4">
                                    <Col xs={12}>
                                        <Card className="dashboard-chart-card card-glass">
                                            <Card.Body>
                                                <Card.Title>Bilan de Stock de Gasoil</Card.Title>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Pie
                                                            data={getGasoilDataForChart()}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={100}
                                                            label={({ name, value }) => `${name}: ${formatNumber(value)} L`}
                                                        >
                                                            <Cell fill="#0088FE" />
                                                            <Cell fill="#00C49F" />
                                                            <Cell fill="#FFBB28" />
                                                            <Cell fill="#FF8042" />
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12}>
                                        <Card className="dashboard-chart-card card-glass">
                                            <Card.Body>
                                                <Card.Title>Top 5 des Consommateurs</Card.Title>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart
                                                        data={bilanData ? bilanData.bilan.sort((a, b) => b.totalLiters - a.totalLiters).slice(0, 5) : []}
                                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="truckPlate" />
                                                        <YAxis label={{ value: 'Litres', angle: -90, position: 'insideLeft' }} />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="totalLiters">
                                                            <Cell fill="#8884d8" />
                                                            <Cell fill="#82ca9d" />
                                                            <Cell fill="#ffc658" />
                                                            <Cell fill="#ff7300" />
                                                            <Cell fill="#2471A3" />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}

                        {activeSection === 'forms' && (
                            <motion.div key="forms-section" variants={pageVariants} initial="hidden" animate="visible" exit="hidden" className="form-sections-container">
                                {/* Change Col sizes for mobile responsiveness */}
                                <Row className="g-4">
                                    <Col xs={12}>
                                        <Card className="p-4 shadow-lg card-glass">
                                            <Card.Title>Actions Rapides</Card.Title>
                                            <div className="d-grid gap-2">
                                                <Button variant="success" size="lg" onClick={() => setShowForm('addTrucker')}>
                                                    <FaPlus /> Ajouter une Machine
                                                </Button>
                                                <Button variant="warning" size="lg" onClick={() => setShowForm('attribGasoil')}>
                                                    <FaGasPump /> Attribuer du Gasoil
                                                </Button>
                                                <Button variant="info" size="lg" onClick={() => setShowForm('chrono')}>
                                                    <FaClock /> Chrono Machine
                                                </Button>
                                                <Button variant="primary" size="lg" onClick={() => setShowForm('approvisionnement')}>
                                                    <FaWarehouse /> Approvisionner le Stock
                                                </Button>
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={12}>
                                        <AnimatePresence mode="wait">
                                            {/* All form components here */}
                                            {/* ... The rest of the forms are unchanged as they already fill the available space ... */}
                                            {showForm === 'addTrucker' && (
                                                <motion.div key="addTruckerForm" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                                                    <Card className="p-4 shadow-lg card-glass">
                                                        <h4 className="card-title-form"><FaPlus /> Ajout de machine</h4>
                                                        <Form onSubmit={handleAddTrucker}>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Machine</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    placeholder="Entrer le nom de la machine"
                                                                    value={newPlate}
                                                                    onChange={(e) => {
                                                                        const sanitizedInput = e.target.value.replace(/[^A-Z0-9 ]/g, '');
                                                                        const singleSpacedInput = sanitizedInput.replace(/ {2,}/g, ' ');
                                                                        setNewPlate(singleSpacedInput);
                                                                    }}
                                                                    required
                                                                />
                                                            </Form.Group>
                                                            <Button variant="success" type="submit" className="w-100"><FaCheck /> Ajouter</Button>
                                                            <Button variant="secondary" onClick={() => setShowForm(null)} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                        </Form>
                                                    </Card>
                                                </motion.div>
                                            )}

                                            {showForm === 'attribGasoil' && (
                                                <motion.div key="attribGasoilForm" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                                                    <Card className="p-4 shadow-lg card-glass">
                                                        <h4 className="card-title-form"><FaGasPump /> Attribution de Gasoil</h4>
                                                        <Form onSubmit={handleAttribGasoil}>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Machine</Form.Label>
                                                                <Form.Control as="select" value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} required>
                                                                    <option value="">Sélectionnez une machine</option>
                                                                    {truckers.map((t) => (
                                                                        <option key={t._id} value={t.truckPlate}>{t.truckPlate} ({t.name})</option>
                                                                    ))}
                                                                </Form.Control>
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Litres</Form.Label>
                                                                <Form.Control type="number" placeholder="Entrer les litres" value={liters} onChange={(e) => setLiters(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Date d'attribution</Form.Label>
                                                                <Form.Control type="date" value={attribDate} onChange={(e) => setAttribDate(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Nom de l'opérateur</Form.Label>
                                                                <Form.Control type="text" placeholder="Opérateur" value={operator} onChange={(e) => setOperator(e.target.value)} />
                                                            </Form.Group>
                                                            <Button variant="warning" type="submit" className="w-100"><FaCheck /> Attribuer</Button>
                                                            <Button variant="secondary" onClick={() => setShowForm(null)} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                        </Form>
                                                    </Card>
                                                </motion.div>
                                            )}

                                            {showForm === 'approvisionnement' && (
                                                <motion.div key="approForm" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                                                    <Card className="p-4 shadow-lg card-glass">
                                                        <h4 className="card-title-form"><FaWarehouse /> Approvisionnement du Stock</h4>
                                                        <Form onSubmit={handleApprovisionnementSubmit}>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Date</Form.Label>
                                                                <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Fournisseur</Form.Label>
                                                                <Form.Control type="text" placeholder="Nom du fournisseur" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Quantité (Litres)</Form.Label>
                                                                <Form.Control type="number" placeholder="Quantité" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-2">
                                                                <Form.Label>Prix Unitaire</Form.Label>
                                                                <Form.Control type="number" placeholder="Prix Unitaire" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} required />
                                                            </Form.Group>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label>Réceptionniste</Form.Label>
                                                                <Form.Control type="text" placeholder="Nom du réceptionniste" value={receptionniste} onChange={(e) => setReceptionniste(e.target.value)} required />
                                                            </Form.Group>
                                                            <Button variant="primary" type="submit" className="w-100"><FaCheck /> Enregistrer</Button>
                                                            <Button variant="secondary" onClick={() => setShowForm(null)} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                        </Form>
                                                    </Card>
                                                </motion.div>
                                            )}

                                            {showForm === 'chrono' && (
                                                <motion.div key="chronoForm" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                                                    <Card className="p-4 shadow-lg card-glass">
                                                        <h4 className="card-title-form"><FaClock /> Chrono Machine</h4>
                                                        {!chronoRunning && !showDataInputs && (
                                                            <Form>
                                                                <Form.Group className="mb-3">
                                                                    <Form.Label>Machine</Form.Label>
                                                                    <Form.Control as="select" value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} required>
                                                                        <option value="">Sélectionnez une machine</option>
                                                                        {truckers.map((t) => (
                                                                            <option key={t._id} value={t.truckPlate}>{t.truckPlate}</option>
                                                                        ))}
                                                                    </Form.Control>
                                                                </Form.Group>
                                                                <Form.Group className="mb-3">
                                                                    <Form.Label>Opérateur</Form.Label>
                                                                    <Form.Control type="text" placeholder="Opérateur" value={operator} onChange={(e) => setOperator(e.target.value)} required />
                                                                </Form.Group>
                                                                <Form.Group className="mb-3">
                                                                    <Form.Label>Activité</Form.Label>
                                                                    <Form.Control type="text" placeholder="Activité" value={activity} onChange={(e) => setActivity(e.target.value)} required />
                                                                </Form.Group>
                                                                <Button variant="success" className="w-100" onClick={handleStartChrono}><FaPlay /> Démarrer le Chrono</Button>
                                                                <Button variant="secondary" onClick={() => setShowForm(null)} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                            </Form>
                                                        )}
                                                        {cameraOpen && (
                                                            <div className="camera-container">
                                                                <video ref={videoRef} autoPlay style={{ width: '100%', borderRadius: '8px' }}></video>
                                                                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                                                                <Button onClick={handleTakePhoto} className="w-100 mt-3"><FaCamera /> Prendre la photo du compteur</Button>
                                                            </div>
                                                        )}

                                                        {chronoRunning && (
                                                            <Form>
                                                                <div className="chrono-display-container">
                                                                    <div className="chrono-display">{chronoDisplay}</div>
                                                                    <p>Machine: **{selectedPlate}**</p>
                                                                    <p>Opérateur: **{operator}**</p>
                                                                </div>
                                                                <Button variant="danger" type="button" onClick={handleStopChrono} className="w-100"><FaStop /> Arrêter le Chrono</Button>
                                                                <Button variant="secondary" onClick={() => { setChronoRunning(false); setShowForm(null); }} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                            </Form>
                                                        )}

                                                        {showDataInputs && (
                                                            <Form onSubmit={handleSaveData}>
                                                                <Form.Group className="mb-2">
                                                                    <Form.Label>Volume de sable (m³)</Form.Label>
                                                                    <Form.Control type="number" placeholder="Entrer le volume" value={volumeSable} onChange={(e) => setVolumeSable(e.target.value)} required />
                                                                </Form.Group>
                                                                <Form.Group className="mb-3">
                                                                    <Form.Label>Nbre de voyages</Form.Label>
                                                                    <Form.Control type="number" placeholder="Entrer le gasoil consommé" value={gasoilConsumed} onChange={(e) => setGasoilConsumed(e.target.value)} required />
                                                                </Form.Group>
                                                                <Button variant="success" type="submit" className="w-100"><FaCheck /> Enregistrer les données</Button>
                                                                <Button variant="secondary" onClick={() => setShowForm(null)} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                                            </Form>
                                                        )}
                                                    </Card>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}

                        {activeSection === 'history' && (
                            <motion.div key="history-section" variants={pageVariants} initial="hidden" animate="visible" exit="hidden">
                                <Card className="p-4 shadow-lg card-glass">
                                    <Card.Title>Historique des Attributions</Card.Title>
                                    <div className="d-flex flex-column flex-sm-row justify-content-between mb-3">
                                        <InputGroup className="w-100 me-sm-2 mb-2 mb-sm-0">
                                            <Form.Control type="text" placeholder="Rechercher par plaque, chauffeur, etc." value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </InputGroup>
                                        <Button variant="outline-dark" onClick={() => exportAllHistoryToExcel({
                                            attributions: attributionsHistory,
                                            chrono: chronoHistory,
                                            appro: filteredAppro,
                                            totalLitersAttributed,
                                            totalLitersUsed,
                                            totalSable,
                                            totalMontantAppro
                                        })} className="btn-icon w-100">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="mt-3">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Machine</th>
                                                    <th>Litres</th>
                                                    <th>Opérateur</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan="5" className="text-center"><Spinner animation="border" /> Chargement...</td></tr>
                                                ) : attributionsHistory.length > 0 ? (
                                                    attributionsHistory.map((h, index) => (
                                                        <tr key={index}>
                                                            <td>{new Date(h.date).toLocaleDateString()}</td>
                                                            <td>{h.truckPlate}</td>
                                                            <td>{formatNumber(h.liters)}</td>
                                                            <td>{h.operator || 'N/A'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="5" className="text-center">Aucune attribution trouvée.</td></tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="2">Total Cumulé</td>
                                                    <td>{formatNumber(totalLitersAttributed)} L</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </Card>
                                <Card className="p-4 shadow-lg card-glass mt-4">
                                    <Card.Title>Historique des Utilisations (Chrono)</Card.Title>
                                    <div className="d-flex flex-column flex-sm-row justify-content-end mb-3">
                                        <Button variant="outline-dark" onClick={() => exportAllHistoryToExcel({
                                            attributions: attributionsHistory,
                                            chrono: chronoHistory,
                                            appro: filteredAppro,
                                            totalLitersAttributed,
                                            totalLitersUsed,
                                            totalSable,
                                            totalMontantAppro
                                        })} className="btn-icon w-100">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="mt-3">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Machine</th>
                                                    <th>Chauffeur</th>
                                                    <th>Durée</th>
                                                    <th>Nombre de voyages</th>
                                                    <th>Volume Sable (m³)</th>
                                                    <th>Activité</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan="6" className="text-center"><Spinner animation="border" /> Chargement...</td></tr>
                                                ) : chronoHistory.length > 0 ? (
                                                    chronoHistory.map((h, index) => (
                                                        <tr key={index}>
                                                            <td>{new Date(h.date).toLocaleDateString()}</td>
                                                            <td>{h.truckPlate}</td>
                                                            <td>{h.chauffeurName}</td>
                                                            <td>{h.duration}</td>
                                                            <td>{formatNumber(h.gasoilConsumed)}</td>
                                                            <td>{formatNumber(h.volumeSable)}</td>
                                                            <td>{h.activity}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="6" className="text-center">Aucune utilisation trouvée.</td></tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="4">Total Cumulé</td>
                                                    <td>{formatNumber(totalLitersUsed)} </td>
                                                    <td>{formatNumber(totalSable)} m³</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </Card>

                                <Card className="p-4 shadow-lg card-glass mt-4">
                                    <Card.Title>Historique des Approvisionnements</Card.Title>
                                    <div className="d-flex flex-column flex-sm-row justify-content-end mb-3">
                                        <Button variant="outline-dark" onClick={() => exportAllHistoryToExcel({
                                            attributions: attributionsHistory,
                                            chrono: chronoHistory,
                                            appro: filteredAppro,
                                            totalLitersAttributed,
                                            totalLitersUsed,
                                            totalSable,
                                            totalMontantAppro
                                        })} className="btn-icon w-100">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="mt-3">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Fournisseur</th>
                                                    <th>Quantité (L)</th>
                                                    <th>Prix Unitaire</th>
                                                    <th>Montant Total</th>
                                                    <th>Réceptionniste</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan="5" className="text-center"><Spinner animation="border" /> Chargement...</td></tr>
                                                ) : filteredAppro.length > 0 ? (
                                                    filteredAppro.map((a, index) => (
                                                        <tr key={index}>
                                                            <td>{new Date(a.date).toLocaleDateString()}</td>
                                                            <td>{a.fournisseur}</td>
                                                            <td>{formatNumber(a.quantite)}</td>
                                                            <td>{formatNumber(a.prixUnitaire)} FCFA</td>
                                                            <td>{formatNumber(a.montantTotal)} FCFA</td>
                                                            <td>{a.receptionniste}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="5" className="text-center">Aucun approvisionnement trouvé.</td></tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="4">Total Cumulé</td>
                                                    <td>{formatNumber(totalMontantAppro)} FCFA</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default GasoilDashboard;