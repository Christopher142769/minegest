import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Container, Button, Form, Card, Row, Col, Table, Spinner, Badge, InputGroup, Modal } from 'react-bootstrap';
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
import { Camera, CameraResultType } from '@capacitor/camera';
// import LoginScreen from './LoginScreen';
// import AdminDashboard from './AdminDashboard';

// function App() {
//     const [user, setUser] = useState(null);
//     const [userRole, setUserRole] = useState('Vendeur');

//     const handleLogin = (loggedInUser) => {
//         setUser(loggedInUser);
//         setUserRole(loggedInUser.role);
//     };

//     if (!user) {
//         return <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} />;
//     }

//     if (userRole === 'Gestionnaire') {
//         return (
//             <>
//                 <AdminDashboard />
//                 <ToastContainer />
//             </>
//         );
//     }
//     return (
//         <>
//             <App user={user} />
//             <ToastContainer />
//         </>
//     );
// }
// =============================================================
//                   Fonctions Utilitaires
// =============================================================

// Formate un nombre pour l'affichage (ex: ajoute des séparateurs de milliers)
const formatNumber = (n) => (n === undefined || n === null ? '-' : n.toLocaleString());

// Fonction pour calculer les soldes journaliers
const calculateDailyBalances = (attributions, approvisionnements) => {
    // Créer un objet pour stocker les données par date
    const dailyData = {};
    
    // Traiter les approvisionnements
    approvisionnements.forEach(appro => {
        const dateKey = moment(appro.date).format('YYYY-MM-DD');
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, approvisionnement: 0, attribution: 0 };
        }
        dailyData[dateKey].approvisionnement += appro.quantite || 0;
    });
    
    // Traiter les attributions
    attributions.forEach(attr => {
        const dateKey = moment(attr.date).format('YYYY-MM-DD');
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, approvisionnement: 0, attribution: 0 };
        }
        dailyData[dateKey].attribution += attr.liters || 0;
    });
    
    // Convertir en tableau et trier par date (plus ancien en premier)
    const dailyArray = Object.values(dailyData).sort((a, b) => {
        return moment(a.date).diff(moment(b.date));
    });
    
    // Calculer le solde cumulatif
    let soldeCumulatif = 0;
    const balances = dailyArray.map(day => {
        soldeCumulatif = soldeCumulatif + day.approvisionnement - day.attribution;
        return {
            date: day.date,
            approvisionnement: day.approvisionnement,
            attribution: day.attribution,
            solde: soldeCumulatif
        };
    });
    
    return balances;
};

