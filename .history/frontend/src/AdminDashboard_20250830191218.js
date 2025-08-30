import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Container, Button, Form, Card, Row, Col, Table, Spinner, Badge, InputGroup, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './GasoilDashboard.css';
import logo from './logo.png';
import html2pdf from 'html2pdf.js';
import {
    FaGasPump,
    FaTrash,
    FaFileExcel,
    FaTruck,
    FaWarehouse,
    FaHistory,
    FaPlus,
    FaCheck,
    FaTimes,
    FaSpinner,
    FaClock,
    FaPlay,
    FaStop,
    FaFileCsv,
    FaCamera,
    FaUserShield,
    FaChartLine,
    FaBoxes,
    FaEuroSign,
    FaCalendarAlt,
    FaPowerOff,
    FaCog,
    FaBars,
    FaChartBar,
    FaCubes,
    FaMoneyBillWave,
    FaUsers,
    FaSignOutAlt
} from 'react-icons/fa';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import * as XLSX from 'xlsx';
import moment from 'moment';

const pageVariants = {
    initial: { opacity: 0, y: 50 },
    in: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14, staggerChildren: 0.2 } },
    out: { opacity: 0, y: -50, transition: { duration: 0.5 } },
};

const itemVariants = {
    initial: { opacity: 0, y: 30, scale: 0.9 },
    in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const formatNumber = (n) => (n === undefined || n === null ? '-' : n.toLocaleString());

const exportAllHistoryToExcel = (data) => {
    // Votre fonction existante ici
};

const limits = {
    'CHARGEUSE': 300,
    'GRANDE DRAGUE': 200,
    'PETITE DRAGUE': 100
};

function GasoilDashboard() {
    const [truckers, setTruckers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [filterDate, setFilterDate] = useState(moment().format('YYYY-MM-DD'));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('desc');
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
    const [showAddTruckerModal, setShowAddTruckerModal] = useState(false);
    const [showAttribGasoilModal, setShowAttribGasoilModal] = useState(false);
    const [showApprovisionnementModal, setShowApprovisionnementModal] = useState(false);
    const [showChronoModal, setShowChronoModal] = useState(false);
    const [showAddSellerModal, setShowAddSellerModal] = useState(false);
    const [newSellerUsername, setNewSellerUsername] = useState('');
    const [newSellerPassword, setNewSellerPassword] = useState('');
    const [sellersHistory, setSellersHistory] = useState([]);

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        let timer;
        if (chronoRunning) {
            timer = setInterval(() => {
                const diffMs = Date.now() - chronoStart;
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                const formattedTime = [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')].join(':');
                setChronoDisplay(formattedTime);
            }, 1000);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [chronoRunning, chronoStart]);

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchTruckers(), fetchBilan(), fetchApprovisionnements(), fetchHistory(), fetchSellersHistory()]);
        setLoading(false);
    };

    const fetchTruckers = async () => {
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/truckers');
            const data = await res.json();
            setTruckers(data || []);
        } catch (err) {
            toast.error('Erreur chargement machines');
        }
    };

    const fetchBilan = async () => {
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/gasoil/bilan');
            const data = await res.json();
            setBilanData(data);
        } catch (err) {
            toast.error('Erreur récupération bilan');
        }
    };

    const fetchApprovisionnements = async () => {
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/approvisionnement');
            const data = await res.json();
            setApprovisionnements(data || []);
        } catch (err) {
            toast.error('Erreur chargement des approvisionnements');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/attributions');
            if (!res.ok) throw new Error('Erreur chargement historique');
            const data = await res.json();
            setHistoryData(data);
        } catch (err) {
            toast.error(err.message || 'Erreur historique');
        }
    };

    const fetchSellersHistory = async () => {
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/users');
            if (!res.ok) {
                throw new Error('Erreur lors de la récupération des utilisateurs.');
            }
            const users = await res.json();
            const sellers = users.filter(user => user.role === 'Vendeur');
            setSellersHistory(sellers);
        } catch (err) {
            toast.error(err.message || 'Erreur lors du chargement de l\'historique.');
        }
    };

    const handleDeleteAttribution = async (id) => {
        if (!id) {
            console.error("Erreur : L'ID d'attribution est manquant.");
            toast.error("Impossible de supprimer : ID manquant.");
            return;
        }

        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette attribution de gasoil ?')) {
            try {
                const res = await fetch(`https://minegest.pro-aquacademy.com/api/attribution-gasoil/${id}`, {
                    method: 'DELETE',
                });

                if (!res.ok) {
                    const contentType = res.headers.get("content-type");
                    let errorData;
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        errorData = await res.json();
                    } else {
                        errorData = await res.text();
                    }
                    throw new Error(errorData.message || errorData || 'Erreur inconnue lors de la suppression.');
                }
                await fetchAll();
                toast.success('Attribution supprimée avec succès.');

            } catch (err) {
                toast.error(err.message || 'Erreur de suppression.');
            }
        }
    };

    const handleAddTrucker = async (e) => {
        e.preventDefault();
        if (!newPlate) {
            return toast.error('Veuillez remplir le champ "Machine".');
        }
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/truckers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ truckPlate: newPlate }),
            });
            if (!res.ok) throw new Error('Erreur lors de la création de la machine.');
            await fetchTruckers();
            setShowAddTruckerModal(false);
            setNewPlate('');
            toast.success('Machine ajoutée avec succès 🎉');
        } catch (err) {
            toast.error(err.message || 'Erreur création');
        }
    };

    const handleAttribGasoil = async (e) => {
        e.preventDefault();
        if (!selectedPlate || !liters || !attribDate) {
            return toast.error('Veuillez remplir tous les champs obligatoires.');
        }
        const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
        if (!trucker) {
            return toast.error('Plaque non trouvée.');
        }
        const litersToAttrib = Number(liters);
        const machineName = selectedPlate.toUpperCase();
        const limit = limits[machineName];
        if (limit && litersToAttrib > limit) {
            return toast.error(`Impossible d'attribuer plus de ${limit} L à la machine "${selectedPlate}".`);
        }
        try {
            const res = await fetch(`https://minegest.pro-aquacademy.com/api/truckers/${trucker._id}/gasoil`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    liters: litersToAttrib,
                    date: attribDate,
                    machineType,
                    operator,
                    name: chauffeurName,
                    activity,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Erreur lors de l\'attribution.');
            }
            await fetchAll();
            toast.success('Gasoil attribué ✅');
            setShowAttribGasoilModal(false);
            setSelectedPlate('');
            setLiters('');
            setAttribDate('');
            setOperator('');
            setActivity('');
            setChauffeurName('');
        } catch (err) {
            toast.error(err.message || 'Erreur');
        }
    };

    const handleApprovisionnementSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/approvisionnement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, fournisseur, quantite, prixUnitaire, receptionniste }),
            });
            if (!res.ok) throw new Error('Erreur d\'approvisionnement.');
            toast.success('Approvisionnement enregistré ✅');
            setShowApprovisionnementModal(false);
            setDate('');
            setFournisseur('');
            setQuantite(0);
            setPrixUnitaire(0);
            setReceptionniste('');
            await fetchAll();
        } catch {
            toast.error('Erreur d\'approvisionnement.');
        }
    };

    const takePhoto = (isEndPhoto = false) => {
        return new Promise(async (resolve) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setVideoStream(stream);
                setCameraOpen(true);
                toast.info(`Veuillez prendre en photo le compteur de la machine.`);
                resolve(true);
            } catch (err) {
                console.error("Erreur d'accès à la caméra :", err);
                toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
                resolve(false);
            }
        });
    };

    const handleStartChrono = async () => {
        if (!selectedPlate || !operator || !activity) {
            return toast.error('Veuillez remplir tous les champs.');
        }
        if (selectedPlate === 'CHARGEUSE') {
            const hasCamera = await takePhoto();
            if (!hasCamera) return;
        } else {
            setChronoRunning(true);
            setChronoStart(Date.now());
            toast.info("Chrono démarré.");
        }
    };

    const handleStopChrono = async (e) => {
        e.preventDefault();
        setChronoRunning(false);
        if (selectedPlate === 'CHARGEUSE') {
            const hasCamera = await takePhoto(true);
            if (!hasCamera) return;
        }
        setShowDataInputs(true);
        toast.info('Chrono arrêté. Veuillez entrer les données.');
    };

    const handleTakePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        const isEndPhoto = chronoRunning;
        if (isEndPhoto) {
            setEndKmPhoto(imageDataUrl);
            toast.success('Photo de fin prise ✅');
        } else {
            setStartKmPhoto(imageDataUrl);
            toast.success('Photo de début prise ✅');
            setChronoRunning(true);
            setChronoStart(Date.now());
        }
        videoStream.getTracks().forEach(track => track.stop());
        setCameraOpen(false);
        setVideoStream(null);
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        if (!volumeSable || !gasoilConsumed) {
            return toast.error('Veuillez entrer le volume de sable et le gasoil consommé.');
        }
        const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
        if (!trucker) {
            return toast.error('Plaque non trouvée.');
        }
        const endTime = new Date();
        const durationMs = endTime.getTime() - chronoStart;
        const durationHours = Math.floor(durationMs / 3600000);
        const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
        const duration = `${durationHours}h ${durationMinutes}m`;
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/gasoil/attribution-chrono', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    truckPlate: selectedPlate, liters: Number(gasoilConsumed), machineType: trucker.truckType,
                    startTime: new Date(chronoStart).toLocaleTimeString(), endTime: endTime.toLocaleTimeString(), duration, operator, activity,
                    gasoilConsumed: Number(gasoilConsumed), volumeSable: Number(volumeSable),
                    startKmPhoto: selectedPlate === 'CHARGEUSE' ? startKmPhoto : null,
                    endKmPhoto: selectedPlate === 'CHARGEUSE' ? endKmPhoto : null,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'utilisation.');
            }
            toast.success('Utilisation enregistrée ✅');
            setShowChronoModal(false);
            setChronoStart(null);
            setChronoDisplay('00:00:00');
            setSelectedPlate('');
            setOperator('');
            setActivity('');
            setGasoilConsumed('');
            setVolumeSable('');
            setShowDataInputs(false);
            setStartKmPhoto(null);
            setEndKmPhoto(null);
            await fetchAll();
        } catch (err) {
            toast.error(err.message || 'Erreur');
        }
    };

    const handleDeleteAppro = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet approvisionnement ?')) {
            try {
                const res = await fetch(`https://minegest.pro-aquacademy.com/api/approvisionnement/${id}`, {
                    method: 'DELETE',
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Erreur lors de la suppression.');
                }
                await fetchApprovisionnements();
                toast.success('Approvisionnement supprimé avec succès.');
            } catch (err) {
                toast.error(err.message || 'Erreur de suppression.');
            }
        }
    };

    const handleAddSeller = async (e) => {
        e.preventDefault();
        if (!newSellerUsername || !newSellerPassword) {
            toast.error('Veuillez remplir le nom et le mot de passe.');
            return;
        }
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newSellerUsername,
                    password: newSellerPassword,
                    role: 'Vendeur'
                }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Erreur lors de la création du vendeur.');
            }
            await fetchSellersHistory();
            toast.success('Vendeur ajouté avec succès 🎉');
            setShowAddSellerModal(false);
            setNewSellerUsername('');
            setNewSellerPassword('');
        } catch (err) {
            toast.error(err.message || 'Erreur création');
        }
    };

    const handleShowAddTrucker = () => setShowAddTruckerModal(true);
    const handleCloseAddTrucker = () => setShowAddTruckerModal(false);
    const handleShowAttribGasoil = () => setShowAttribGasoilModal(true);
    const handleCloseAttribGasoil = () => setShowAttribGasoilModal(false);
    const handleShowApprovisionnement = () => setShowApprovisionnementModal(true);
    const handleCloseApprovisionnement = () => setShowApprovisionnementModal(false);
    const handleShowChrono = () => setShowChronoModal(true);
    const handleCloseChrono = () => {
        setShowChronoModal(false);
        setChronoRunning(false);
        setShowDataInputs(false);
    };
    const handleShowAddSeller = () => setShowAddSellerModal(true);
    const handleCloseAddSeller = () => setShowAddSellerModal(false);

    const attributionsHistory = useMemo(() => historyData.filter(h => h.liters && !h.startTime), [historyData]);
    const chronoHistory = useMemo(() => historyData.filter(h => h.startTime), [historyData]);

    const totalLitersAttributed = useMemo(() => attributionsHistory.reduce((acc, curr) => acc + (curr.liters || 0), 0), [attributionsHistory]);
    const stockRestant = useMemo(() => bilanData ? bilanData.totalAppro - totalLitersAttributed : 0, [bilanData, totalLitersAttributed]);

    const filteredChronoHistory = useMemo(() => {
        return chronoHistory.filter(h => moment(h.date).format('YYYY-MM-DD') === filterDate);
    }, [chronoHistory, filterDate]);

    const filteredAttributionsHistory = useMemo(() => {
        return attributionsHistory.filter(h => moment(h.date).format('YYYY-MM-DD') === filterDate);
    }, [attributionsHistory, filterDate]);

    const totalLitersAttributedDaily = useMemo(() => {
        return filteredAttributionsHistory.reduce((acc, curr) => acc + (curr.liters || 0), 0);
    }, [filteredAttributionsHistory]);

    const totalSableDaily = useMemo(() => {
        return filteredChronoHistory.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0);
    }, [filteredChronoHistory]);

    const totalDurationDaily = useMemo(() => {
        return filteredChronoHistory.reduce((acc, curr) => {
            if (curr.duration) {
                const [hours, minutes] = curr.duration.match(/(\d+)h (\d+)m/).slice(1).map(Number);
                return acc + (hours * 60) + minutes;
            }
            return acc;
        }, 0);
    }, [filteredChronoHistory]);

    const getGasoilDataForChart = () => {
        if (!bilanData) return [];
        return [
            { name: 'Total Approvisionné', value: bilanData.totalAppro },
            { name: 'Total Attribué', value: totalLitersAttributed },
            { name: 'Stock Restant', value: stockRestant },
        ];
    };

    const getDailySableData = useMemo(() => {
        const aggregatedData = filteredChronoHistory.reduce((acc, curr) => {
            if (curr.truckPlate && curr.volumeSable) {
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += curr.volumeSable;
            }
            return acc;
        }, {});
        return Object.keys(aggregatedData).map(key => ({ name: key, volumeSable: aggregatedData[key] })).sort((a, b) => b.volumeSable - a.volumeSable);
    }, [filteredChronoHistory]);

    const getDailyDurationData = useMemo(() => {
        const aggregatedData = filteredChronoHistory.reduce((acc, curr) => {
            if (curr.truckPlate && curr.duration) {
                const [hours, minutes] = curr.duration.match(/(\d+)h (\d+)m/).slice(1).map(Number);
                const totalMinutes = hours * 60 + minutes;
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += totalMinutes;
            }
            return acc;
        }, {});
        return Object.keys(aggregatedData).map(key => ({ name: key, durationHours: aggregatedData[key] / 60 })).sort((a, b) => b.durationHours - a.durationHours);
    }, [filteredChronoHistory]);

    const getDailyConsumptionData = useMemo(() => {
        const aggregatedData = filteredAttributionsHistory.reduce((acc, curr) => {
            if (curr.truckPlate && curr.liters) {
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += curr.liters;
            }
            return acc;
        }, {});
        return Object.keys(aggregatedData).map(key => ({ name: key, liters: aggregatedData[key] })).sort((a, b) => b.liters - a.liters);
    }, [filteredAttributionsHistory]);

    const filteredAppro = useMemo(() => approvisionnements.filter(a => (a.fournisseur || '').toLowerCase().includes(search.toLowerCase()) || (a.date || '').toLowerCase().includes(search.toLowerCase())), [approvisionnements, search]);
    const totalMontantAppro = useMemo(() => approvisionnements.reduce((acc, curr) => acc + curr.montantTotal, 0), [approvisionnements]);
    const totalLitersUsed = useMemo(() => chronoHistory.reduce((acc, curr) => acc + (curr.gasoilConsumed || 0), 0), [chronoHistory]);
    const totalSable = useMemo(() => chronoHistory.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0), [chronoHistory]);

    return (
        <div className="dashboard-luxury-wrapper">
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

            <motion.div
                className={`sidebar-luxury ${isSidebarOpen ? 'open' : ''}`}
                initial={{ x: -250 }}
                animate={{ x: isSidebarOpen ? 0 : -250 }}
                transition={{ type: "tween", duration: 0.3 }}
            >
                <div className="sidebar-header-luxury">
                    <img src={logo} alt="Logo" className="sidebar-logo-luxury" />
                    {isSidebarOpen && <h4>MINE<span className="text-primary-accent">GEST</span></h4>}
                </div>
                <ul className="sidebar-menu-luxury">
                    <li className={activeSection === 'dashboard' ? 'active' : ''} onClick={() => setActiveSection('dashboard')}>
                        <FaChartLine />
                        {isSidebarOpen && <span>Dashboard</span>}
                    </li>
                    <li className={activeSection === 'forms' ? 'active' : ''} onClick={() => setActiveSection('forms')}>
                        <FaPlus />
                        {isSidebarOpen && <span>Actions</span>}
                    </li>
                    <li className={activeSection === 'history' ? 'active' : ''} onClick={() => setActiveSection('history')}>
                        <FaHistory />
                        {isSidebarOpen && <span>Historique</span>}
                    </li>
                    <li className={activeSection === 'users' ? 'active' : ''} onClick={() => setActiveSection('users')}>
                        <FaUserShield />
                        {isSidebarOpen && <span>Utilisateurs</span>}
                    </li>
                </ul>
                <div className="sidebar-footer-luxury">
                    <Button variant="link"><FaCog /></Button>
                    <Button variant="link"><FaSignOutAlt /></Button>
                </div>
            </motion.div>

            <div className={`dashboard-main-content-luxury ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <motion.div initial="initial" animate="in" variants={pageVariants} className="dashboard-header-bar-luxury">
                    <Button variant="link" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-btn-luxury">
                        <FaBars />
                    </Button>
                    <div className="dashboard-header-text-luxury">
                        <h3>Tableau de Bord <span className="text-secondary-accent">Gasoil</span></h3>
                    </div>
                    <div className="dashboard-actions-luxury">
                        <Button variant="outline-primary-luxury" onClick={fetchAll} className="btn-icon-hover-luxury me-2">
                            <FaSpinner className="spin-on-hover" /> Actualiser
                        </Button>
                        <Button variant="outline-primary-luxury" onClick={() => exportAllHistoryToExcel({
                            attributions: attributionsHistory,
                            chrono: chronoHistory,
                            appro: filteredAppro,
                            totalLitersAttributed,
                            totalLitersUsed,
                            totalSable,
                            totalMontantAppro
                        })} className="btn-icon-hover-luxury">
                            <FaFileExcel /> Export Historique
                        </Button>
                    </div>
                </motion.div>

                <motion.div variants={pageVariants} initial="initial" animate="in" className="kpi-grid-luxury">
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="kpi-card-luxury">
                            <div className="kpi-icon-bg-luxury"><FaWarehouse /></div>
                            <Card.Body>
                                <Card.Title>Stock Restant</Card.Title>
                                <h4 className="kpi-value">{stockRestant !== null ? formatNumber(stockRestant) : '...'} L</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="kpi-card-luxury">
                            <div className="kpi-icon-bg-luxury"><FaGasPump /></div>
                            <Card.Body>
                                <Card.Title>Total Attribué (Journalier)</Card.Title>
                                <h4 className="kpi-value">{formatNumber(totalLitersAttributedDaily)} L</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="kpi-card-luxury">
                            <div className="kpi-icon-bg-luxury"><FaClock /></div>
                            <Card.Body>
                                <Card.Title>Durée d'Utilisation (Journalière)</Card.Title>
                                <h4 className="kpi-value">{Math.floor(totalDurationDaily / 60)}h {totalDurationDaily % 60}m</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="kpi-card-luxury">
                            <div className="kpi-icon-bg-luxury"><FaBoxes /></div>
                            <Card.Body>
                                <Card.Title>Total Sable (Journalier)</Card.Title>
                                <h4 className="kpi-value">{formatNumber(totalSableDaily)} m³</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </motion.div>

                <div className="dashboard-content-area-luxury">
                    <AnimatePresence mode='wait'>
                        {activeSection === 'dashboard' && (
                            <motion.div key="dashboard-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                                <Row className="mb-4 align-items-center">
                                    <Col xs={12} md={6} lg={4}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold"><FaCalendarAlt /> Sélectionner une Date</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={filterDate}
                                                onChange={(e) => setFilterDate(e.target.value)}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row className="g-4">
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card-luxury">
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
                                                            <Cell fill="#00c853" />
                                                            <Cell fill="#ffab00" />
                                                            <Cell fill="#2962ff" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: 'none', borderRadius: '10px' }} />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card-luxury">
                                            <Card.Body>
                                                <Card.Title>Consommation Journalière par Machine (L)</Card.Title>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={getDailyConsumptionData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis dataKey="name" stroke="var(--primary-accent)" />
                                                        <YAxis stroke="var(--primary-accent)" label={{ value: 'Litres', angle: -90, position: 'insideLeft', fill: 'var(--primary-accent)' }} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: 'none', borderRadius: '10px' }} />
                                                        <Legend />
                                                        <Bar dataKey="liters" fill="#ff4d4d" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card-luxury">
                                            <Card.Body>
                                                <Card.Title>Volume de Sable Journalier (m³)</Card.Title>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <AreaChart data={getDailySableData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis dataKey="name" stroke="var(--primary-accent)" />
                                                        <YAxis stroke="var(--primary-accent)" label={{ value: 'Volume (m³)', angle: -90, position: 'insideLeft', fill: 'var(--primary-accent)' }} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: 'none', borderRadius: '10px' }} />
                                                        <Area type="monotone" dataKey="volumeSable" stroke="#663399" fill="#663399" fillOpacity={0.8} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card-luxury">
                                            <Card.Body>
                                                <Card.Title>Durée d'Utilisation Journalière (heures)</Card.Title>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={getDailyDurationData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis dataKey="name" stroke="var(--primary-accent)" />
                                                        <YAxis stroke="var(--primary-accent)" label={{ value: 'Durée (h)', angle: -90, position: 'insideLeft', fill: 'var(--primary-accent)' }} />
                                                        <Tooltip formatter={(value) => `${value.toFixed(2)} heures`} contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: 'none', borderRadius: '10px' }} />
                                                        <Bar dataKey="durationHours" fill="#ff4d4d" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}
                        {activeSection === 'forms' && (
                            <motion.div key="forms-section" variants={pageVariants} initial="initial" animate="in" exit="out" className="form-sections-container-luxury">
                                <Row className="g-4 justify-content-center">
                                    <Col lg={10}>
                                        <Card className="p-4 shadow-lg card-glass-luxury text-center">
                                            <Card.Title className="mb-4 text-primary-accent">Actions Rapides</Card.Title>
                                            <div className="d-grid gap-3">
                                                <Button variant="success" size="lg" className="btn-luxury" onClick={handleShowAddTrucker}><FaPlus /> Ajouter une Machine</Button>
                                                <Button variant="warning" size="lg" className="btn-luxury" onClick={handleShowAttribGasoil}><FaGasPump /> Attribuer du Gasoil</Button>
                                                <Button variant="info" size="lg" className="btn-luxury" onClick={handleShowChrono}><FaClock /> Chrono Machine</Button>
                                                <Button variant="primary" size="lg" className="btn-luxury" onClick={handleShowApprovisionnement}><FaWarehouse /> Approvisionner le Stock</Button>
                                                <Button variant="dark" size="lg" className="btn-luxury" onClick={handleShowAddSeller}><FaUserShield /> Ajouter Vendeur</Button>
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}
                        {activeSection === 'history' && (
                            <motion.div key="history-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                                <Card className="p-4 shadow-lg card-glass-luxury">
                                    <Card.Title className="text-white">Historique des Attributions</Card.Title>
                                    <div className="d-flex justify-content-end mb-3">
                                        <Button variant="outline-primary-luxury" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover-luxury">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive-luxury">
                                        <Table striped bordered hover variant="dark" className="mt-3 table-luxury">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Machine</th>
                                                    <th>Litres</th>
                                                    <th>Opérateur</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (<tr><td colSpan="4" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : attributionsHistory.length > 0 ? (
                                                    attributionsHistory.map((h, index) => (<tr key={index}>
                                                        <td>{new Date(h.date).toLocaleDateString()}</td>
                                                        <td>{h.truckPlate}</td>
                                                        <td>{formatNumber(h.liters)}</td>
                                                        <td>{h.operator || 'N/A'}</td>
                                                    </tr>))
                                                ) : (<tr><td colSpan="4" className="text-center">Aucune attribution trouvée.</td></tr>)}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-dark fw-bold">
                                                    <td colSpan="2">Total Cumulé</td>
                                                    <td>{formatNumber(totalLitersAttributed)} L</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </Card>
                                <Card className="p-4 shadow-lg card-glass-luxury mt-4">
                                    <Card.Title className="text-white">Historique des Approvisionnements</Card.Title>
                                    <div className="d-flex justify-content-end mb-3">
                                        <Button variant="outline-primary-luxury" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover-luxury">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive-luxury">
                                        <Table striped bordered hover variant="dark" className="mt-3 table-luxury">
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
                                                {loading ? (<tr><td colSpan="6" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : filteredAppro.length > 0 ? (
                                                    filteredAppro.map((a, index) => (<tr key={index}>
                                                        <td>{new Date(a.date).toLocaleDateString()}</td>
                                                        <td>{a.fournisseur}</td>
                                                        <td>{formatNumber(a.quantite)}</td>
                                                        <td>{formatNumber(a.prixUnitaire)} FCFA</td>
                                                        <td>{formatNumber(a.montantTotal)} FCFA</td>
                                                        <td>{a.receptionniste}</td>
                                                    </tr>))
                                                ) : (<tr><td colSpan="6" className="text-center">Aucun approvisionnement trouvé.</td></tr>)}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-dark fw-bold">
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
                        {activeSection === 'users' && (
                            <motion.div key="users-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                                <Card className="p-4 shadow-lg card-glass-luxury">
                                    <Card.Title className="text-white">Historique des Ajouts d'Utilisateurs</Card.Title>
                                    <div className="table-responsive-luxury">
                                        <Table striped bordered hover variant="dark" className="mt-3 table-luxury">
                                            <thead>
                                                <tr>
                                                    <th>Date d'ajout</th>
                                                    <th>Nom d'utilisateur</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (<tr><td colSpan="2" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : sellersHistory.length > 0 ? (
                                                    sellersHistory.map((user, index) => (<tr key={index}>
                                                        <td>{moment(user.creationDate).format('DD/MM/YYYY')}</td>
                                                        <td>{user.username}</td>
                                                    </tr>))
                                                ) : (<tr><td colSpan="2" className="text-center">Aucun utilisateur ajouté.</td></tr>)}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals remain the same but styled by the new CSS */}
            {/* Modal pour "Ajouter une Machine" */}
            <Modal show={showAddTruckerModal} onHide={handleCloseAddTrucker} centered className="modal-luxury-theme">
                <Modal.Header closeButton className="modal-header-luxury">
                    <Modal.Title>Ajout de machine</Modal.Title>
                </Modal.Header>
                <motion.div key="addTruckerFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-luxury">
                        <Form onSubmit={handleAddTrucker}>
                            <Form.Group className="mb-2">
                                <Form.Label>Machine</Form.Label>
                                <Form.Control type="text" placeholder="Entrer le nom de la machine" value={newPlate} onChange={(e) => setNewPlate(e.target.value.replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' '))} required />
                            </Form.Group>
                            <Button variant="success" type="submit" className="w-100 btn-luxury-submit"><FaCheck /> Ajouter</Button>
                            <Button variant="secondary" onClick={handleCloseAddTrucker} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>

            {/* Modal pour "Attribuer du Gasoil" */}
            <Modal show={showAttribGasoilModal} onHide={handleCloseAttribGasoil} centered className="modal-luxury-theme">
                <Modal.Header closeButton className="modal-header-luxury">
                    <Modal.Title>Attribution de Gasoil</Modal.Title>
                </Modal.Header>
                <motion.div key="attribGasoilFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-luxury">
                        <Form onSubmit={handleAttribGasoil}>
                            <Form.Group className="mb-2">
                                <Form.Label>Machine</Form.Label>
                                <Form.Control as="select" value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} required>
                                    <option value="">Sélectionnez une machine</option>
                                    {truckers.map((t) => (<option key={t._id} value={t.truckPlate}>{t.truckPlate}</option>))}
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
                            <Button variant="warning" type="submit" className="w-100 btn-luxury-submit"><FaCheck /> Attribuer</Button>
                            <Button variant="secondary" onClick={handleCloseAttribGasoil} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>

            {/* Modal pour "Approvisionnement du Stock" */}
            <Modal show={showApprovisionnementModal} onHide={handleCloseApprovisionnement} centered className="modal-luxury-theme">
                <Modal.Header closeButton className="modal-header-luxury">
                    <Modal.Title>Approvisionnement du Stock</Modal.Title>
                </Modal.Header>
                <motion.div key="approFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-luxury">
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
                            <Button variant="primary" type="submit" className="w-100 btn-luxury-submit"><FaCheck /> Enregistrer</Button>
                            <Button variant="secondary" onClick={handleCloseApprovisionnement} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>

            {/* Modal pour "Chrono Machine" */}
            <Modal show={showChronoModal} onHide={handleCloseChrono} centered className="modal-luxury-theme">
                <Modal.Header closeButton className="modal-header-luxury">
                    <Modal.Title>Chrono Machine</Modal.Title>
                </Modal.Header>
                <motion.div key="chronoFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-luxury">
                        {!chronoRunning && !showDataInputs && !cameraOpen && (
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Machine</Form.Label>
                                    <Form.Control as="select" value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} required>
                                        <option value="">Sélectionnez une machine</option>
                                        {truckers.map((t) => (<option key={t._id} value={t.truckPlate}>{t.truckPlate}</option>))}
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
                                <Button variant="success" className="w-100 btn-luxury-submit" onClick={handleStartChrono}><FaPlay /> Démarrer le Chrono</Button>
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                            </Form>
                        )}
                        {cameraOpen && (
                            <div className="camera-container">
                                <video ref={videoRef} autoPlay style={{ width: '100%', borderRadius: '8px' }}></video>
                                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                                <Button onClick={handleTakePhoto} className="w-100 mt-3 btn-luxury-submit"><FaCamera /> Prendre la photo du compteur</Button>
                            </div>
                        )}
                        {chronoRunning && (
                            <Form>
                                <div className="chrono-display-container">
                                    <div className="chrono-display-luxury">{chronoDisplay}</div>
                                    <p>Machine: <strong>{selectedPlate}</strong></p>
                                    <p>Opérateur: <strong>{operator}</strong></p>
                                </div>
                                <Button variant="danger" type="button" onClick={handleStopChrono} className="w-100 btn-luxury-cancel"><FaStop /> Arrêter le Chrono</Button>
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
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
                                <Button variant="success" type="submit" className="w-100 btn-luxury-submit"><FaCheck /> Enregistrer les données</Button>
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                            </Form>
                        )}
                    </Modal.Body>
                </motion.div>
            </Modal>

            {/* Modal pour "Ajouter Vendeur" */}
            <Modal show={showAddSellerModal} onHide={handleCloseAddSeller} centered className="modal-luxury-theme">
                <Modal.Header closeButton className="modal-header-luxury">
                    <Modal.Title>Ajouter un nouveau Vendeur</Modal.Title>
                </Modal.Header>
                <motion.div key="addSellerModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-luxury">
                        <Form onSubmit={handleAddSeller}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nom d'utilisateur</Form.Label>
                                <Form.Control type="text" value={newSellerUsername} onChange={(e) => setNewSellerUsername(e.target.value)} placeholder="Nom du vendeur" required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Identifiants (Mot de passe)</Form.Label>
                                <Form.Control type="password" value={newSellerPassword} onChange={(e) => setNewSellerPassword(e.target.value)} placeholder="Mot de passe" required />
                            </Form.Group>
                            <div className="d-flex justify-content-between mt-3">
                                <Button variant="success" type="submit" className="flex-grow-1 me-2 btn-luxury-submit"><FaCheck /> Enregistrer</Button>
                                <Button variant="danger" onClick={handleCloseAddSeller} className="flex-grow-1 btn-luxury-cancel"><FaTimes /> Annuler</Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
        </div>
    );
}

export default GasoilDashboard;