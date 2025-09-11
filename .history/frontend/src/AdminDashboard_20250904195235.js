import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Form, Card, Row, Col, Table, Spinner, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './GasoilDashboard.css'; // S'assurer que ce fichier CSS est stylisé
import logo from './logo.png';
import html2pdf from 'html2pdf.js';
import {
    FaGasPump,
    FaFileExcel,
    FaWarehouse,
    FaHistory,
    FaPlus,
    FaCheck,
    FaTimes,
    FaSpinner,
    FaClock,
    FaPlay,
    FaStop,
    FaCamera,
    FaUserShield,
    FaChartLine,
    FaBoxes,
    FaCalendarAlt, // Ajout de l'icône calendrier
    FaBars // Pour le toggle de la sidebar
} from 'react-icons/fa';
import Plot from 'react-plotly.js'; // 📥 Importation de Plotly.js
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import moment from 'moment';

// =============================================================
//                   Animations Framer Motion
// =============================================================
const pageVariants = {
    initial: { opacity: 0, x: -50 },
    in: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 20, staggerChildren: 0.1 } },
    out: { opacity: 0, x: 50, transition: { duration: 0.3 } },
};

const itemVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const cardVariants = {
    initial: { opacity: 0, scale: 0.9 },
    in: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const formatNumber = (n) => (n === undefined || n === null ? '-' : n.toLocaleString());

const exportAllHistoryToExcel = (data) => {
    if (!data || !data.attributions || !data.chrono || !data.appro) {
        console.error("Exportation annulée : les données requises sont manquantes.", data);
        toast.error("Impossible d'exporter. Les données ne sont pas prêtes.");
        return;
    }

    if (!data.attributions.length && !data.chrono.length && !data.appro.length) {
        toast.error("Aucune donnée à exporter.");
        return;
    }

    const workbook = XLSX.utils.book_new();

    const createStyledSheet = (sheetName, headers, rows, totals) => {
        const sheetData = [headers];

        rows.forEach(row => {
            const rowData = headers.map(header => row[header] ?? '');
            sheetData.push(rowData);
        });

        let totalsRowIndex = -1;
        if (totals) {
            sheetData.push([]);
            sheetData.push(totals.map(total => total ?? ''));
            totalsRowIndex = sheetData.length - 1;
        }

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const headerCellRef = XLSX.utils.encode_cell({ c: C, r: 0 });
            if (!worksheet[headerCellRef]) continue;
            worksheet[headerCellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4F81BD" } },
                border: {
                    top: { style: "thin", color: { auto: 1 } },
                    bottom: { style: "thin", color: { auto: 1 } },
                    left: { style: "thin", color: { auto: 1 } },
                    right: { style: "thin", color: { auto: 1 } }
                }
            };

            if (totalsRowIndex !== -1) {
                const totalCellRef = XLSX.utils.encode_cell({ c: C, r: totalsRowIndex });
                if (!worksheet[totalCellRef]) continue;
                worksheet[totalCellRef].s = {
                    font: { bold: true, color: { rgb: "000000" } },
                    fill: { fgColor: { rgb: "F2F2F2" } },
                    border: {
                        top: { style: "thin", color: { auto: 1 } },
                        bottom: { style: "thin", color: { auto: 1 } },
                        left: { style: "thin", color: { auto: 1 } },
                        right: { style: "thin", color: { auto: 1 } }
                    }
                };
            }
        }
        
        const wscols = headers.map(h => ({ wch: h.length + 5 }));
        worksheet['!cols'] = wscols;

        worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    };

    if (data.attributions.length > 0) {
        const headers = ["Date", "Machine", "Litres", "Opérateur"];
        const rows = data.attributions.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Litres": h.liters,
            "Opérateur": h.operator || 'N/A'
        }));
        const totals = ["TOTAL", "", data.totalLitersAttributed, ""];
        createStyledSheet('Attributions', headers, rows, totals);
    }

    if (data.chrono.length > 0) {
        const headers = ["Date", "Machine", "Chauffeur", "Durée", "Nombre de voyages", "Volume Sable (m³)", "Activité"];
        const rows = data.chrono.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Chauffeur": h.operator,
            "Durée": h.duration,
            "Nombre de voyages": h.gasoilConsumed, // Correction: "Gasoil Consommé (L)" au lieu de "Nombre de voyages"
            "Volume Sable (m³)": h.volumeSable,
            "Activité": h.activity
        }));
        const totals = ["TOTAL", "", "", "", data.totalLitersUsed, data.totalSable, ""];
        createStyledSheet('Utilisations', headers, rows, totals);
    }
    
    if (data.appro.length > 0) {
        const headers = ["Date", "Fournisseur", "Quantité (L)", "Prix Unitaire", "Montant Total", "Réceptionniste"];
        const rows = data.appro.map(a => ({
            "Date": moment(a.date).format('DD/MM/YYYY'),
            "Fournisseur": a.fournisseur,
            "Quantité (L)": a.quantite,
            "Prix Unitaire": a.prixUnitaire,
            "Montant Total": a.montantTotal,
            "Réceptionniste": a.receptionniste
        }));
        const totals = ["TOTAL", "", data.totalLitersAppro, "", data.totalMontantAppro, ""];
        createStyledSheet('Approvisionnements', headers, rows, totals);
    }

    // NOUVELLE PARTIE POUR LES APPAREILS MOBILES
    // Écriture du fichier et conversion en tableau d'octets
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    try {
        // Crée un objet Blob à partir du tableau d'octets
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Crée un lien temporaire pour le téléchargement
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Rapport_Gasoil.xlsx";

        // Déclenche le téléchargement
        document.body.appendChild(a);
        a.click();
        
        // Nettoie l'URL temporaire
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success("Rapport Excel exporté avec succès !");
    } catch (error) {
        console.error("Erreur lors de l'exportation:", error);
        toast.error("Une erreur s'est produite lors de l'exportation.");
    }
};
const limits = {
    'CHARGEUSE': 300,
    'GRANDE DRAGUE': 200,
    'PETITE DRAGUE': 100
};