const exportAllHistoryToExcel = (data) => {
    // ... (Tout le code de votre fonction est inchangé jusqu'ici)
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
        // ... (Le code de votre fonction est inchangé ici)
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
        const headers = ["Date", "Machine", "Chauffeur", "Durée", "Gasoil Consommé (L)", "Volume Sable (m³)", "Activité"];
        const rows = data.chrono.map(h => ({
            "Date": moment(h.date).format('DD/MM/YYYY'),
            "Machine": h.truckPlate,
            "Chauffeur": h.chauffeurName,
            "Durée": h.duration,
            "Gasoil Consommé (L)": h.gasoilConsumed, // Correction: "Gasoil Consommé (L)" au lieu de "Nombre de voyages"
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

    // Feuille Soldes journaliers
    const dailyBalances = calculateDailyBalances(data.attributions, data.appro);
    if (dailyBalances.length > 0) {
        const headers = ["Date", "Approvisionnement", "Attribution", "Solde"];
        const rows = dailyBalances.map(b => ({
            "Date": moment(b.date).format('DD/MM/YYYY'),
            "Approvisionnement": b.approvisionnement,
            "Attribution": b.attribution,
            "Solde": b.solde
        }));
        const lastBalance = dailyBalances[dailyBalances.length - 1];
        const totals = ["TOTAL", "", "", lastBalance ? lastBalance.solde : 0];
        createStyledSheet('Soldes', headers, rows, totals);
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


// =============================================================
//                        Animations Framer Motion
// =============================================================


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
  // NOUVEL ÉTAT POUR L'ÉCRAN DE DÉMARRAGE
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  // NOUVEL useEffect pour gérer la minuterie
  useEffect(() => {
      const timer = setTimeout(() => {
          setShowSplashScreen(false);
      }, 3000); // Durée de 3 secondes pour l'animation
      return () => clearTimeout(timer); // Nettoyage de la minuterie
  }, []);

    // States
    const [truckers, setTruckers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('forms');
    const [showForm, setShowForm] = useState(null); // 'addTrucker', 'attribGasoil', etc.

    const [newPlate, setNewPlate] = useState('');
    // const [newType, setNewType] = useState('6 roues');
    // const [newName, setNewName] = useState('');

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
    // Effects
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

    // Data Fetching
    // const fetchAll = async () => {
    //     setLoading(true);
    //     await Promise.all([fetchTruckers(), fetchBilan(), fetchApprovisionnements(), fetchHistory()]);
    //     setLoading(false);
    // };
    // Data Fetching
    const fetchAll = async () => {
      toast.info("Actualisation en cours...");
      setLoading(true);
      await Promise.all([fetchTruckers(), fetchBilan(), fetchApprovisionnements(), fetchHistory()]);
      setLoading(false);
      toast.success("Actualisation terminée !");
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

    // Handlers
    // const handleAddTrucker = async (e) => {
    //     e.preventDefault();
    //     if (!newPlate || !newName) return toast.error('Remplissez les champs obligatoires.');
    //     try {
    //         const res = await fetch('http://localhost:5000/api/truckers', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ truckPlate: newPlate, truckType: newType, name: newName }),
    //         });
    //         if (!res.ok) throw new Error('Erreur lors de la création de la machine.');
    //         await fetchTruckers();
    //         setShowForm(null);
    //         setNewPlate('');
    //         setNewName('');
    //         setNewType('6 roues');
    //         toast.success('Machine ajoutée avec succès 🎉');
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur création');
    //     }
    // };
    const handleDeleteAttribution = async (id) => {
        // Vérification de l'ID avant de lancer la requête
        if (!id) {
            console.error("Erreur : L'ID d'attribution est manquant.");
            toast.error("Impossible de supprimer : ID manquant.");
            return;
        }
    
        // Confirmation de l'utilisateur
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette attribution de gasoil ?')) {
            try {
                const res = await fetch(`https://minegest.pro-aquacademy.com/api/attribution-gasoil/${id}`, {
                    method: 'DELETE',
                });
    
                if (!res.ok) {
                    // Gestion des erreurs : analyse de la réponse en fonction de son type de contenu
                    const contentType = res.headers.get("content-type");
                    let errorData;
    
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        errorData = await res.json();
                    } else {
                        errorData = await res.text();
                    }
    
                    throw new Error(errorData.message || errorData || 'Erreur inconnue lors de la suppression.');
                }
                
                // Rechargement des données pour mettre à jour le tableau
                await fetchAll(); 
                toast.success('Attribution supprimée avec succès.');
    
            } catch (err) {
                // Affichage de l'erreur dans une notification
                toast.error(err.message || 'Erreur de suppression.');
            }
        }
    };
    const handleAddTrucker = async (e) => {
        e.preventDefault();
        
        // Modification ici : on vérifie seulement si newPlate est vide
        if (!newPlate) {
          return toast.error('Veuillez remplir le champ "Machine".');
        }
        
        try {
            const res = await fetch('https://minegest.pro-aquacademy.com/api/truckers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ truckPlate: newPlate }), // <-- Changement ici
            });
            
            if (!res.ok) throw new Error('Erreur lors de la création de la machine.');
            
            await fetchTruckers();
            setShowForm(null);
            setNewPlate('');
            
            // Supprimez aussi ces lignes car newName et newType n'existent plus
            // setNewName('');
            // setNewType('6 roues');
    
            toast.success('Machine ajoutée avec succès 🎉');
        } catch (err) {
            toast.error(err.message || 'Erreur création');
        }
    };
    const limits = {
        'CHARGEUSE': 300,
        'GRANDE DRAGUE': 200,
        'PETITE DRAGUE': 100
    };
    // const handleAttribGasoil = async (e) => {
    //     e.preventDefault();
    //     if (!selectedPlate || !liters || !attribDate) return toast.error('Remplissez tous les champs obligatoires.');
    //     const trucker = truckers.find((t) => t.truckPlate === selectedPlate);
    //     if (!trucker) return toast.error('Plaque non trouvée.');
    //     try {
    //         const res = await fetch(`http://localhost:5000/api/truckers/${trucker._id}/gasoil`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 liters: Number(liters),
    //                 date: attribDate,
    //                 machineType,
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
    //         setShowForm(null);
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
    
        // --- NOUVELLE LOGIQUE DE VALIDATION ---
        const machineName = selectedPlate.toUpperCase(); // Assurez-vous que le nom de la machine est en majuscules pour correspondre aux clés de l'objet limits
        const limit = limits[machineName];
    
        // Si une limite existe pour la machine sélectionnée
        if (limit && litersToAttrib > limit) {
            return toast.error(`Impossible d'attribuer plus de ${limit} L à la machine "${selectedPlate}".`);
        }
        // --- FIN DE LA NOUVELLE LOGIQUE ---
        
        // Le reste du code d'attribution reste inchangé
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
            setShowForm(null);
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
            setShowForm(null);
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

    // const handleStartChrono = () => {
    //     if (!selectedPlate || !chauffeurName) {
    //         return toast.error('Veuillez sélectionner une plaque et un chauffeur.');
    //     }
    //     setChronoRunning(true);
    //     setChronoStart(Date.now());
    // };

    // const handleStopChrono = async (e) => {
    //     e.preventDefault();
    //     setChronoRunning(false);
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
    //         const res = await fetch('http://localhost:5000/api/gasoil/attribution-chrono', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 truckPlate: selectedPlate,
    //                 liters: Number(gasoilConsumed),
    //                 machineType: trucker.truckType,
    //                 startTime: new Date(chronoStart).toLocaleTimeString(),
    //                 endTime: endTime.toLocaleTimeString(),
    //                 duration: duration,
    //                 chauffeurName,
    //                 operator,
    //                 activity,
    //                 gasoilConsumed: Number(gasoilConsumed),
    //                 volumeSable: Number(volumeSable),
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'utilisation.');
    //         }
    //         toast.success('Utilisation enregistrée ✅');
    //         setShowForm(null);
    //         setChronoStart(null);
    //         setChronoDisplay('00:00:00');
    //         setSelectedPlate('');
    //         setChauffeurName('');
    //         setOperator('');
    //         setActivity('');
    //         setGasoilConsumed('');
    //         setVolumeSable('');
    //         await fetchAll();
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };
    
    const [showDataInputs, setShowDataInputs] = useState(false);
    // Ajoutez vos autres états ici si ce n'est pas déjà fait

    // const handleStartChrono = () => {
    //     if (!selectedPlate || !operator || !activity) {
    //         return toast.error('Veuillez remplir tous les champs.');
    //     }
    //     setChronoRunning(true);
    //     setChronoStart(Date.now());
    // };

    // const handleStopChrono = (e) => {
    //     e.preventDefault();
    //     setChronoRunning(false);
    //     setShowDataInputs(true);
    //     toast.info('Chrono arrêté. Veuillez entrer les données.');
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
    //         const res = await fetch('http://localhost:5000/api/gasoil/attribution-chrono', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 truckPlate: selectedPlate,
    //                 liters: Number(gasoilConsumed),
    //                 machineType: trucker.truckType,
    //                 startTime: new Date(chronoStart).toLocaleTimeString(),
    //                 endTime: endTime.toLocaleTimeString(),
    //                 duration: duration,
    //                 operator,
    //                 activity,
    //                 gasoilConsumed: Number(gasoilConsumed),
    //                 volumeSable: Number(volumeSable),
    //             }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'utilisation.');
    //         }
    //         toast.success('Utilisation enregistrée ✅');
    //         setShowForm(null);
    //         setChronoStart(null);
    //         setChronoDisplay('00:00:00');
    //         setSelectedPlate('');
    //         setOperator('');
    //         setActivity('');
    //         setGasoilConsumed('');
    //         setVolumeSable('');
    //         setShowDataInputs(false);
    //         await fetchAll();
    //     } catch (err) {
    //         toast.error(err.message || 'Erreur');
    //     }
    // };

    // const takePhoto = (isEndPhoto = false) => {
    //     return new Promise(async (resolve) => {
    //         try {
    //             const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    //             setVideoStream(stream);
    //             setCameraOpen(true);
    //             toast.info(`Veuillez prendre en photo le compteur de la machine.`);
                
    //             // Note : le bouton de prise de photo est maintenant dans le JSX
    //             resolve(true);
    //         } catch (err) {
    //             console.error("Erreur d'accès à la caméra :", err);
    //             toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    //             resolve(false);
    //         }
    //     });
    // };

    // const handleStartChrono = async () => {
    //     if (!selectedPlate || !operator || !activity) {
    //         return toast.error('Veuillez remplir tous les champs.');
    //     }
    //     if (selectedPlate === 'CHARGEUSE') {
    //         const hasCamera = await takePhoto();
    //         if (!hasCamera) return;
    //     } else {
    //         setChronoRunning(true);
    //         setChronoStart(Date.now());
    //         toast.info("Chrono démarré.");
    //     }
    // };
    
    // const handleStopChrono = async (e) => {
    //     e.preventDefault();
    //     setChronoRunning(false);
    //     if (selectedPlate === 'CHARGEUSE') {
    //         const hasCamera = await takePhoto(true);
    //         if (!hasCamera) return;
    //     }
    //     setShowDataInputs(true);
    //     toast.info('Chrono arrêté. Veuillez entrer les données.');
    // };
    
    // // Fonction pour gérer la prise de photo
    // const handleTakePhoto = () => {
    //     const video = videoRef.current;
    //     const canvas = canvasRef.current;
    //     if (!video || !canvas) return;

    //     canvas.width = video.videoWidth;
    //     canvas.height = video.videoHeight;
    //     const context = canvas.getContext('2d');
    //     context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
    //     const imageDataUrl = canvas.toDataURL('image/png');
    //     const isEndPhoto = chronoRunning; // Si le chrono est en cours c'est une photo de fin
    //     if (isEndPhoto) {
    //         setEndKmPhoto(imageDataUrl);
    //         toast.success('Photo de fin prise ✅');
    //     } else {
    //         setStartKmPhoto(imageDataUrl);
    //         toast.success('Photo de début prise ✅');
    //         setChronoRunning(true);
    //         setChronoStart(Date.now());
    //     }

    //     // Arrêter la caméra
    //     videoStream.getTracks().forEach(track => track.stop());
    //     setCameraOpen(false);
    //     setVideoStream(null);
    // };
        // NOUVELLE FONCTION pour la prise de photo avec Capacitor
        const handleTakePhoto = async (isEndPhoto) => {
          try {
              const photo = await Camera.getPhoto({
                  quality: 90,
                  allowEditing: false,
                  resultType: CameraResultType.DataUrl
              });
  
              if (isEndPhoto) {
                  setEndKmPhoto(photo.dataUrl);
                  toast.success('Photo de fin prise ✅');
              } else {
                  setStartKmPhoto(photo.dataUrl);
                  toast.success('Photo de début prise ✅');
                  setChronoRunning(true);
                  setChronoStart(Date.now());
              }
  
          } catch (error) {
              console.error("Erreur d'accès à la caméra :", error);
              toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
          }
      };
  
      // LOGIQUE DE CHRONO MODIFIÉE
      const handleStartChrono = async () => {
          if (!selectedPlate || !operator || !activity) {
              return toast.error('Veuillez remplir tous les champs.');
          }
  
          if (selectedPlate === 'CHARGEUSE') {
              await handleTakePhoto(false); // photo de début
          } else {
              setChronoRunning(true);
              setChronoStart(Date.now());
              toast.info("Chrono démarré.");
          }
      };
  
      const handleStopChrono = async () => {
          setChronoRunning(false);
          if (selectedPlate === 'CHARGEUSE') {
              await handleTakePhoto(true); // photo de fin
          }
          setShowDataInputs(true);
          toast.info('Chrono arrêté. Veuillez entrer les données.');
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
    //         const res = await fetch('https://minegest.pro-aquacademy.com/api/gasoil/attribution-chrono', {
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
    //         setShowForm(null);
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
                const contentType = res.headers.get("content-type");
                let errorData = 'Erreur inconnue lors de l\'enregistrement de l\'utilisation.';
    
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    try {
                        const jsonError = await res.json();
                        errorData = jsonError.message || errorData;
                    } catch (e) {
                        errorData = await res.text();
                    }
                } else {
                    errorData = await res.text();
                }
                throw new Error(errorData);
            }
            
            toast.success('Utilisation enregistrée ✅');
            setShowForm(null);
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
                // Mettez à jour la liste des approvisionnements après la suppression
                await fetchApprovisionnements(); 
                toast.success('Approvisionnement supprimé avec succès.');
            } catch (err) {
                toast.error(err.message || 'Erreur de suppression.');
            }
        }
    };
    // Memoized data
    const filteredHistory = useMemo(() => {
        let arr = historyData.filter(h => h.startTime || h.liters);
        if (search) {
            const q = search.toLowerCase();
            arr = arr.filter((h) => (h.truckPlate || '').toLowerCase().includes(q) || (h.chauffeurName || '').toLowerCase().includes(q));
        }
        return arr;
    }, [historyData, search]);

    const attributionsHistory = useMemo(() => {
        return historyData.filter(h => h.liters && !h.startTime);
    }, [historyData]);

    const chronoHistory = useMemo(() => {
        return historyData.filter(h => h.startTime);
    }, [historyData]);

    const filteredAppro = useMemo(() => {
        let arr = [...approvisionnements];
        if (search) {
            const q = search.toLowerCase();
            arr = arr.filter((a) => (a.fournisseur || '').toLowerCase().includes(q) || (a.date || '').toLowerCase().includes(q));
        }
        return arr;
    }, [approvisionnements, search]);

    const totalMontantAppro = useMemo(() => {
        return approvisionnements.reduce((acc, curr) => acc + curr.montantTotal, 0);
    }, [approvisionnements]);

    const totalLitersAttributed = useMemo(() => {
        return attributionsHistory.reduce((acc, curr) => acc + (curr.liters || 0), 0);
    }, [attributionsHistory]);

    const totalLitersUsed = useMemo(() => {
        return chronoHistory.reduce((acc, curr) => acc + (curr.gasoilConsumed || 0), 0);
    }, [chronoHistory]);

    const totalSable = useMemo(() => {
        return chronoHistory.reduce((acc, curr) => acc + (curr.volumeSable || 0), 0);
    }, [chronoHistory]);

    const getGasoilDataForChart = () => {
        if (!bilanData) return [];
        return [
            { name: 'Total Approvisionné', value: bilanData.totalAppro },
            { name: 'Total Attribué', value: totalLitersAttributed },
            // { name: 'Total Consommé', value: totalLitersUsed },
            { name: 'Stock Restant', value: bilanData.restante },
        ];
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
            const [showAddTruckerModal, setShowAddTruckerModal] = useState(false);
            const [showAttribGasoilModal, setShowAttribGasoilModal] = useState(false);
            const [showApprovisionnementModal, setShowApprovisionnementModal] = useState(false);
            const [showChronoModal, setShowChronoModal] = useState(false);
            const [showAddSellerModal, setShowAddSellerModal] = useState(false);
    return (
      // Conditionnel : si showSplashScreen est vrai, affiche le splash screen
      showSplashScreen ? (
        <motion.div
            className="splash-screen"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
                hidden: {},
                visible: {
                    transition: { staggerChildren: 0.2, duration: 1 }
                },
                exit: { opacity: 0, transition: { duration: 0.5 } }
            }}
        >
            <motion.div
                className="logo-container"
                variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: {
                        opacity: 1,
                        scale: 1,
                        rotateY: [0, 180, 360],
                        rotateZ: [0, -10, 10, 0],
                        transition: {
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            duration: 2
                        }
                    }
                }}
            >
                <img src={logo} alt="Logo" className="splash-logo" />
            </motion.div>
    
            <motion.h4
                variants={{
                    hidden: { y: 50, opacity: 0 },
                    visible: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                            delay: 0.5
                        }
                    }
                }}
            >
                Tableau de Bord Gasoil
            </motion.h4>
    
            <motion.p
                variants={{
                    hidden: { y: 30, opacity: 0 },
                    visible: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                            delay: 0.8
                        }
                    }
                }}
            >
                Chargement en cours...
            </motion.p>
        </motion.div>
    ) : (
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

</AnimatePresence>

{activeSection === 'forms' && (
                <motion.div key="forms-section" variants={pageVariants} initial="hidden" animate="visible" className="form-sections-container">
                    <Row className="g-4">
                        {/* Boutons d'actions */}
                        <Col lg={12}>
                            <Card className="p-4 shadow-lg card-glass">
                                <Card.Title>Actions Rapides</Card.Title>
                                <div className="d-grid gap-2">
                                    <Button variant="success" size="lg" onClick={handleShowAddTrucker}><FaPlus /> Ajouter une Machine</Button>
                                    <Button variant="warning" size="lg" onClick={handleShowAttribGasoil}><FaGasPump /> Attribuer du Gasoil</Button>
                                    <Button variant="info" size="lg" onClick={handleShowChrono}><FaClock /> Chrono Machine</Button>
                                    <Button variant="primary" size="lg" onClick={handleShowApprovisionnement}><FaWarehouse /> Approvisionner le Stock</Button>
                                    {/* <Button variant="success" size="lg" onClick={handleShowAddSeller}><FaPlus /> Ajouter Vendeur</Button> */}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </motion.div>
            )}

            {/* Modale pour "Ajouter une Machine" */}
            <Modal show={showAddTruckerModal} onHide={handleCloseAddTrucker} centered>
                <Modal.Header closeButton>
                    <Modal.Title><FaPlus /> Ajout de machine</Modal.Title>
                </Modal.Header>
                <motion.div key="addTruckerFormModal" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                    <Modal.Body>
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
                            <Button variant="secondary" onClick={handleCloseAddTrucker} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>

            {/* Modale pour "Attribuer du Gasoil" */}
            <Modal show={showAttribGasoilModal} onHide={handleCloseAttribGasoil} centered>
                <Modal.Header closeButton>
                    <Modal.Title><FaGasPump /> Attribution de Gasoil</Modal.Title>
                </Modal.Header>
                <motion.div key="attribGasoilFormModal" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                    <Modal.Body>
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
                            <Button variant="secondary" onClick={handleCloseAttribGasoil} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                        </Form>
                    </Modal.Body>
                </motion.div>
            </Modal>
            
            {/* Modale pour "Approvisionnement du Stock" */}
            <Modal show={showApprovisionnementModal} onHide={handleCloseApprovisionnement} centered>
                <Modal.Header closeButton>
                    <Modal.Title><FaWarehouse /> Approvisionnement du Stock</Modal.Title>
                </Modal.Header>
                <motion.div key="approFormModal" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                    <Modal.Body>
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
{/* Modale pour "Chrono Machine" */}
<AnimatePresence>
                {showChronoModal && (
                    <Modal show={showChronoModal} onHide={handleCloseChrono} centered>
                        <Modal.Header closeButton>
                            <Modal.Title><FaClock /> Chrono Machine</Modal.Title>
                        </Modal.Header>
                        <motion.div key="chronoFormModal" variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
                            <Modal.Body>
                                {/* Étape 1: Formulaire de départ */}
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

                                {/* Étape 2: Chrono en cours */}
                                {chronoRunning && (
                                    <Form>
                                        <div className="chrono-display-container">
                                            <div className="chrono-display">{chronoDisplay}</div>
                                            <p>Machine: **{selectedPlate}**</p>
                                            <p>Opérateur: **{operator}**</p>
                                        </div>
                                        <Button variant="danger" type="button" onClick={handleStopChrono} className="w-100"><FaStop /> Arrêter le Chrono</Button>
                                        <Button variant="secondary" onClick={handleCloseChrono} className="w-100 mt-2"><FaTimes /> Annuler</Button>
                                    </Form>
                                )}

                                {/* Étape 3: Saisie des données */}
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
                )}
            </AnimatePresence>
            <AnimatePresence>
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

                                <Card className="p-4 shadow-lg card-glass mt-4">
                                    <Card.Title>Historique des Soldes de Gasoil</Card.Title>
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
                                                    <th>Approvisionnement</th>
                                                    <th>Attribution</th>
                                                    <th>Solde</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan="4" className="text-center"><Spinner animation="border" /> Chargement...</td></tr>
                                                ) : (() => {
                                                    const dailyBalances = calculateDailyBalances(attributionsHistory, approvisionnements);
                                                    return dailyBalances.length > 0 ? (
                                                        dailyBalances.map((b, index) => (
                                                            <tr key={index}>
                                                                <td>{moment(b.date).format('DD/MM/YYYY')}</td>
                                                                <td>{formatNumber(b.approvisionnement)} L</td>
                                                                <td>{formatNumber(b.attribution)} L</td>
                                                                <td><strong>{formatNumber(b.solde)} L</strong></td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr><td colSpan="4" className="text-center">Aucun solde trouvé.</td></tr>
                                                    );
                                                })()}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-light fw-bold">
                                                    <td colSpan="3">Solde Final</td>
                                                    <td>
                                                        {(() => {
                                                            const dailyBalances = calculateDailyBalances(attributionsHistory, approvisionnements);
                                                            const lastBalance = dailyBalances[dailyBalances.length - 1];
                                                            return formatNumber(lastBalance ? lastBalance.solde : 0);
                                                        })()} L
                                                    </td>
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
      )
    );
}

export default GasoilDashboard;