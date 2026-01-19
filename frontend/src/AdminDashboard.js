import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Form, Card, Row, Col, Table, Spinner, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AdminDashboard.css'; // Design premium pour AdminDashboard
import logo from './logo.png';
import html2pdf from 'html2pdf.js';
import Select from 'react-select';

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
    FaBars, // Pour le toggle de la sidebar
    FaEdit, // Ajout de l'icône de modification
    FaTrashAlt, // Ajout de l'icône de suppression
    FaCopy, // Ajout de l'icône de copie
    FaDownload, // Ajout de l'icône de téléchargement
    FaSignOutAlt, // Ajout de l'icône de déconnexion
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
import axios from 'axios'; // 📥 Importation de axios

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

// Fonction pour trier les données de la plus récente à la plus ancienne
const sortByDateDesc = (data) => {
    return [...data].sort((a, b) => {
        const dateA = new Date(a.date || a.timestamp || a.createdAt);
        const dateB = new Date(b.date || b.timestamp || b.createdAt);
        return dateB - dateA; // Plus récent en premier
    });
};

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

    // Trier les données de la plus récente à la plus ancienne
    const sortedAttributions = sortByDateDesc(data.attributions);
    const sortedChrono = sortByDateDesc(data.chrono);
    const sortedAppro = sortByDateDesc(data.appro);

    if (sortedAttributions.length > 0) {
        const headers = ["Date", "Machine", "Litres", "Opérateur"];
        const rows = sortedAttributions.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Litres": h.liters,
            "Opérateur": h.operator || 'N/A'
        }));
        const totals = ["TOTAL", "", data.totalLitersAttributed, ""];
        createStyledSheet('Attributions', headers, rows, totals);
    }

    if (sortedChrono.length > 0) {
        const headers = ["Date", "Machine", "Chauffeur", "Durée", "Nombre de voyages", "Volume Sable (m³)", "Activité"];
        const rows = sortedChrono.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Chauffeur": h.operator,
            "Durée": h.duration,
            "Nombre de voyages": h.gasoilConsumed,
            "Volume Sable (m³)": h.volumeSable,
            "Activité": h.activity
        }));
        const totals = ["TOTAL", "", "", "", data.totalLitersUsed, data.totalSable, ""];
        createStyledSheet('Utilisations', headers, rows, totals);
    }
    
    if (sortedAppro.length > 0) {
        const headers = ["Date", "Fournisseur", "Quantité (L)", "Prix Unitaire", "Montant Total", "Réceptionniste"];
        const rows = sortedAppro.map(a => ({
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

// Fonction pour exporter par période
const exportHistoryByPeriod = (data, startDate, endDate) => {
    if (!data || !data.attributions || !data.chrono || !data.appro) {
        toast.error("Impossible d'exporter. Les données ne sont pas prêtes.");
        return;
    }

    if (!startDate || !endDate) {
        toast.error("Veuillez sélectionner une période (date début et date fin).");
        return;
    }

    const start = moment(startDate);
    const end = moment(endDate);

    if (end.isBefore(start)) {
        toast.error("La date de fin doit être postérieure à la date de début.");
        return;
    }

    // Filtrer les données par période
    const filteredAttributions = sortByDateDesc(
        data.attributions.filter(h => {
            const date = moment(h.date);
            return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
        })
    );

    const filteredChrono = sortByDateDesc(
        data.chrono.filter(h => {
            const date = moment(h.date);
            return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
        })
    );

    const filteredAppro = sortByDateDesc(
        data.appro.filter(a => {
            const date = moment(a.date);
            return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
        })
    );

    if (!filteredAttributions.length && !filteredChrono.length && !filteredAppro.length) {
        toast.error("Aucune donnée trouvée pour la période sélectionnée.");
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
                fill: { fgColor: { rgb: "16a34a" } },
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

    if (filteredAttributions.length > 0) {
        const headers = ["Date", "Machine", "Litres", "Opérateur"];
        const rows = filteredAttributions.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Litres": h.liters,
            "Opérateur": h.operator || 'N/A'
        }));
        const totalLiters = filteredAttributions.reduce((acc, curr) => acc + (curr.liters || 0), 0);
        const totals = ["TOTAL", "", totalLiters, ""];
        createStyledSheet('Attributions', headers, rows, totals);
    }

    if (filteredChrono.length > 0) {
        const headers = ["Date", "Machine", "Chauffeur", "Durée", "Nombre de voyages", "Volume Sable (m³)", "Activité"];
        const rows = filteredChrono.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Chauffeur": h.operator,
            "Durée": h.duration,
            "Nombre de voyages": h.gasoilConsumed,
            "Volume Sable (m³)": h.volumeSable,
            "Activité": h.activity
        }));
        const totalTrips = filteredChrono.reduce((acc, curr) => acc + (curr.gasoilConsumed || 0), 0);
        const totalSable = filteredChrono.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0);
        const totals = ["TOTAL", "", "", "", totalTrips, totalSable, ""];
        createStyledSheet('Utilisations', headers, rows, totals);
    }
    
    if (filteredAppro.length > 0) {
        const headers = ["Date", "Fournisseur", "Quantité (L)", "Prix Unitaire", "Montant Total", "Réceptionniste"];
        const rows = filteredAppro.map(a => ({
            "Date": moment(a.date).format('DD/MM/YYYY'),
            "Fournisseur": a.fournisseur,
            "Quantité (L)": a.quantite,
            "Prix Unitaire": a.prixUnitaire,
            "Montant Total": a.montantTotal,
            "Réceptionniste": a.receptionniste
        }));
        const totalLiters = filteredAppro.reduce((acc, curr) => acc + (curr.quantite || 0), 0);
        const totalMontant = filteredAppro.reduce((acc, curr) => acc + (curr.montantTotal || 0), 0);
        const totals = ["TOTAL", "", totalLiters, "", totalMontant, ""];
        createStyledSheet('Approvisionnements', headers, rows, totals);
    }

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    try {
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rapport_Gasoil_${start.format('DD-MM-YYYY')}_${end.format('DD-MM-YYYY')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Rapport Excel pour la période ${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')} exporté avec succès !`);
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
    // Fonction pour exporter le rapport d'une machine spécifique
    const exportMachineReportToExcel = (machinePlate, attributions, chrono) => {
        if (!machinePlate) {
            toast.error("Veuillez sélectionner une machine.");
            return;
        }

        // Filtrer les données pour cette machine
        const machineAttributions = sortByDateDesc(attributions.filter(h => h.truckPlate === machinePlate));
        const machineChrono = sortByDateDesc(chrono.filter(h => h.truckPlate === machinePlate));

        if (!machineAttributions.length && !machineChrono.length) {
            toast.error(`Aucune donnée trouvée pour la machine "${machinePlate}".`);
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

    // Feuille Attributions
    if (machineAttributions.length > 0) {
        const headers = ["Date", "Machine", "Litres", "Opérateur"];
        const rows = machineAttributions.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Litres": h.liters,
            "Opérateur": h.operator || 'N/A'
        }));
        const totalLiters = machineAttributions.reduce((acc, curr) => acc + (curr.liters || 0), 0);
        const totals = ["TOTAL", "", totalLiters, ""];
        createStyledSheet('Attributions', headers, rows, totals);
    }

    // Feuille Utilisations (Chrono)
    if (machineChrono.length > 0) {
        const headers = ["Date", "Machine", "Chauffeur", "Durée", "Nombre de voyages", "Volume Sable (m³)", "Activité"];
        const rows = machineChrono.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Chauffeur": h.operator,
            "Durée": h.duration,
            "Nombre de voyages": h.gasoilConsumed,
            "Volume Sable (m³)": h.volumeSable,
            "Activité": h.activity
        }));
        const totalTrips = machineChrono.reduce((acc, curr) => acc + (curr.gasoilConsumed || 0), 0);
        const totalSable = machineChrono.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0);
        const totals = ["TOTAL", "", "", "", totalTrips, totalSable, ""];
        createStyledSheet('Utilisations', headers, rows, totals);
    }

    // Écriture et téléchargement
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    try {
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rapport_${machinePlate.replace(/\s+/g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Rapport Excel pour ${machinePlate} exporté avec succès !`);
    } catch (error) {
        console.error("Erreur lors de l'exportation:", error);
        toast.error("Une erreur s'est produite lors de l'exportation.");
    }
    };
    
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [truckers, setTruckers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [filterDate, setFilterDate] = useState(moment().format('YYYY-MM-DD'));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // ... (autres variables d'état)
const [showCredentialsModal, setShowCredentialsModal] = useState(false);
const [createdUsername, setCreatedUsername] = useState('');
const [createdPassword, setCreatedPassword] = useState('');
const credentialsRef = useRef(null);
// ...
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
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [deletionHistory, setDeletionHistory] = useState([]);
    const [exportStartDate, setExportStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
    const [exportEndDate, setExportEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [showExportPeriodModal, setShowExportPeriodModal] = useState(false);

    const API_URL = "https://minegestback.onrender.com";
    useEffect(() => {
    if (token) {
        axios.defaults.baseURL = API_URL;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchSellersHistory();
        fetchAll();
        // Plus de condition de rôle ici, le serveur gère le filtre.
        fetchDeletionHistory();
    } else {
        console.error("Token non trouvé. L'utilisateur doit se reconnecter.");
        setLoading(false);
    }
}, [token]);
    useEffect(() => {
        if (selectedSeller) {
            fetchDataForSeller(selectedSeller.dbName);
        } else {
            fetchAll();
        }
    }, [selectedSeller]);
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
    
    // const fetchAll = async () => {
    //     setLoading(true);
    //     await Promise.all([fetchTruckers(), fetchBilan(), fetchApprovisionnements(), fetchHistory(), fetchSellersHistory()]);
    //     setLoading(false);
    // };
    // const fetchAll = async () => {
    //     setLoading(true);
    //     await Promise.all([fetchTruckers(), fetchBilan(), fetchApprovisionnements(), fetchHistory(), fetchSellersHistory()]);
    //     setLoading(false);
    // };
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [resTruckers, resAppro, resHistory, resBilan] = await Promise.all([
                axios.get('/api/truckers'),
                axios.get('/api/approvisionnement'),
                axios.get('/api/attributions'),
                axios.get('/api/gasoil/bilan')
            ]);
            setTruckers(resTruckers.data || []);
            setApprovisionnements(resAppro.data || []);
            setHistoryData(resHistory.data || []);
            setBilanData(resBilan.data);
        } catch (err) {
            toast.error("Erreur lors du chargement des données principales.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    // const fetchTruckers = async () => {
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/truckers');
    //         const data = await res.json();
    //         setTruckers(data || []);
    //     } catch (err) {
    //         toast.error('Erreur chargement machines');
    //     }
    // };

    // const fetchBilan = async () => {
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/gasoil/bilan');
    //         const data = await res.json();
    //         setBilanData(data);
    //     } catch (err) {
    //         toast.error('Erreur récupération bilan');
    //     }
    // };

    // const fetchApprovisionnements = async () => {
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/approvisionnement');
    //         const data = await res.json();
    //         setApprovisionnements(data || []);
    //     } catch (err) {
    //         toast.error('Erreur chargement des approvisionnements');
    //     }
    // };

    // const fetchHistory = async () => {
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/attributions');
    //         if (!res.ok) throw new Error('Erreur chargement historique');
    //         const data = await res.json();
    //         setHistoryData(data);
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur historique');
    //     }
    // };

    // const fetchSellersHistory = async () => {
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/users');
    //         if (!res.ok) {
    //             throw new Error('Erreur lors de la récupération des utilisateurs.');
    //         }
    //         const users = await res.json();
    //         const sellers = users.filter(user => user.role === 'Vendeur');
    //         setSellersHistory(sellers);
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur lors du chargement de l\'historique.');
    //     }
    // };
    // const fetchTruckers = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/truckers', {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         const data = await res.json();
    //         setTruckers(data || []);
    //     } catch (err) {
    //         toast.error('Erreur chargement machines');
    //     }
    // };

    // const fetchBilan = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/gasoil/bilan', {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         const data = await res.json();
    //         setBilanData(data);
    //     } catch (err) {
    //         toast.error('Erreur récupération bilan');
    //     }
    // };

    // const fetchApprovisionnements = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/approvisionnement', {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         const data = await res.json();
    //         setApprovisionnements(data || []);
    //     } catch (err) {
    //         toast.error('Erreur chargement des approvisionnements');
    //     }
    // };

    const fetchTruckers = async () => {
        try {
            const res = await axios.get(`/api/truckers`);
            setTruckers(res.data || []);
        } catch (err) {
            toast.error('Erreur chargement machines');
        }
    };

    const fetchBilan = async () => {
        try {
            const res = await axios.get(`/api/gasoil/bilan`);
            setBilanData(res.data);
        } catch (err) {
            toast.error('Erreur récupération bilan');
        }
    };

    const fetchApprovisionnements = async () => {
        try {
            const res = await axios.get(`/api/approvisionnement`);
            setApprovisionnements(res.data || []);
        } catch (err) {
            toast.error('Erreur chargement des approvisionnements');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`/api/attributions`);
            if (res.status !== 200) throw new Error('Erreur chargement historique');
            setHistoryData(res.data);
        } catch (err) {
            toast.error(err.message || 'Erreur historique');
        }
    };

    const fetchSellersHistory = async () => {
        try {
            const res = await axios.get(`/api/users`);
            if (res.status !== 200) {
                throw new Error('Erreur lors de la récupération des utilisateurs.');
            }
            const users = res.data;
            const sellers = users.filter(user => user.role === 'Vendeur');
            setSellersHistory(sellers);
        } catch (err) {
            toast.error(err.message || 'Erreur lors du chargement de l\'historique.');
        }
    };
    // ... après les fonctions existantes
const fetchDeletionHistory = async () => {
    try {
        const res = await axios.get('/api/actions/deletions');
        setDeletionHistory(res.data);
    } catch (err) {
        toast.error('Erreur lors du chargement de l\'historique des suppressions.');
        console.error(err);
    }
};



const handleDeleteSeller = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce vendeur et sa base de données ? Cette action est irréversible.")) {
        try {
            const res = await axios.delete(`/api/users/${id}`);
            toast.success(res.data.message);
            fetchSellersHistory(); // Recharger la liste des vendeurs
            // Si le vendeur supprimé est celui actuellement sélectionné, revenir à la vue globale
            if (selectedSeller && selectedSeller._id === id) {
                setSelectedSeller(null);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de la suppression du vendeur.');
            console.error(err);
        }
    }
};
    const fetchDataForSeller = async (dbName) => {
        if (!dbName) {
            toast.error("Nom de la base de données du vendeur manquant.");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/get-seller-data/${dbName}`);
            const data = res.data;
            if (data) {
                setTruckers(data.truckers || []);
                setApprovisionnements(data.approvisionnements || []);
                setHistoryData(data.history || []);
    
                // Total des litres approvisionnés
                const totalGasoilAppro = (data.approvisionnements || []).reduce((acc, curr) => {
                    const quantite = parseFloat(curr.quantite);
                    return acc + (isNaN(quantite) ? 0 : quantite);
                }, 0);
    
                // Total des litres attribués, en excluant les consommations
                const totalGasoilAttributed = (data.history || [])
                    .filter(entry => entry.gasoilConsumed === undefined || entry.gasoilConsumed === null)
                    .reduce((acc, curr) => {
                        const liters = parseFloat(curr.liters);
                        return acc + (isNaN(liters) ? 0 : liters);
                    }, 0);
                
                // Le calcul final du stock restant : approvisionnement moins l'attribué
                const remainingGasoil = totalGasoilAppro - totalGasoilAttributed;
    
                setBilanData({
                    totalGasoilAttributed,
                    totalGasoilAppro,
                    remainingGasoil,
                });
            }
        } catch (err) {
            toast.error("Erreur lors du chargement des données du vendeur.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const handleSellerChange = (e) => {
        const selectedDbName = e.target.value;
        const selectedSeller = sellersHistory.find(seller => seller.dbName === selectedDbName);
        
        // Mettre à jour l'état avec l'objet vendeur complet
        setSelectedSeller(selectedSeller);
        
        // Assurez-vous que l'objet a été trouvé avant de tenter de charger les données
        if (selectedSeller) {
            fetchDataForSeller(selectedSeller.dbName);
        } else {
            // Si aucun vendeur n'est sélectionné, réinitialiser les données
            setTruckers([]);
            setApprovisionnements([]);
            setHistoryData([]);
        }
    };
    const handleDelete = async (id, type) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
            try {
                let endpoint;
                if (selectedSeller) {
                    // Utilisez un nouvel endpoint spécifique pour les administrateurs/gestionnaires
                    endpoint = `/api/admin/delete-history/${selectedSeller.dbName}/${type}/${id}`;
                } else {
                    // Endpoint pour la suppression classique (non liée à un vendeur)
                    endpoint = `/api/${type}/${id}`;
                }
    
                const res = await axios.delete(endpoint);
                toast.success(res.data.message);
        
                // Mise à jour de l'état après une suppression réussie
                if (type.includes('approvisionnement')) { // Utilisez .includes() pour une meilleure robustesse
                    fetchApprovisionnements();
                } else if (type.includes('attributions')) {
                    fetchHistory();
                }
                fetchAll();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
                console.error(err);
            }
        }
    };
    // const fetchHistory = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/gasoil/history', {
    //              headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         if (!res.ok) throw new Error('Erreur chargement historique');
    //         const data = await res.json();
    //         setHistoryData(data);
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur historique');
    //     }
    // };
    // const fetchHistory = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/attributions', {
    //              headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         if (!res.ok) throw new Error('Erreur chargement historique');
    //         const data = await res.json();
    //         setHistoryData(data);
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur historique');
    //     }
    // };
    
    

    // const fetchSellersHistory = async () => {
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/users', {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
    //         if (!res.ok) {
    //             throw new Error('Erreur lors de la récupération des utilisateurs.');
    //         }
    //         const users = await res.json();
    //         const sellers = users.filter(user => user.role === 'Vendeur');
    //         setSellersHistory(sellers);
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur lors du chargement de l\'historique.');
    //     }
    // };
   
    // const handleAddTrucker = async (e) => {
    //     e.preventDefault();
    //     if (!newPlate) {
    //         return toast.error('Veuillez remplir le champ "Machine".');
    //     }
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/truckers', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ truckPlate: newPlate }),
    //         });
    //         if (!res.ok) throw new Error('Erreur lors de la création de la machine.');
    //         await fetchTruckers();
    //         setShowAddTruckerModal(false);
    //         setNewPlate('');
    //         toast.success('Machine ajoutée avec succès 🎉');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur création');
    //     }
    // };

    // const handleAttribGasoil = async (e) => {
    //     e.preventDefault();
    //     if (!selectedPlate || !liters || !attribDate) {
    //         return toast.error('Veuillez remplir tous les champs obligatoires.');
    //     }
    //     const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
    //     if (!trucker) {
    //         return toast.error('Plaque non trouvée.');
    //     }
    //     const litersToAttrib = Number(liters);
    //     const machineName = selectedPlate.toUpperCase();
    //     const limit = limits[machineName];
    //     if (limit && litersToAttrib > limit) {
    //         return toast.error(`Impossible d'attribuer plus de ${limit} L à la machine "${selectedPlate}".`);
    //     }
    //     try {
    //         const res = await fetch(`https://minegestback.onrender.com/api/truckers/${trucker._id}/gasoil`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 liters: litersToAttrib,
    //                 date: attribDate,
    //                 operator,
    //                 name: chauffeurName,
    //                 activity,
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'attribution.');
    //         }
    //         await fetchAll();
    //         toast.success('Gasoil attribué ✅');
    //         setShowAttribGasoilModal(false);
    //         setSelectedPlate('');
    //         setLiters('');
    //         setAttribDate('');
    //         setOperator('');
    //         setActivity('');
    //         setChauffeurName('');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };

    // const handleApprovisionnementSubmit = async (e) => {
    //     e.preventDefault();
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/approvisionnement', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ date, fournisseur, quantite, prixUnitaire, receptionniste }),
    //         });
    //         if (!res.ok) throw new Error('Erreur d\'approvisionnement.');
    //         toast.success('Approvisionnement enregistré ✅');
    //         setShowApprovisionnementModal(false);
    //         setDate('');
    //         setFournisseur('');
    //         setQuantite(0);
    //         setPrixUnitaire(0);
    //         setReceptionniste('');
    //         await fetchAll();
    //     } catch {
    //         toast.error('Erreur d\'approvisionnement.');
    //     }
    // };
    // const handleAddTrucker = async (e) => {
    //     e.preventDefault();
    //     if (!newPlate) {
    //         return toast.error('Veuillez remplir le champ "Machine".');
    //     }
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/truckers', {
    //             method: 'POST',
    //             headers: { 
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({ truckPlate: newPlate }),
    //         });
    //         if (!res.ok) throw new Error('Erreur lors de la création de la machine.');
    //         await fetchTruckers();
    //         setShowAddTruckerModal(false);
    //         setNewPlate('');
    //         toast.success('Machine ajoutée avec succès 🎉');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur création');
    //     }
    // };

    // const handleAttribGasoil = async (e) => {
    //     e.preventDefault();
    //     if (!selectedPlate || !liters || !attribDate) {
    //         return toast.error('Veuillez remplir tous les champs obligatoires.');
    //     }
    //     const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
    //     if (!trucker) {
    //         return toast.error('Plaque non trouvée.');
    //     }
    //     const litersToAttrib = Number(liters);
    //     const machineName = selectedPlate.toUpperCase();
    //     const limit = limits[machineName];
    //     if (limit && litersToAttrib > limit) {
    //         return toast.error(`Impossible d'attribuer plus de ${limit} L à la machine "${selectedPlate}".`);
    //     }
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch(`https://minegestback.onrender.com/api/truckers/${trucker._id}/gasoil`, {
    //             method: 'POST',
    //             headers: { 
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({
    //                 liters: litersToAttrib,
    //                 date: attribDate,
    //                 operator,
    //                 name: chauffeurName,
    //                 activity,
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'attribution.');
    //         }
    //         await fetchAll();
    //         toast.success('Gasoil attribué ✅');
    //         setShowAttribGasoilModal(false);
    //         setSelectedPlate('');
    //         setLiters('');
    //         setAttribDate('');
    //         setOperator('');
    //         setActivity('');
    //         setChauffeurName('');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };

    // const handleApprovisionnementSubmit = async (e) => {
    //     e.preventDefault();
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/approvisionnement', {
    //             method: 'POST',
    //             headers: { 
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({ date, fournisseur, quantite, prixUnitaire, receptionniste }),
    //         });
    //         if (!res.ok) throw new Error('Erreur d\'approvisionnement.');
    //         toast.success('Approvisionnement enregistré ✅');
    //         setShowApprovisionnementModal(false);
    //         setDate('');
    //         setFournisseur('');
    //         setQuantite(0);
    //         setPrixUnitaire(0);
    //         setReceptionniste('');
    //         await fetchAll();
    //     } catch {
    //         toast.error('Erreur d\'approvisionnement.');
    //     }
    // };
    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            borderRadius: '10px',
            border: state.isFocused ? '2px solid #007bff' : '2px solid #ced4da',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(0, 123, 255, 0.25)' : 'none',
            transition: 'all 0.3s ease',
            minHeight: '45px',
            '&:hover': {
                borderColor: '#007bff'
            }
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.3s ease-out'
        }),
        option: (base, state) => ({
            ...base,
            padding: '12px 20px',
            transition: 'all 0.2s ease',
            backgroundColor: state.isFocused ? '#e9ecef' : state.isSelected ? '#007bff' : 'white',
            color: state.isSelected ? 'white' : '#495057',
            '&:active': {
                backgroundColor: '#0056b3'
            }
        }),
        placeholder: (base) => ({
            ...base,
            color: '#adb5bd',
            fontStyle: 'italic',
        }),
    };
    const handleAddTrucker = async (e) => {
        e.preventDefault();
        if (!newPlate) {
            return toast.error('Veuillez remplir le champ "Machine".');
        }
        try {
            const res = await axios.post('/api/truckers', { truckPlate: newPlate });
            if (res.status !== 201) throw new Error('Erreur lors de la création de la machine.');
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
            const res = await axios.post(`/api/truckers/${trucker._id}/gasoil`, {
                liters: litersToAttrib,
                date: attribDate,
                operator,
                name: chauffeurName,
                activity,
            });
            if (res.status !== 200) {
                throw new Error(res.data.message || 'Erreur lors de l\'attribution.');
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
            const res = await axios.post('/api/approvisionnement', { date, fournisseur, quantite, prixUnitaire, receptionniste });
            if (res.status !== 201) throw new Error('Erreur d\'approvisionnement.');
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

    // const handleSaveData = async (e) => {
    //     e.preventDefault();
    //     if (!volumeSable || !gasoilConsumed) {
    //         return toast.error('Veuillez entrer le volume de sable et le gasoil consommé.');
    //     }
    //     const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
    //     if (!trucker) {
    //         return toast.error('Plaque non trouvée.');
    //     }
    //     const endTime = new Date();
    //     const durationMs = endTime.getTime() - chronoStart;
    //     const durationHours = Math.floor(durationMs / 3600000);
    //     const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
    //     const duration = `${durationHours}h ${durationMinutes}m`;
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/gasoil/attribution-chrono', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 truckPlate: selectedPlate, liters: Number(gasoilConsumed), machineType: trucker.truckType,
    //                 startTime: new Date(chronoStart).toLocaleTimeString(), endTime: endTime.toLocaleTimeString(), duration, operator, activity,
    //                 gasoilConsumed: Number(gasoilConsumed), volumeSable: Number(volumeSable),
    //                 startKmPhoto: selectedPlate === 'CHARGEUSE' ? startKmPhoto : null,
    //                 endKmPhoto: selectedPlate === 'CHARGEUSE' ? endKmPhoto : null,
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'utilisation.');
    //         }
    //         toast.success('Utilisation enregistrée ✅');
    //         setShowChronoModal(false);
    //         setChronoStart(null);
    //         setChronoDisplay('00:00:00');
    //         setSelectedPlate('');
    //         setOperator('');
    //         setActivity('');
    //         setGasoilConsumed('');
    //         setVolumeSable('');
    //         setShowDataInputs(false);
    //         setStartKmPhoto(null);
    //         setEndKmPhoto(null);
    //         await fetchAll();
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };

    // const handleAddSeller = async (e) => {
    //     e.preventDefault();
    //     if (!newSellerUsername || !newSellerPassword) {
    //         toast.error('Veuillez remplir le nom et le mot de passe.');
    //         return;
    //     }
    //     try {
    //         const res = await fetch('https://minegestback.onrender.com/api/users', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 username: newSellerUsername,
    //                 password: newSellerPassword,
    //                 role: 'Vendeur'
    //             }),
    //         });
    //         if (!res.ok) {
    //             const errorData = await res.json();
    //             throw new Error(errorData.message || 'Erreur lors de la création du vendeur.');
    //         }
    //         await fetchSellersHistory();
    //         toast.success('Vendeur ajouté avec succès 🎉');
    //         setShowAddSellerModal(false);
    //         setNewSellerUsername('');
    //         setNewSellerPassword('');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur création');
    //     }
    // };
    // const handleSaveData = async (e) => {
    //     e.preventDefault();
    //     if (!volumeSable || !gasoilConsumed) {
    //         return toast.error('Veuillez entrer le volume de sable et le gasoil consommé.');
    //     }
    //     const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
    //     if (!trucker) {
    //         return toast.error('Plaque non trouvée.');
    //     }
    //     const endTime = new Date();
    //     const durationMs = endTime.getTime() - chronoStart;
    //     const durationHours = Math.floor(durationMs / 3600000);
    //     const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
    //     const duration = `${durationHours}h ${durationMinutes}m`;
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/gasoil/attribution-chrono', {
    //             method: 'POST',
    //             headers: { 
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({
    //                 truckPlate: selectedPlate, liters: Number(gasoilConsumed), machineType: trucker.truckType,
    //                 startTime: new Date(chronoStart).toLocaleTimeString(), endTime: endTime.toLocaleTimeString(), duration, operator, activity,
    //                 gasoilConsumed: Number(gasoilConsumed), volumeSable: Number(volumeSable),
    //                 startKmPhoto: selectedPlate === 'CHARGEUSE' ? startKmPhoto : null,
    //                 endKmPhoto: selectedPlate === 'CHARGEUSE' ? endKmPhoto : null,
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'utilisation.');
    //         }
    //         toast.success('Utilisation enregistrée ✅');
    //         setShowChronoModal(false);
    //         setChronoStart(null);
    //         setChronoDisplay('00:00:00');
    //         setSelectedPlate('');
    //         setOperator('');
    //         setActivity('');
    //         setGasoilConsumed('');
    //         setVolumeSable('');
    //         setShowDataInputs(false);
    //         setStartKmPhoto(null);
    //         setEndKmPhoto(null);
    //         await fetchAll();
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };

    // const handleAddSeller = async (e) => {
    //     e.preventDefault();
    //     if (!newSellerUsername || !newSellerPassword) {
    //         toast.error('Veuillez remplir le nom et le mot de passe.');
    //         return;
    //     }
    //     try {
    //         const token = localStorage.getItem('token');
    //         const res = await fetch('https://minegestback.onrender.com/api/users', {
    //             method: 'POST',
    //             headers: { 
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({
    //                 username: newSellerUsername,
    //                 password: newSellerPassword,
    //                 role: 'Vendeur'
    //             }),
    //         });
    //         if (!res.ok) {
    //             const errorData = await res.json();
    //             throw new Error(errorData.message || 'Erreur lors de la création du vendeur.');
    //         }
    //         await fetchSellersHistory();
    //         toast.success('Vendeur ajouté avec succès 🎉');
    //         setShowAddSellerModal(false);
    //         setNewSellerUsername('');
    //         setNewSellerPassword('');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur création');
    //     }
    // };
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
        const duration = chronoDisplay;
        try {
            const res = await axios.post(`/api/gasoil/attribution-chrono`, {
                truckPlate: selectedPlate,
                liters: Number(gasoilConsumed),
                machineType: trucker.truckType,
                startTime: moment(chronoStart).format(),
                endTime: moment(endTime).format(),
                duration: duration,
                operator,
                activity,
                chauffeurName,
                volumeSable,
                gasoilConsumed,
                startKmPhoto: startKmPhoto,
                endKmPhoto: endKmPhoto,
            });
            if (res.status !== 200) {
                throw new Error(res.data.message || 'Erreur de sauvegarde des données.');
            }
            toast.success('Données enregistrées avec succès ✅');
            setShowChronoModal(false);
            setChronoRunning(false);
            setChronoStart(null);
            setChronoDisplay('00:00:00');
            setVolumeSable('');
            setGasoilConsumed('');
            setStartKmPhoto(null);
            setEndKmPhoto(null);
            await fetchAll();
        } catch (err) {
            toast.error(err.message || 'Erreur de sauvegarde des données.');
        }
    };

    const handleDeleteAttribution = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette attribution ?")) {
            try {
                await axios.delete(`/api/attribution-gasoil/${id}`);
                toast.success("Attribution supprimée avec succès !");
                await fetchAll();
            } catch (err) {
                toast.error("Erreur lors de la suppression de l'attribution.");
            }
        }
    };

    const handleAddSeller = async (e) => {
        e.preventDefault();
        if (!newSellerUsername || !newSellerPassword) {
            return toast.error('Veuillez remplir tous les champs.');
        }
        try {
            const res = await axios.post('/api/users', { username: newSellerUsername, password: newSellerPassword });
            if (res.status !== 201) {
                throw new Error('Erreur lors de l\'ajout du vendeur.');
            }
            // MODIFICATIONS POUR LA NOUVELLE MODALE
            const { username, password } = res.data;
            setCreatedUsername(username);
            setCreatedPassword(password);
            setShowCredentialsModal(true);
            
            await fetchSellersHistory();
            toast.success('Vendeur ajouté avec succès 🎉');
            setShowAddSellerModal(false);
            setNewSellerUsername('');
            setNewSellerPassword('');
        } catch (err) {
            toast.error(err.message || 'Erreur lors de l\'ajout du vendeur.');
        }
    };
    // ... (autres fonctions de gestion de modales)