// =============================================================
//                        Composant principal
// =============================================================

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
    const [search] = useState('');
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
    const [filterMonth, setFilterMonth] = useState(moment().format('YYYY-MM'));

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
            const res = await fetch('https://minegestback.onrender.com/api/truckers');
            const data = await res.json();
            setTruckers(data || []);
        } catch (err) {
            toast.error('Erreur chargement machines');
        }
    };

    const fetchBilan = async () => {
        try {
            const res = await fetch('https://minegestback.onrender.com/api/gasoil/bilan');
            const data = await res.json();
            setBilanData(data);
        } catch (err) {
            toast.error('Erreur récupération bilan');
        }
    };

    const fetchApprovisionnements = async () => {
        try {
            const res = await fetch('https://minegestback.onrender.com/api/approvisionnement');
            const data = await res.json();
            setApprovisionnements(data || []);
        } catch (err) {
            toast.error('Erreur chargement des approvisionnements');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('https://minegestback.onrender.com/api/attributions');
            if (!res.ok) throw new Error('Erreur chargement historique');
            const data = await res.json();
            setHistoryData(data);
        } catch (err) {
            toast.error(err.message || 'Erreur historique');
        }
    };

    const fetchSellersHistory = async () => {
        try {
            const res = await fetch('https://minegestback.onrender.com/api/users');
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

    const handleAddTrucker = async (e) => {
        e.preventDefault();
        if (!newPlate) {
            return toast.error('Veuillez remplir le champ "Machine".');
        }
        try {
            const res = await fetch('https://minegestback.onrender.com/api/truckers', {
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
            const res = await fetch(`https://minegestback.onrender.com/api/truckers/${trucker._id}/gasoil`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    liters: litersToAttrib,
                    date: attribDate,
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
            const res = await fetch('https://minegestback.onrender.com/api/approvisionnement', {
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
            const res = await fetch('https://minegestback.onrender.com/api/gasoil/attribution-chrono', {
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

    const handleAddSeller = async (e) => {
        e.preventDefault();
        if (!newSellerUsername || !newSellerPassword) {
            toast.error('Veuillez remplir le nom et le mot de passe.');
            return;
        }
        try {
            const res = await fetch('https://minegestback.onrender.com/api/users', {
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

    // Modals Handlers
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

    // Memos
    const attributionsHistory = useMemo(() => historyData.filter(h => h.liters && !h.startTime), [historyData]);
    const chronoHistory = useMemo(() => historyData.filter(h => h.startTime), [historyData]);

    const totalLitersAttributed = useMemo(() => attributionsHistory.reduce((acc, curr) => acc + (curr.liters || 0), 0), [attributionsHistory]);
    
    // Le useMemo pour stockRestant est maintenant déclaré après totalLitersAttributed
    const stockRestant = useMemo(() => bilanData ? bilanData.totalAppro - totalLitersAttributed : 0, [bilanData, totalLitersAttributed]);

    // Filtrer les données en fonction de la date
    const filteredChronoHistory = useMemo(() => {
        return chronoHistory.filter(h => moment(h.date).format('YYYY-MM-DD') === filterDate);
    }, [chronoHistory, filterDate]);

    const filteredAttributionsHistory = useMemo(() => {
        return attributionsHistory.filter(h => moment(h.date).format('YYYY-MM-DD') === filterDate);
    }, [attributionsHistory, filterDate]);

    // Données pour les KPI du jour sélectionné
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
    
    // Modification des fonctions pour utiliser les données filtrées
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
    {getDailyDurationData.map((data, index) => (
    <motion.div variants={itemVariants} key={index}>
        <Card className="kpi-card-refined card-glass-light">
            <div className="kpi-icon-bg"><FaClock /></div>
            <Card.Body>
                <Card.Title>Durée d'Utilisation (Journalière)</Card.Title>
                {/* Affiche le nom de la machine */}
                <h5 className="kpi-subtitle">Machine: {data.name}</h5>
                {/* Affiche la durée d'utilisation de la machine */}
                <h4 className="kpi-value">{Math.floor(data.durationHours * 60 / 60)}h {Math.floor(data.durationHours * 60) % 60}m</h4>
            </Card.Body>
        </Card>
    </motion.div>
))}
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
    
    // FONCTION POUR GENERER DES COULEURS DIFFERENTES
    const getColorsForMachines = (data) => {
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
        return data.map((_, index) => colors[index % colors.length]);
    };

    // Les autres memos restent inchangés
    const filteredAppro = useMemo(() => approvisionnements.filter(a => (a.fournisseur || '').toLowerCase().includes(search.toLowerCase()) || (a.date || '').toLowerCase().includes(search.toLowerCase())), [approvisionnements, search]);
    const totalMontantAppro = useMemo(() => approvisionnements.reduce((acc, curr) => acc + curr.montantTotal, 0), [approvisionnements]);
    const totalLitersUsed = useMemo(() => chronoHistory.reduce((acc, curr) => acc + (curr.gasoilConsumed || 0), 0), [chronoHistory]);
    const totalSable = useMemo(() => chronoHistory.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0), [chronoHistory]);
    // Ajoutez cette nouvelle fonction useMemo
    const getDailyTripsData = useMemo(() => {
        const aggregatedData = filteredChronoHistory.reduce((acc, curr) => {
            // NOTE: 'gasoilConsumed' représente le nombre de voyages ici
            if (curr.truckPlate && curr.gasoilConsumed) {
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += curr.gasoilConsumed;
            }
            return acc;
        }, {});
        return Object.keys(aggregatedData).map(key => ({ name: key, trips: aggregatedData[key] })).sort((a, b) => b.trips - a.trips);
    }, [filteredChronoHistory]);
    const getMonthlyApproData = useMemo(() => {
        return approvisionnements.reduce((acc, curr) => {
            const monthYear = moment(curr.date).format('YYYY-MM');
            if (!acc[monthYear]) {
                acc[monthYear] = { quantity: 0, amount: 0 };
            }
            acc[monthYear].quantity += curr.quantite;
            acc[monthYear].amount += curr.montantTotal;
            return acc;
        }, {});
    }, [approvisionnements]);
    
    const getMonthlyAttributionData = useMemo(() => {
        return attributionsHistory.reduce((acc, curr) => {
            const monthYear = moment(curr.date).format('YYYY-MM');
            if (!acc[monthYear]) {
                acc[monthYear] = 0;
            }
            acc[monthYear] += curr.liters;
            return acc;
        }, {});
    }, [attributionsHistory]);
    
    // Remplacez votre fonction useMemo existante par celle-ci

const getMonthlyMachinePerformance = useMemo(() => {
    const aggregatedData = chronoHistory.reduce((acc, curr) => {
        const monthYear = moment(curr.date).format('YYYY-MM');
        if (curr.truckPlate) {
            if (!acc[monthYear]) acc[monthYear] = {};
            if (!acc[monthYear][curr.truckPlate]) {
                acc[monthYear][curr.truckPlate] = { duration: 0, trips: 0 };
            }

            // Agrégation de la durée
            if (curr.duration) {
                const [hours, minutes] = curr.duration.match(/(\d+)h (\d+)m/).slice(1).map(Number);
                const totalMinutes = hours * 60 + minutes;
                acc[monthYear][curr.truckPlate].duration += totalMinutes;
            }

            // Agrégation des voyages (gasoilConsumed)
            acc[monthYear][curr.truckPlate].trips += curr.gasoilConsumed;
        }
        return acc;
    }, {});

    // Conversion des minutes en heures
    Object.keys(aggregatedData).forEach(month => {
        Object.keys(aggregatedData[month]).forEach(truck => {
            aggregatedData[month][truck].duration /= 60;
        });
    });

    return aggregatedData;
}, [chronoHistory]); // La dépendance doit être chronoHistory (historique complet)
    // Add this new useMemo function inside the GasoilDashboard component
// Assurez-vous d'avoir cette fonction useMemo dans votre code

const getMonthlyConsumptionByMachine = useMemo(() => {
    const aggregatedData = attributionsHistory.reduce((acc, curr) => {
        const monthYear = moment(curr.date).format('YYYY-MM');

        if (curr.truckPlate && curr.liters) {
            if (!acc[monthYear]) {
                acc[monthYear] = {};
            }
            if (!acc[monthYear][curr.truckPlate]) {
                acc[monthYear][curr.truckPlate] = 0;
            }
            acc[monthYear][curr.truckPlate] += curr.liters;
        }
        return acc;
    }, {});

    return aggregatedData;
}, [attributionsHistory]);
const getDailyGasoilData = useMemo(() => {
    // Vérifie que filterDate est un objet Date valide
    if (!filterDate || typeof filterDate.toLocaleDateString !== 'function') {
        return [];
    }

    if (!chronoHistory || chronoHistory.length === 0) {
        return [];
    }

    // Récupère les composants de la date du filtre
    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth();
    const filterDay = filterDate.getDate();

    const dailyData = chronoHistory.filter(item => {
        if (!item.timestamp) return false;
        try {
            const itemDate = new Date(item.timestamp);
            
            // Compare les composants de la date pour une vérification exacte
            return itemDate.getFullYear() === filterYear &&
                   itemDate.getMonth() === filterMonth &&
                   itemDate.getDate() === filterDay;

        } catch (e) {
            console.error("Erreur de format de date pour l'élément :", item, e);
            return false;
        }
    });

    const aggregatedData = dailyData.reduce((acc, curr) => {
        if (curr.truckPlate && curr.fuel) {
            const liters = parseFloat(curr.fuel);
            if (!isNaN(liters)) {
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += liters;
            }
        }
        return acc;
    }, {});

    return Object.keys(aggregatedData).map(key => ({ name: key, liters: aggregatedData[key] }));
}, [chronoHistory, filterDate]);
    return (
        <div className="dashboard-wrapper">
            <ToastContainer position="top-right" autoClose={3000} theme="light" />

            {/* Sidebar */}
            <motion.div 
                className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
                initial={{ x: -250 }}
                animate={{ x: isSidebarOpen ? 0 : -250 }}
                transition={{ type: "tween", duration: 0.3 }}
            >
                <div className="sidebar-header">
                    <img src={logo} alt="Logo" className="sidebar-logo" />
                    {isSidebarOpen && <h4>MineGest</h4>}
                </div>
                <ul className="sidebar-menu">
                    <li className={activeSection === 'dashboard' ? 'active' : ''} onClick={() => setActiveSection('dashboard')}>
                        <FaChartLine />
                        {isSidebarOpen && <span>Dashboard</span>}
                    </li>
                    <li className={activeSection === 'monthly-reports' ? 'active' : ''} onClick={() => setActiveSection('monthly-reports')}>
    <FaChartLine />
    {isSidebarOpen && <span>Bilans mensuels</span>}
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
            </motion.div>

            {/* Main Content */}
            <div className={`dashboard-main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* Header sophistiqué */}
                <motion.div initial="initial" animate="in" variants={pageVariants} className="dashboard-header-bar-light">
                    <Button variant="link" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-btn">
                        <FaBars />
                    </Button>
                    <div className="dashboard-logo-section">
                        <div className="dashboard-header-text">
                            <h3>Tableau de Bord Gasoil</h3>
                        </div>
                    </div>
                    <div className="dashboard-actions">
                        <Button variant="outline-secondary" onClick={fetchAll} className="btn-icon-hover me-2">
                            <FaSpinner className="spin-on-hover" /> Actualiser
                        </Button>
                        <Button variant="outline-secondary" onClick={() => exportAllHistoryToExcel({
                            attributions: attributionsHistory,
                            chrono: chronoHistory,
                            appro: filteredAppro,
                            totalLitersAttributed,
                            totalLitersUsed,
                            totalSable,
                            totalMontantAppro
                        })} className="btn-icon-hover">
                            <FaFileExcel /> Export Historique
                        </Button>
                    </div>
                </motion.div>

                {/* KPI Cards */}
                <motion.div variants={pageVariants} initial="initial" animate="in" className="kpi-grid-refined">
                    <motion.div variants={itemVariants}>
                        <Card className="kpi-card-refined card-glass-light">
                            <div className="kpi-icon-bg"><FaWarehouse /></div>
                            <Card.Body>
                                <Card.Title>Stock Restant</Card.Title>
                                <h4 className="kpi-value">{stockRestant !== null ? formatNumber(stockRestant) : '...'} L</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    {/* <motion.div variants={itemVariants}>
                        <Card className="kpi-card-refined card-glass-light">
                            <div className="kpi-icon-bg"><FaGasPump /></div>
                            <Card.Body>
                                <Card.Title>Total Attribué (Journalier)</Card.Title>
                                <h4 className="kpi-value">{formatNumber(totalLitersAttributedDaily)} L</h4>
                            </Card.Body>
                        </Card>
                    </motion.div> */}
                    {getDailyGasoilData.length > 0 ? (
    getDailyGasoilData.map((data, index) => (
        <motion.div variants={itemVariants} key={index}>
            <Card className="kpi-card-refined card-glass-light">
                <div className="kpi-icon-bg"><FaGasPump /></div>
                <Card.Body>
                    <Card.Title>Gasoil Attribué</Card.Title>
                    <h5 className="kpi-subtitle">Machine: {data.name}</h5>
                    <h4 className="kpi-value">{formatNumber(data.liters)} L</h4>
                </Card.Body>
            </Card>
        </motion.div>
    ))
) : (
    <motion.div variants={itemVariants}>
        <Card className="kpi-card-refined card-glass-light">
            <Card.Body>
                <Card.Title>Gasoil Attribué</Card.Title>
                <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
            </Card.Body>
        </Card>
    </motion.div>
)}
                    {/* <motion.div variants={itemVariants}>
                        <Card className="kpi-card-refined card-glass-light">
                            <div className="kpi-icon-bg"><FaClock /></div>
                            <Card.Body>
                                <Card.Title>Durée d'Utilisation (Journalière)</Card.Title>
                                <h4 className="kpi-value">{Math.floor(totalDurationDaily / 60)}h {totalDurationDaily % 60}m</h4>
                            </Card.Body>
                        </Card>
                    </motion.div> */}
                    {getDailyDurationData.length > 0 ? (
    getDailyDurationData.map((data, index) => (
        <motion.div variants={itemVariants} key={index}>
            <Card className="kpi-card-refined card-glass-light">
                <div className="kpi-icon-bg"><FaClock /></div>
                <Card.Body>
                    <Card.Title>Durée d'Utilisation</Card.Title>
                    <h5 className="kpi-subtitle">Machine: {data.name}</h5>
                    <h4 className="kpi-value">{Math.floor(data.durationHours)}h {Math.round((data.durationHours % 1) * 60)}m</h4>
                </Card.Body>
            </Card>
        </motion.div>
    ))
) : (
    <motion.div variants={itemVariants}>
        <Card className="kpi-card-refined card-glass-light">
            <Card.Body>
                <Card.Title>Durée d'Utilisation</Card.Title>
                <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
            </Card.Body>
        </Card>
    </motion.div>
)}
                    <motion.div variants={itemVariants}>
                        <Card className="kpi-card-refined card-glass-light">
                            <div className="kpi-icon-bg"><FaBoxes /></div>
                            <Card.Body>
                                <Card.Title>Total Sable (Journalier)</Card.Title>
                                <h4 className="kpi-value">{formatNumber(totalSableDaily)} m³</h4>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Main Content Area with conditional rendering */}
                <div className="dashboard-content-area">
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
                                        <Card className="dashboard-chart-card card-glass-light">
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
                                                            fill="#8884d8"
                                                            label={({ name, value }) => `${name}: ${formatNumber(value)} L`}
                                                        >
                                                            <Cell fill="#009688" />
                                                            <Cell fill="#ffb400" />
                                                            <Cell fill="#607d8b" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }} itemStyle={{ color: '#333' }} />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card card-glass-light">
                                            <Card.Body>
                                                <Card.Title>Consommation Journalière par Machine (L)</Card.Title>
                                                <Plot
                                                    data={[{
                                                        x: getDailyConsumptionData.map(d => d.name),
                                                        y: getDailyConsumptionData.map(d => d.liters),
                                                        type: 'bar',
                                                        marker: { color: getColorsForMachines(getDailyConsumptionData) },
                                                        hovertemplate: '<b>%{x}</b><br>Consommation: %{y} L<extra></extra>',
                                                    }]}
                                                    layout={{
                                                        autosize: true,
                                                        height: 300,
                                                        margin: { l: 60, r: 10, t: 30, b: 40 },
                                                        scene: {
                                                            xaxis: { title: 'Machine' },
                                                            yaxis: { title: 'Litres' },
                                                            zaxis: { title: '' },
                                                            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                                                        },
                                                        font: { family: 'Arial', size: 12, color: '#333' },
                                                        paper_bgcolor: 'transparent',
                                                        plot_bgcolor: 'transparent'
                                                    }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card card-glass-light">
                                            <Card.Body>
                                                <Card.Title>Volume de Sable Journalier (m³)</Card.Title>
                                                {/* <Plot
                                                    data={[{
                                                        x: getDailySableData.map(d => d.name),
                                                        y: getDailySableData.map(d => d.volumeSable),
                                                        z: [0], // Z-axis for a 2.5D effect
                                                        type: 'scatter3d',
                                                        mode: 'lines+markers',
                                                        marker: { 
                                                            size: 10,
                                                            color: getColorsForMachines(getDailySableData) 
                                                        },
                                                        line: { 
                                                            color: '#663399', 
                                                            width: 4 
                                                        },
                                                        hovertemplate: '<b>%{x}</b><br>Volume: %{y} m³<extra></extra>',
                                                    }]}
                                                    layout={{
                                                        autosize: true,
                                                        height: 300,
                                                        margin: { l: 60, r: 10, t: 30, b: 40 },
                                                        scene: {
                                                            xaxis: { title: 'Machine' },
                                                            yaxis: { title: 'Volume (m³)' },
                                                            zaxis: { title: '' },
                                                            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                                                        },
                                                        font: { family: 'Arial', size: 12, color: '#333' },
                                                        paper_bgcolor: 'transparent',
                                                        plot_bgcolor: 'transparent'
                                                    }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                    style={{ width: '100%', height: '100%' }}
                                                /> */}
<Plot
    data={[{
        x: getDailySableData.map(d => d.name),
        y: getDailySableData.map(d => d.volumeSable),
        type: 'bar', // <-- Changé en 'bar'
        marker: { color: getColorsForMachines(getDailySableData) },
        hovertemplate: '<b>%{x}</b><br>Volume: %{y} m³<extra></extra>',
    }]}
    layout={{
        autosize: true,
        height: 300,
        margin: { l: 60, r: 10, t: 30, b: 40 },
        xaxis: { title: 'Machine' }, // <-- Modifié pour un graphique 2D
        yaxis: { title: 'Volume (m³)' }, // <-- Modifié pour un graphique 2D
        font: { family: 'Arial', size: 12, color: '#333' },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent'
    }}
    config={{ responsive: true, displayModeBar: false }}
    style={{ width: '100%', height: '100%' }}
/>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
                                        <Card className="dashboard-chart-card card-glass-light">
                                            <Card.Body>
                                                <Card.Title>Durée d'Utilisation Journalière (heures)</Card.Title>
                                                <Plot
                                                    data={[{
                                                        x: getDailyDurationData.map(d => d.name),
                                                        y: getDailyDurationData.map(d => d.durationHours),
                                                        type: 'bar',
                                                        marker: { color: getColorsForMachines(getDailyDurationData) },
                                                        hovertemplate: '<b>%{x}</b><br>Durée: %{y:.2f} heures<extra></extra>',
                                                    }]}
                                                    layout={{
                                                        autosize: true,
                                                        height: 300,
                                                        margin: { l: 60, r: 10, t: 30, b: 40 },
                                                        scene: {
                                                            xaxis: { title: 'Machine' },
                                                            yaxis: { title: 'Durée (h)' },
                                                            zaxis: { title: '' },
                                                            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                                                        },
                                                        font: { family: 'Arial', size: 12, color: '#333' },
                                                        paper_bgcolor: 'transparent',
                                                        plot_bgcolor: 'transparent'
                                                    }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} lg={6}>
    <Card className="dashboard-chart-card card-glass-light">
        <Card.Body>
            <Card.Title>Nombre de Voyages Journaliers</Card.Title>
            <Plot
                data={[{
                    x: getDailyTripsData.map(d => d.name),
                    y: getDailyTripsData.map(d => d.trips),
                    type: 'bar',
                    marker: { color: getColorsForMachines(getDailyTripsData) },
                    hovertemplate: '<b>%{x}</b><br>Voyages: %{y}<extra></extra>',
                }]}
                layout={{
                    autosize: true,
                    height: 300,
                    margin: { l: 60, r: 10, t: 30, b: 40 },
                    xaxis: { title: 'Machine' },
                    yaxis: { title: 'Nombre de Voyages' },
                    font: { family: 'Arial', size: 12, color: '#333' },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        </Card.Body>
    </Card>
</Col>
                                </Row>
                            </motion.div>
                        )}
                        {activeSection === 'forms' && (
                            <motion.div key="forms-section" variants={pageVariants} initial="initial" animate="in" exit="out" className="form-sections-container">
                                <Row className="g-4 justify-content-center">
                                    <Col lg={10}>
                                        <Card className="p-4 shadow-lg card-glass-light text-center">
                                            <Card.Title className="mb-4 text-dark">Actions Rapides</Card.Title>
                                            <div className="d-grid gap-3">
                                                <Button variant="success" size="lg" className="btn-fancy" onClick={handleShowAddTrucker}><FaPlus /> Ajouter une Machine</Button>
                                                <Button variant="warning" size="lg" className="btn-fancy" onClick={handleShowAttribGasoil}><FaGasPump /> Attribuer du Gasoil</Button>
                                                <Button variant="info" size="lg" className="btn-fancy" onClick={handleShowChrono}><FaClock /> Chrono Machine</Button>
                                                <Button variant="primary" size="lg" className="btn-fancy" onClick={handleShowApprovisionnement}><FaWarehouse /> Approvisionner le Stock</Button>
                                                <Button variant="dark" size="lg" className="btn-fancy" onClick={handleShowAddSeller}><FaUserShield /> Ajouter Vendeur</Button>
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}
                        {activeSection === 'history' && (
                            <motion.div key="history-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                                <Card className="p-4 shadow-lg card-glass-light">
                                    <Card.Title className="text-dark">Historique des Attributions</Card.Title>
                                    <div className="d-flex justify-content-end mb-3">
                                        <Button variant="outline-primary" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive-refined">
                                        <Table striped bordered hover variant="light" className="mt-3">
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
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="2">Total Cumulé</td>
                                                    <td>{formatNumber(totalLitersAttributed)} L</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </Card>
                                <Card className="p-4 shadow-lg card-glass-light mt-4">
                                    <Card.Title className="text-dark">Historique des Approvisionnements</Card.Title>
                                    <div className="d-flex justify-content-end mb-3">
                                        <Button variant="outline-primary" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover">
                                            <FaFileExcel /> Export Historique
                                        </Button>
                                    </div>
                                    <div className="table-responsive-refined">
                                        <Table striped bordered hover variant="light" className="mt-3">
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
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="4">Total Cumulé</td>
                                                    <td>{formatNumber(totalMontantAppro)} FCFA</td>
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
                                                            <td>{h.operator}</td>
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

                            </motion.div>
                        )}
                        {activeSection === 'users' && (
                            <motion.div key="users-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                                <Card className="p-4 shadow-lg card-glass-light">
                                    <Card.Title className="text-dark">Historique des Ajouts d'Utilisateurs</Card.Title>
                                    <div className="table-responsive-refined">
                                        <Table striped bordered hover variant="light" className="mt-3">
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
                        {activeSection === 'monthly-reports' && (
    <motion.div key="monthly-reports-section" variants={pageVariants} initial="initial" animate="in" exit="out">
        <Row className="mb-4 align-items-center">
    <Col xs={12} md={6} lg={4}>
        <Form.Group>
            <Form.Label className="fw-bold">
                <FaCalendarAlt /> Sélectionner un mois
            </Form.Label>
            <Form.Control
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
            />
        </Form.Group>
    </Col>
</Row>
<Row className="g-4">
    <Col xs={12} lg={6}>
        <Card className="dashboard-chart-card card-glass-light">
            <Card.Body>
                <Card.Title>Bilan Approvisionnements vs Attributions (mensuel)</Card.Title>
                <Plot
                    data={[
                        {
                            x: Object.keys(getMonthlyApproData),
                            y: Object.values(getMonthlyApproData).map(d => d.quantity),
                            type: 'bar',
                            name: 'Approvisionné (L)',
                            marker: { color: '#4F81BD' },
                        },
                        {
                            x: Object.keys(getMonthlyAttributionData),
                            y: Object.values(getMonthlyAttributionData),
                            type: 'bar',
                            name: 'Attribué (L)',
                            marker: { color: '#C0504D' },
                        },
                    ]}
                    layout={{
                        barmode: 'group',
                        autosize: true,
                        height: 300,
                        margin: { l: 60, r: 10, t: 30, b: 40 },
                        xaxis: { title: 'Mois' },
                        yaxis: { title: 'Litres' },
                        font: { family: 'Arial', size: 12, color: '#333' },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </Card.Body>
        </Card>
    </Col>
    <Col xs={12} lg={6}>
        <Card className="dashboard-chart-card card-glass-light">
            <Card.Body>
                <Card.Title>Coût des Approvisionnements (mensuel)</Card.Title>
                <Plot
                    data={[{
                        x: Object.keys(getMonthlyApproData),
                        y: Object.values(getMonthlyApproData).map(d => d.amount),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Montant (FCFA)',
                        marker: { color: '#00B0F0' },
                    }]}
                    layout={{
                        autosize: true,
                        height: 300,
                        margin: { l: 60, r: 10, t: 30, b: 40 },
                        xaxis: { title: 'Mois' },
                        yaxis: { title: 'Montant (FCFA)' },
                        font: { family: 'Arial', size: 12, color: '#333' },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </Card.Body>
        </Card>
    </Col>
    <Col xs={12} lg={6}>
        <Card className="dashboard-chart-card card-glass-light">
            <Card.Body>
                <Card.Title>Top Machines - Voyages (mensuel)</Card.Title>
                <Plot
                    data={[{
                        x: getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]).sort((a, b) => getMonthlyMachinePerformance[filterMonth][b].trips - getMonthlyMachinePerformance[filterMonth][a].trips) : [],
                        y: getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]).sort((a, b) => getMonthlyMachinePerformance[filterMonth][b].trips - getMonthlyMachinePerformance[filterMonth][a].trips).map(key => getMonthlyMachinePerformance[filterMonth][key].trips) : [],
                        type: 'bar',
                        marker: { color: getColorsForMachines(getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]) : []) },
                        hovertemplate: '<b>%{x}</b><br>Voyages: %{y}<extra></extra>',
                    }]}
                    layout={{
                        autosize: true,
                        height: 300,
                        margin: { l: 60, r: 10, t: 30, b: 40 },
                        xaxis: { title: 'Machine' },
                        yaxis: { title: 'Nombre de Voyages' },
                        font: { family: 'Arial', size: 12, color: '#333' },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </Card.Body>
        </Card>
    </Col>
    <Col xs={12} lg={6}>
        <Card className="dashboard-chart-card card-glass-light">
            <Card.Body>
                <Card.Title>Top Machines - Durée d'utilisation (mensuel)</Card.Title>
                <Plot
                    data={[{
                        x: getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]).sort((a, b) => getMonthlyMachinePerformance[filterMonth][b].duration - getMonthlyMachinePerformance[filterMonth][a].duration) : [],
                        y: getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]).sort((a, b) => getMonthlyMachinePerformance[filterMonth][b].duration - getMonthlyMachinePerformance[filterMonth][a].duration).map(key => getMonthlyMachinePerformance[filterMonth][key].duration) : [],
                        type: 'bar',
                        marker: { color: getColorsForMachines(getMonthlyMachinePerformance[filterMonth] ? Object.keys(getMonthlyMachinePerformance[filterMonth]) : []) },
                        hovertemplate: '<b>%{x}</b><br>Durée: %{y:.2f} heures<extra></extra>',
                    }]}
                    layout={{
                        autosize: true,
                        height: 300,
                        margin: { l: 60, r: 10, t: 30, b: 40 },
                        xaxis: { title: 'Machine' },
                        yaxis: { title: 'Durée (heures)' },
                        font: { family: 'Arial', size: 12, color: '#333' },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </Card.Body>
        </Card>
    </Col>
    <Col xs={12} lg={6}>
    <Card className="dashboard-chart-card card-glass-light">
        <Card.Body>
            <Card.Title>Consommation Mensuelle par Machine (L)</Card.Title>
            <Plot
                data={[{
                    // Utilise la nouvelle fonction et filtre sur le mois sélectionné
                    x: getMonthlyConsumptionByMachine[filterMonth] ? Object.keys(getMonthlyConsumptionByMachine[filterMonth]) : [],
                    y: getMonthlyConsumptionByMachine[filterMonth] ? Object.values(getMonthlyConsumptionByMachine[filterMonth]) : [],
                    type: 'bar',
                    marker: { color: getColorsForMachines(getMonthlyConsumptionByMachine[filterMonth] ? Object.keys(getMonthlyConsumptionByMachine[filterMonth]) : []) },
                    hovertemplate: '<b>%{x}</b><br>Consommation: %{y} L<extra></extra>',
                }]}
                layout={{
                    autosize: true,
                    height: 300,
                    margin: { l: 60, r: 10, t: 30, b: 40 },
                    xaxis: { title: 'Machine' },
                    yaxis: { title: 'Litres' },
                    font: { family: 'Arial', size: 12, color: '#333' },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        </Card.Body>
    </Card>
</Col>
</Row>
    </motion.div>
)}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals remain the same but styled by the new CSS */}
            {/* Modal pour "Ajouter une Machine" */}
            <Modal show={showAddTruckerModal} onHide={handleCloseAddTrucker} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Ajout de machine</Modal.Title>
                </Modal.Header>
                <motion.div key="addTruckerFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-light">
                        <Form onSubmit={handleAddTrucker}>
                            <Form.Group className="mb-2">
                                <Form.Label>Machine</Form.Label>
                                <Form.Control type="text" placeholder="Entrer le nom de la machine" value={newPlate} onChange={(e) => setNewPlate(e.target.value.replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' '))} required />
                            </Form.Group>
                            <Button variant="success" type="submit" className="w-100"><FaCheck /> Ajouter</Button>
                            <Button variant="secondary" onClick={handleCloseAddTrucker} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
            
            {/* Modal pour "Attribuer du Gasoil" */}
            <Modal show={showAttribGasoilModal} onHide={handleCloseAttribGasoil} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Attribution de Gasoil</Modal.Title>
                </Modal.Header>
                <motion.div key="attribGasoilFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-light">
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
                            <Button variant="warning" type="submit" className="w-100"><FaCheck /> Attribuer</Button>
                            <Button variant="secondary" onClick={handleCloseAttribGasoil} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
            
            {/* Modal pour "Approvisionnement du Stock" */}
            <Modal show={showApprovisionnementModal} onHide={handleCloseApprovisionnement} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Approvisionnement du Stock</Modal.Title>
                </Modal.Header>
                <motion.div key="approFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-light">
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
                            <Button variant="secondary" onClick={handleCloseApprovisionnement} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
            
            {/* Modal pour "Chrono Machine" */}
            <Modal show={showChronoModal} onHide={handleCloseChrono} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Chrono Machine</Modal.Title>
                </Modal.Header>
                <motion.div key="chronoFormModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-light">
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
                                <Button variant="success" className="w-100" onClick={handleStartChrono}><FaPlay /> Démarrer le Chrono</Button>
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2"><FaTimes /> Annuler</Button>
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
                                    <div className="chrono-display-light">{chronoDisplay}</div>
                                    <p>Machine: **{selectedPlate}**</p>
                                    <p>Opérateur: **{operator}**</p>
                                </div>
                                <Button variant="danger" type="button" onClick={handleStopChrono} className="w-100"><FaStop /> Arrêter le Chrono</Button>
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2"><FaTimes /> Annuler</Button>
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
                                <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                            </Form>
                        )}
                    </Modal.Body>
                </motion.div>
            </Modal>
            
            {/* Modal pour "Ajouter Vendeur" */}
            <Modal show={showAddSellerModal} onHide={handleCloseAddSeller} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Ajouter un nouveau Vendeur</Modal.Title>
                </Modal.Header>
                <motion.div key="addSellerModal" variants={cardVariants} initial="initial" animate="in" exit="out">
                    <Modal.Body className="modal-body-light">
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
                                <Button variant="success" type="submit" className="flex-grow-1 me-2"><FaCheck /> Enregistrer</Button>
                                <Button variant="danger" onClick={handleCloseAddSeller} className="flex-grow-1"><FaTimes /> Annuler</Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
        </div>
    );
}

export default GasoilDashboard;