const handleCloseCredentialsModal = () => setShowCredentialsModal(false);

const handleCopyCredentials = async () => {
    const textToCopy = `Nom d'utilisateur: ${createdUsername}\nMot de passe: ${createdPassword}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        toast.success("Identifiants copiés dans le presse-papiers !");
    } catch (err) {
        toast.error("Erreur lors de la copie. Veuillez copier manuellement.");
        console.error('Erreur de copie:', err);
    }
};

const handleDownloadPDF = () => {
    const credentialsElement = credentialsRef.current;
    if (!credentialsElement) {
        toast.error("Élément introuvable pour la capture.");
        return;
    }

    const options = {
        margin: 10,
        filename: `identifiants_${createdUsername}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
    };

    html2pdf().set(options).from(credentialsElement).save();
    toast.success("Fichier téléchargé avec succès !");
};
// ...
    const handleDeleteApprovisionnement = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet approvisionnement ?")) {
            try {
                await axios.delete(`/api/approvisionnement/${id}`);
                toast.success("Approvisionnement supprimé avec succès !");
                await fetchAll();
            } catch (err) {
                toast.error("Erreur lors de la suppression de l'approvisionnement.");
            }
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

    // Memos - Trier de la plus récente à la plus ancienne
    const attributionsHistory = useMemo(() => {
        const filtered = historyData.filter(h => h.liters && !h.startTime);
        return sortByDateDesc(filtered);
    }, [historyData]);
    const chronoHistory = useMemo(() => {
        const filtered = historyData.filter(h => h.startTime);
        return sortByDateDesc(filtered);
    }, [historyData]);

    const totalLitersAttributed = useMemo(() => attributionsHistory.reduce((acc, curr) => acc + (curr.liters || 0), 0), [attributionsHistory]);
    
    // Le useMemo pour stockRestant est maintenant déclaré après totalLitersAttributed
    const stockRestant = useMemo(() => bilanData ? bilanData.totalAppro - totalLitersAttributed : 0, [bilanData, totalLitersAttributed]);

    const stockToDisplay = selectedSeller
        ? bilanData?.remainingGasoil
        : stockRestant;

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

    // const getGasoilDataForChart = () => {
    //     if (!bilanData) return [];
    //     return [
    //         { name: 'Total Approvisionné', value: bilanData.totalAppro },
    //         { name: 'Total Attribué', value: totalLitersAttributed },
    //         { name: 'Stock Restant', value: stockRestant },
    //     ];
    // };
    const getGasoilDataForChart = () => {
        if (selectedSeller && bilanData) {
            // Logique pour les anciens vendeurs
            return [
                { name: 'Gasoil Attribué', value: bilanData.totalGasoilAttributed },
                { name: 'Stock Restant', value: bilanData.remainingGasoil },
                { name: 'Approvisionnements', value: bilanData.totalGasoilAppro },
            ].filter(data => data.value > 0);
        } else {
            // Logique pour les nouveaux vendeurs
            return [
                { name: 'Gasoil Attribué', value: totalLitersAttributed },
                { name: 'Stock Restant', value: stockRestant },
                { name: 'Approvisionnements', value: bilanData?.totalAppro || 0 },
            ].filter(data => data.value > 0);
        }
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
        <Card className="kpi-card-refined">
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

    // Les autres memos restent inchangés - Trier de la plus récente à la plus ancienne
    const filteredAppro = useMemo(() => {
        const filtered = approvisionnements.filter(a => (a.fournisseur || '').toLowerCase().includes(search.toLowerCase()) || (a.date || '').toLowerCase().includes(search.toLowerCase()));
        return sortByDateDesc(filtered);
    }, [approvisionnements, search]);
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
    if (!filterDate || typeof filterDate.toLocaleDateString !== 'function') {
        return [];
    }
    
    // Correction : utilisez la variable 'attributionsHistory'
    if (!attributionsHistory || attributionsHistory.length === 0) {
        return [];
    }

    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth();
    const filterDay = filterDate.getDate();

    const dailyData = attributionsHistory.filter(item => {
        if (!item.date) return false;
        try {
            const itemDate = new Date(item.date);
            
            return itemDate.getFullYear() === filterYear &&
                   itemDate.getMonth() === filterMonth &&
                   itemDate.getDate() === filterDay;

        } catch (e) {
            console.error("Erreur de format de date pour l'élément :", item, e);
            return false;
        }
    });

    const aggregatedData = dailyData.reduce((acc, curr) => {
        if (curr.truckPlate && curr.liters) {
            const liters = parseFloat(curr.liters);
            if (!isNaN(liters)) {
                if (!acc[curr.truckPlate]) acc[curr.truckPlate] = 0;
                acc[curr.truckPlate] += liters;
            }
        }
        return acc;
    }, {});

    return Object.keys(aggregatedData).map(key => ({ name: key, liters: aggregatedData[key] }));
}, [attributionsHistory, filterDate]); // Correction : mettez 'attributionsHistory' en dépendance
    return (
        <div className="dashboard-wrapper">
            <ToastContainer position="top-right" autoClose={3000} theme="light" />

            {/* Sidebar Overlay pour mobile */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar */}
<motion.div
    className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
    initial={{ x: -250 }}
    animate={{ x: isSidebarOpen ? 0 : -250 }}
    transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
>
    <div className="sidebar-header">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        {isSidebarOpen && <h4>MineGest</h4>}
        {isSidebarOpen && (
            <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
                &times;
            </button>
        )}
    </div>
    <ul className="sidebar-menu">
        <li className={activeSection === 'dashboard' ? 'active' : ''} onClick={() => { setActiveSection('dashboard'); setIsSidebarOpen(false); }}>
            <FaChartLine />
            <span>Dashboard</span>
        </li>
        <li className={activeSection === 'monthly-reports' ? 'active' : ''} onClick={() => { setActiveSection('monthly-reports'); setIsSidebarOpen(false); }}>
            <FaChartLine />
            <span>Bilans mensuels</span>
        </li>
        <li className={activeSection === 'forms' ? 'active' : ''} onClick={() => { setActiveSection('forms'); setIsSidebarOpen(false); }}>
            <FaPlus />
            <span>Actions</span>
        </li>
        <li className={activeSection === 'history' ? 'active' : ''} onClick={() => { setActiveSection('history'); setIsSidebarOpen(false); }}>
            <FaHistory />
            <span>Historique</span>
        </li>
        <li className={activeSection === 'users' ? 'active' : ''} onClick={() => { setActiveSection('users'); setIsSidebarOpen(false); }}>
            <FaUserShield />
            <span>Utilisateurs</span>
        </li>
        <li className={activeSection === 'deletionHistory' ? 'active' : ''}
            onClick={() => { setActiveSection('deletionHistory'); fetchDeletionHistory(); setIsSidebarOpen(false); }}>
            <FaHistory className="me-2" />
            <span>Historique des suppressions</span>
        </li>
    </ul>
    <div className="sidebar-footer">
        <button 
            className="sidebar-logout-btn"
            onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }}
        >
            <FaSignOutAlt />
            <span>Déconnexion</span>
        </button>
    </div>
</motion.div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="mobile-bottom-nav">
                <button 
                    className={`mobile-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveSection('dashboard')}
                >
                    <FaChartLine />
                    <span>Dashboard</span>
                </button>
                <button 
                    className={`mobile-nav-item ${activeSection === 'monthly-reports' ? 'active' : ''}`}
                    onClick={() => setActiveSection('monthly-reports')}
                >
                    <FaChartLine />
                    <span>Bilans</span>
                </button>
                <button 
                    className={`mobile-nav-item ${activeSection === 'forms' ? 'active' : ''}`}
                    onClick={() => setActiveSection('forms')}
                >
                    <FaPlus />
                    <span>Actions</span>
                </button>
                <button 
                    className={`mobile-nav-item ${activeSection === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveSection('history')}
                >
                    <FaHistory />
                    <span>Historique</span>
                </button>
                <button 
                    className={`mobile-nav-item ${activeSection === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveSection('users')}
                >
                    <FaUserShield />
                    <span>Users</span>
                </button>
            </div>

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
                        <Button variant="outline-secondary" onClick={() => setShowExportPeriodModal(true)} className="btn-icon-hover me-2">
                            <FaCalendarAlt /> Export par Période
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
                            <FaFileExcel /> Export Complet
                        </Button>
                    </div>
                </motion.div>
                {/* <motion.div variants={itemVariants} className="mb-4">

<Card className="dashboard-chart-card">

<Card.Body>
<Card.Title className="section-title">Sélectionner un Vendeur</Card.Title>
<Form.Group as={Col} controlId="formSelectedSeller" className="mt-3">
<Form.Select value={selectedSeller ? selectedSeller.dbName : ''} onChange={handleSellerChange}>
<option value="">Sélectionnez un vendeur</option>
{sellersHistory.map((seller) => (
<option key={seller._id} value={seller.dbName}>
{seller.username} {seller.managerId ? `(${seller.managerId.username})` : ''}
</option>
))}
</Form.Select>
</Form.Group>
</Card.Body>
</Card>
</motion.div> */}
                {/* KPI Cards - Uniquement dans la section dashboard */}
                {activeSection === 'dashboard' && (
                <>
                <Row className="mb-4 align-items-center">
                    {/* Colonne pour le sélecteur de vendeur */}
                    <Col xs={12} md={6} lg={4}>
                        <Form.Group controlId="formSelectedSeller" className="mt-3">
                            <Form.Label className="fw-bold"><FaUserShield /> Sélectionner un vendeur</Form.Label>
                            <Form.Select value={selectedSeller ? selectedSeller.dbName : ''} onChange={handleSellerChange}>
                                <option value="">Sélectionnez un vendeur</option>
                                {sellersHistory.map((seller) => (
                                    <option key={seller._id} value={seller.dbName}>
                                        {seller.username} {seller.managerId ? `(${seller.managerId.username})` : ''}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    {/* Colonne pour le sélecteur de date */}
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
                <motion.div variants={pageVariants} initial="initial" animate="in" exit="out" className="kpi-grid-refined">
    {/* Section des cartes pour la durée d'utilisation (déjà corrigée) */}
    <motion.div variants={itemVariants}>
                        <Card className="kpi-card-refined">
                            <div className="kpi-icon-bg"><FaWarehouse /></div>
                            <Card.Body>
                            <Card.Title>Stock Restant</Card.Title>
                            <h4 className="kpi-value">{selectedSeller ? (bilanData?.remainingGasoil !== undefined ? formatNumber(bilanData.remainingGasoil) : '...') : formatNumber(stockRestant)} L</h4></Card.Body>
                        </Card>
                    </motion.div>
    {getDailyDurationData.length > 0 ? (
        getDailyDurationData.map((data, index) => (
            <motion.div variants={itemVariants} key={index}>
                <Card className="kpi-card-refined">
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
            <Card className="kpi-card-refined">
                <Card.Body>
                    <Card.Title>Durée d'Utilisation</Card.Title>
                    <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
                </Card.Body>
            </Card>
        </motion.div>
    )}
    
    {/* Section des cartes pour l'attribution de gasoil (déjà corrigée) */}
    {filteredAttributionsHistory.length > 0 ? (
        filteredAttributionsHistory.map((data, index) => (
            <motion.div variants={itemVariants} key={index}>
                <Card className="kpi-card-refined">
                    <div className="kpi-icon-bg"><FaGasPump /></div>
                    <Card.Body>
                        <Card.Title>Gasoil Attribué</Card.Title>
                        <h5 className="kpi-subtitle">Machine: {data.truckPlate}</h5>
                        <h4 className="kpi-value">{formatNumber(data.liters)} L</h4>
                    </Card.Body>
                </Card>
            </motion.div>
        ))
    ) : (
        <motion.div variants={itemVariants}>
            <Card className="kpi-card-refined">
                <Card.Body>
                    <Card.Title>Gasoil Attribué</Card.Title>
                    <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
                </Card.Body>
            </Card>
        </motion.div>
    )}
    
    {/* Nouvelle section pour les cartes du volume de sable */}
    {filteredChronoHistory.length > 0 ? (
    filteredChronoHistory.map((data, index) => (
        <motion.div variants={itemVariants} key={index}>
            <Card className="kpi-card-refined">
                <div className="kpi-icon-bg"><FaBoxes /></div>
                <Card.Body>
                    <Card.Title>Total Sable</Card.Title>
                    <h5 className="kpi-subtitle">Machine: {data.truckPlate}</h5>
                    <h4 className="kpi-value">{formatNumber(data.volumeSable)} m³</h4>
                </Card.Body>
            </Card>
        </motion.div>
    ))
) : (
    <motion.div variants={itemVariants}>
        <Card className="kpi-card-refined">
            <Card.Body>
                <Card.Title>Total Sable</Card.Title>
                <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
            </Card.Body>
        </Card>
    </motion.div>
)}
{/* <motion.div variants={itemVariants} className="mb-4">

<Card className="dashboard-chart-card">

<Card.Body>

<Card.Title className="section-title">Sélectionner un Vendeur</Card.Title>

<Form.Group as={Col} controlId="formSelectedSeller" className="mt-3">

<Form.Label>Sélectionner un Vendeur</Form.Label>

<Form.Select value={selectedSeller ? selectedSeller.dbName : ''} onChange={handleSellerChange}>

<option value="">Sélectionnez un vendeur</option>

{sellersHistory.map((seller) => (

<option key={seller._id} value={seller.dbName}>

{seller.username} {seller.managerId ? `(${seller.managerId.username})` : ''}

</option>

))}

</Form.Select>

</Form.Group>

</Card.Body>

</Card>

</motion.div> */}
                </motion.div>
                </>
                )}
                {/* Main Content Area with conditional rendering */}
                <div className="dashboard-content-area">
                    <AnimatePresence mode='wait'>
                    {activeSection === 'dashboard' && (
                <motion.div key="dashboard-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                    {/* <Row className="mb-4 align-items-center">
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
                    </Row> */}
                    <Row className="g-4">
                        <Col xs={12} lg={6}>
                            <Card className="dashboard-chart-card">
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
                            <Card className="dashboard-chart-card">
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
                        <Col xs={12} lg={6}>
                            <Card className="dashboard-chart-card">
                                <Card.Body>
                                    <Card.Title>Volume de Sable Journalier (m³)</Card.Title>
                                    <Plot
                                        data={[{
                                            x: getDailySableData.map(d => d.name),
                                            y: getDailySableData.map(d => d.volumeSable),
                                            type: 'bar',
                                            marker: { color: getColorsForMachines(getDailySableData) },
                                            hovertemplate: '<b>%{x}</b><br>Volume: %{y} m³<extra></extra>',
                                        }]}
                                        layout={{
                                            autosize: true,
                                            height: 300,
                                            margin: { l: 60, r: 10, t: 30, b: 40 },
                                            xaxis: { title: 'Machine' },
                                            yaxis: { title: 'Volume (m³)' },
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
                            <Card className="dashboard-chart-card">
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
                                            xaxis: { title: 'Machine' },
                                            yaxis: { title: 'Durée (h)' },
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
                            <Card className="dashboard-chart-card">
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
                                                {/* <Button variant="success" size="lg" className="btn-fancy" onClick={handleShowAddTrucker}><FaPlus /> Ajouter une Machine</Button>
                                                <Button variant="warning" size="lg" className="btn-fancy" onClick={handleShowAttribGasoil}><FaGasPump /> Attribuer du Gasoil</Button>
                                                <Button variant="info" size="lg" className="btn-fancy" onClick={handleShowChrono}><FaClock /> Chrono Machine</Button>
                                                <Button variant="primary" size="lg" className="btn-fancy" onClick={handleShowApprovisionnement}><FaWarehouse /> Approvisionner le Stock</Button> */}
                                                <Button variant="dark" size="lg" className="btn-fancy" onClick={handleShowAddSeller}><FaUserShield /> Ajouter Vendeur</Button>
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        )}
{activeSection === 'history' && (
            <motion.div key="history-section" variants={pageVariants} initial="initial" animate="in" exit="out">
                <Card className="p-4 shadow-lg dashboard-chart-card">
                    <Card.Title className="text-dark d-flex justify-content-between align-items-center flex-wrap">
                        <span>Historique des Attributions</span>
                        <div className="d-flex flex-column flex-sm-row gap-2 mt-2 mt-sm-0">
                            <Button variant="outline-primary" size="sm" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover">
                                <FaFileExcel /> Export Complet
                            </Button>
                        </div>
                    </Card.Title>
                    <div className="mb-3">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Exporter le rapport d'une machine spécifique :</Form.Label>
                            <div className="d-flex flex-column flex-sm-row gap-2">
                                <Form.Select 
                                    id="machineExportSelect"
                                    className="flex-grow-1"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            exportMachineReportToExcel(e.target.value, attributionsHistory, chronoHistory);
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">Sélectionner une machine...</option>
                                    {[...new Set([...attributionsHistory.map(h => h.truckPlate), ...chronoHistory.map(h => h.truckPlate)])].map(plate => (
                                        <option key={plate} value={plate}>{plate}</option>
                                    ))}
                                </Form.Select>
                            </div>
                        </Form.Group>
                    </div>
                    <div className="table-responsive-refined">
                        <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Machine</th>
                                    <th>Litres</th>
                                    <th>Opérateur</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="4" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : attributionsHistory.length > 0 ? (
                                    attributionsHistory.map((h, index) => (
                                        <tr key={index}>
                                            <td data-label="Date">{new Date(h.date).toLocaleDateString()}</td>
                                            <td data-label="Machine">{h.truckPlate}</td>
                                            <td data-label="Litres">{formatNumber(h.liters)}</td>
                                            <td data-label="Opérateur">{h.operator || 'N/A'}</td>
                                            <td data-label="Action">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(h._id, 'attributions/gasoil')}
                                                    title="Supprimer l'attribution"
                                                >
                                                    <FaTrashAlt />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
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
                    <Card.Title className="text-dark d-flex justify-content-between align-items-center flex-wrap">
                        <span>Historique des Approvisionnements</span>
                        <Button variant="outline-primary" size="sm" onClick={() => exportAllHistoryToExcel({ attributions: attributionsHistory, chrono: chronoHistory, appro: filteredAppro, totalLitersAttributed, totalLitersUsed, totalSable, totalMontantAppro })} className="btn-icon-hover mt-2 mt-sm-0">
                            <FaFileExcel /> Export
                        </Button>
                    </Card.Title>
                    <div className="table-responsive-refined">
                        <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Fournisseur</th>
                                    <th>Quantité (L)</th>
                                    <th>Prix Unitaire</th>
                                    <th>Montant Total</th>
                                    <th>Réceptionniste</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="6" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : filteredAppro.length > 0 ? (
                                    filteredAppro.map((a, index) => (
                                        <tr key={index}>
                                            <td data-label="Date">{new Date(a.date).toLocaleDateString()}</td>
                                            <td data-label="Fournisseur">{a.fournisseur}</td>
                                            <td data-label="Quantité (L)">{formatNumber(a.quantite)}</td>
                                            <td data-label="Prix Unitaire">{formatNumber(a.prixUnitaire)} FCFA</td>
                                            <td data-label="Montant Total">{formatNumber(a.montantTotal)} FCFA</td>
                                            <td data-label="Réceptionniste">{a.receptionniste}</td>
                                            <td data-label="Action">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(a._id, 'approvisionnement')}
                                                    title="Supprimer l'approvisionnement"
                                                >
                                                    <FaTrashAlt />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
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
                <Card className="p-4 shadow-lg card-glass-light mt-4">
                    <Card.Title className="text-dark d-flex justify-content-between align-items-center flex-wrap">
                        <span>Historique des Utilisations (Chrono)</span>
                        <Button variant="outline-primary" size="sm" onClick={() => exportAllHistoryToExcel({
                            attributions: attributionsHistory,
                            chrono: chronoHistory,
                            appro: filteredAppro,
                            totalLitersAttributed,
                            totalLitersUsed,
                            totalSable,
                            totalMontantAppro
                        })} className="btn-icon-hover mt-2 mt-sm-0">
                            <FaFileExcel /> Export
                        </Button>
                    </Card.Title>
                    <div className="table-responsive">
                        <Table striped bordered hover className="mt-3 mobile-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Machine</th>
                                    <th>Chauffeur</th>
                                    <th>Durée</th>
                                    <th>Nombre de voyages</th>
                                    <th>Volume Sable (m³)</th>
                                    <th>Activité</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center"><Spinner animation="border" /> Chargement...</td></tr>
                                ) : chronoHistory.length > 0 ? (
                                    chronoHistory.map((h, index) => (
                                        <tr key={index}>
                                            <td data-label="Date">{new Date(h.date).toLocaleDateString()}</td>
                                            <td data-label="Machine">{h.truckPlate}</td>
                                            <td data-label="Chauffeur">{h.operator}</td>
                                            <td data-label="Durée">{h.duration}</td>
                                            <td data-label="Nombre de voyages">{formatNumber(h.gasoilConsumed)}</td>
                                            <td data-label="Volume Sable (m³)">{formatNumber(h.volumeSable)}</td>
                                            <td data-label="Activité">{h.activity}</td>
                                            <td data-label="Action">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(h._id, 'attributions/chrono')}
                                                    title="Supprimer l'attribution chrono"
                                                >
                                                    <FaTrashAlt />
                                                </Button>
                                            </td>
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
                <Card className="p-4 shadow-lg dashboard-chart-card">
                    <Card.Title className="text-dark">Historique des Ajouts d'Utilisateurs</Card.Title>
                    <div className="table-responsive-refined">
                        <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                            <thead>
                                <tr>
                                    <th>Date d'ajout</th>
                                    <th>Nom d'utilisateur</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="2" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : sellersHistory.length > 0 ? (
                                    sortByDateDesc(sellersHistory).map((user, index) => (
                                        <tr key={index}>
                                            <td data-label="Date d'ajout">{moment(user.createdAt).format('DD/MM/YYYY')}</td>
                                            <td data-label="Nom d'utilisateur">{user.username}</td>
                                            <td data-label="Action">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteSeller(user._id)}
                                                    title="Supprimer le vendeur"
                                                >
                                                    <FaTrashAlt />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (<tr><td colSpan="2" className="text-center">Aucun utilisateur ajouté.</td></tr>)}
                            </tbody>
                        </Table>
                    </div>
                </Card>
            </motion.div>
        )}
        <AnimatePresence mode="wait">
    <motion.div
        key={activeSection}
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
    >
        {activeSection === 'deletionHistory' && (
            <Card className="shadow-lg p-4 mt-3 card-glass-light">
            <Card.Title className="text-dark">Historique des suppressions</Card.Title>
            <div className="table-responsive-refined">
                <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Utilisateur</th>
                            <th>Action</th>
                            <th>Détails</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>
                        ) : deletionHistory.length > 0 ? (
                            sortByDateDesc(deletionHistory).map((action) => (
                                <tr key={action._id}>
                                    <td data-label="Date">{new Date(action.timestamp).toLocaleString()}</td>
                                    <td data-label="Utilisateur">{action.username}</td>
                                    <td data-label="Action">{action.action}</td>
                                    <td data-label="Détails" className="details-cell">
    <pre>{JSON.stringify(action.details, null, 2)}</pre>
</td>                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center">Aucune suppression enregistrée.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </Card>
        )}
    </motion.div>
</AnimatePresence>

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
<Modal show={showCredentialsModal} onHide={handleCloseCredentialsModal} centered className="modal-light-theme">
    <Modal.Header closeButton className="modal-header-light">
        <Modal.Title>Identifiants du nouveau vendeur</Modal.Title>
    </Modal.Header>
    <Modal.Body className="modal-body-light">
        <div ref={credentialsRef} style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <p><strong>Nom d'utilisateur:</strong> {createdUsername}</p>
            <p><strong>Mot de passe:</strong> {createdPassword}</p>
        </div>
    </Modal.Body>
    <Modal.Footer>
        <Button variant="info" onClick={handleCopyCredentials} className="me-2">
            <FaCopy /> Copier
        </Button>
        <Button variant="primary" onClick={handleDownloadPDF}>
            <FaDownload /> Télécharger
        </Button>
        <Button variant="secondary" onClick={handleCloseCredentialsModal}>
            Fermer
        </Button>
    </Modal.Footer>
</Modal>

{/* Modal pour Export par Période */}
<Modal show={showExportPeriodModal} onHide={() => setShowExportPeriodModal(false)} centered className="modal-light-theme">
    <Modal.Header closeButton className="modal-header-light">
        <Modal.Title>Export Excel par Période</Modal.Title>
    </Modal.Header>
    <Modal.Body className="modal-body-light">
        <Form>
            <Form.Group className="mb-3">
                <Form.Label>Date de début</Form.Label>
                <Form.Control
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    required
                />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Date de fin</Form.Label>
                <Form.Control
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    required
                />
            </Form.Group>
            <div className="d-flex gap-2 mt-4">
                <Button 
                    variant="success" 
                    className="flex-grow-1"
                    onClick={() => {
                        exportHistoryByPeriod({
                            attributions: attributionsHistory,
                            chrono: chronoHistory,
                            appro: filteredAppro
                        }, exportStartDate, exportEndDate);
                        setShowExportPeriodModal(false);
                    }}
                >
                    <FaFileExcel /> Exporter
                </Button>
                <Button variant="secondary" onClick={() => setShowExportPeriodModal(false)} className="flex-grow-1">
                    <FaTimes /> Annuler
                </Button>
            </div>
        </Form>
    </Modal.Body>
</Modal>
        </div>
    );
}

export default GasoilDashboard;