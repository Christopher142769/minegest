import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Form, Card, Row, Col, Table, Spinner, Modal } from 'react-bootstrap';
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
    FaChartArea,
    FaChartBar,
    FaBoxes,
    FaCalendarAlt, // Ajout de l'icône calendrier
    FaBars, // Pour le toggle de la sidebar
    FaEdit, // Ajout de l'icône de modification
    FaTrashAlt, // Ajout de l'icône de suppression
    FaCopy, // Ajout de l'icône de copie
    FaDownload, // Ajout de l'icône de téléchargement
    FaSignOutAlt, // Ajout de l'icône de déconnexion
    FaBan, // Icône pour désactiver
    FaCheckCircle, // Icône pour activer
    FaTruck, // Icône pour les machines
} from 'react-icons/fa';
import Plot from 'react-plotly.js'; // 📥 Importation de Plotly.js
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area
} from 'recharts';
import * as XLSX from 'xlsx';
import moment from 'moment';
import axios from 'axios'; // 📥 Importation de axios

// =============================================================
//                   Animations Framer Motion Améliorées
// =============================================================
const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    in: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { 
            type: 'spring', 
            stiffness: 100, 
            damping: 15, 
            staggerChildren: 0.1,
            duration: 0.6
        } 
    },
    out: { 
        opacity: 0, 
        y: -20, 
        scale: 0.95,
        transition: { duration: 0.3 } 
    },
};

const itemVariants = {
    initial: { opacity: 0, y: 30, scale: 0.9 },
    in: { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        transition: { 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1],
            type: 'spring',
            stiffness: 100
        } 
    },
};

const cardVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    in: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { 
            duration: 0.6, 
            ease: [0.4, 0, 0.2, 1],
            type: 'spring',
            stiffness: 80
        } 
    },
    out: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.3 }
    }
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

// Fonction pour trier les données de la plus ancienne à la plus récente
const sortByDateAsc = (data) => {
    return [...data].sort((a, b) => {
        const dateA = new Date(a.date || a.timestamp || a.createdAt);
        const dateB = new Date(b.date || b.timestamp || b.createdAt);
        return dateA - dateB; // Plus ancien en premier
    });
};

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

    // Feuille Soldes journaliers
    const dailyBalances = calculateDailyBalances(sortedAttributions, sortedAppro);
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

    // Feuille Soldes journaliers pour la période
    const dailyBalances = calculateDailyBalances(filteredAttributions, filteredAppro);
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
    const exportMachineReportToExcel = (machinePlate, attributions, chrono, approvisionnements = []) => {
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

    // Feuille Soldes journaliers (calculé sur toutes les données car les approvisionnements sont globaux)
    const dailyBalances = calculateDailyBalances(attributions, approvisionnements);
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
    const isMountedRef = useRef(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [filterDate, setFilterDate] = useState(moment().format('YYYY-MM-DD'));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // ... (autres variables d'état)
const [showCredentialsModal, setShowCredentialsModal] = useState(false);
const [createdUsername, setCreatedUsername] = useState('');
const [createdPassword, setCreatedPassword] = useState('');
const [showEditSellerModal, setShowEditSellerModal] = useState(false);
const [editingSeller, setEditingSeller] = useState(null);
const [editSellerUsername, setEditSellerUsername] = useState('');
const [editSellerPassword, setEditSellerPassword] = useState('');
const [editSellerWhatsapp, setEditSellerWhatsapp] = useState('');
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
    const [selectedSellerForMachines, setSelectedSellerForMachines] = useState(null);
    const [sellerMachines, setSellerMachines] = useState([]);
    const [loadingMachines, setLoadingMachines] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
    const [exportEndDate, setExportEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [showExportPeriodModal, setShowExportPeriodModal] = useState(false);
    const [chartTypeConsumption, setChartTypeConsumption] = useState('bar');
    const [chartTypeSable, setChartTypeSable] = useState('bar');
    const [chartTypeDuration, setChartTypeDuration] = useState('bar');
    const [chartTypeTrips, setChartTypeTrips] = useState('bar');

    const API_URL = "https://mineback.onrender.com";
    
    // Nettoyage au démontage
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    useEffect(() => {
    if (token) {
        axios.defaults.baseURL = API_URL;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Petit délai pour s'assurer que le composant est complètement monté
            const initTimer = setTimeout(() => {
                if (isMountedRef.current) {
        fetchSellersHistory();
        fetchAll();
        fetchDeletionHistory();
                }
            }, 50);
            
            return () => {
                clearTimeout(initTimer);
            };
    } else {
        console.error("Token non trouvé. L'utilisateur doit se reconnecter.");
            if (isMountedRef.current) {
        setLoading(false);
            }
    }
}, [token]);
    useEffect(() => {
        if (selectedSeller) {
            if (isMountedRef.current) {
            fetchDataForSeller(selectedSeller.dbName);
            }
        } else {
            if (isMountedRef.current) {
            fetchAll();
            }
        }
    }, [selectedSeller]);
    
    useEffect(() => {
        if (isMountedRef.current) {
        fetchAll();
        }
    }, []);

    useEffect(() => {
        let timer;
        
        if (chronoRunning && isMountedRef.current) {
            timer = setInterval(() => {
                if (isMountedRef.current) {
                const diffMs = Date.now() - chronoStart;
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                const formattedTime = [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')].join(':');
                setChronoDisplay(formattedTime);
                }
            }, 1000);
        }
        
        return () => {
            if (timer) {
            clearInterval(timer);
        }
        };
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
        if (!isMountedRef.current) return;
        setLoading(true);
        try {
            const [resTruckers, resAppro, resHistory, resBilan] = await Promise.all([
                axios.get('/api/truckers'),
                axios.get('/api/approvisionnement'),
                axios.get('/api/attributions'),
                axios.get('/api/gasoil/bilan')
            ]);
            if (isMountedRef.current) {
            setTruckers(resTruckers.data || []);
            setApprovisionnements(resAppro.data || []);
            setHistoryData(resHistory.data || []);
            setBilanData(resBilan.data);
            }
        } catch (err) {
            if (isMountedRef.current) {
            toast.error("Erreur lors du chargement des données principales.");
            console.error(err);
            }
        } finally {
            if (isMountedRef.current) {
            setLoading(false);
            }
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
        if (!isMountedRef.current) return;
        try {
            const res = await axios.get(`/api/users`);
            if (res.status !== 200) {
                throw new Error('Erreur lors de la récupération des utilisateurs.');
            }
            if (isMountedRef.current) {
            const users = res.data;
            const sellers = users.filter(user => user.role === 'Vendeur');
            setSellersHistory(sellers);
            }
        } catch (err) {
            if (isMountedRef.current) {
            toast.error(err.message || 'Erreur lors du chargement de l\'historique.');
            }
        }
    };
    const fetchMachinesForSeller = async (dbName) => {
        if (!isMountedRef.current) return;
        if (!dbName) {
            setSellerMachines([]);
            return;
        }
        if (isMountedRef.current) {
            setLoadingMachines(true);
        }
        try {
            const res = await axios.get(`/api/admin/get-seller-data/${dbName}`);
            const data = res.data;
            if (data && isMountedRef.current) {
                setSellerMachines(data.truckers || []);
            }
        } catch (err) {
            if (isMountedRef.current) {
                toast.error("Erreur lors du chargement des machines du vendeur.");
                console.error(err);
                setSellerMachines([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoadingMachines(false);
            }
        }
    };

    // ... après les fonctions existantes
const fetchDeletionHistory = async () => {
    if (!isMountedRef.current) return;
    try {
        const res = await axios.get('/api/actions/deletions');
        if (isMountedRef.current) {
        setDeletionHistory(res.data);
        }
    } catch (err) {
        if (isMountedRef.current) {
        toast.error('Erreur lors du chargement de l\'historique des suppressions.');
        console.error(err);
        }
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

const handleEditSeller = (seller) => {
    setEditingSeller(seller);
    setEditSellerUsername(seller.username || '');
    setEditSellerPassword('');
    setEditSellerWhatsapp(seller.whatsappNumber || '');
    setShowEditSellerModal(true);
};

const handleSaveEditSeller = async (e) => {
    e.preventDefault();
    if (!editSellerUsername) {
        return toast.error('Le nom d\'utilisateur est requis.');
    }
    try {
        const updateData = { username: editSellerUsername };
        if (editSellerPassword) {
            updateData.password = editSellerPassword;
        }
        if (editSellerWhatsapp !== undefined) {
            updateData.whatsappNumber = editSellerWhatsapp;
        }
        
        const res = await axios.patch(`/api/users/${editingSeller._id}`, updateData);
        toast.success(res.data.message);
        setShowEditSellerModal(false);
        setEditingSeller(null);
        setEditSellerUsername('');
        setEditSellerPassword('');
        setEditSellerWhatsapp('');
        await fetchSellersHistory();
    } catch (err) {
        toast.error(err.response?.data?.message || 'Erreur lors de la modification du vendeur.');
        console.error(err);
    }
};

const handleToggleActiveSeller = async (seller) => {
    const action = seller.isActive === false ? 'activer' : 'désactiver';
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} le compte de ${seller.username} ?`)) {
        try {
            const res = await axios.patch(`/api/users/${seller._id}/toggle-active`);
            if (res.data && res.data.message) {
                toast.success(res.data.message, {
                    toastId: `toggle-${seller._id}`,
                    autoClose: 3000
                });
            }
            await fetchSellersHistory();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Erreur lors de la modification du statut du vendeur.';
            toast.error(errorMessage, {
                toastId: `toggle-error-${seller._id}`,
                autoClose: 3000
            });
            console.error(err);
        }
    }
};
    const fetchDataForSeller = async (dbName) => {
        if (!isMountedRef.current) return;
        if (!dbName) {
            if (isMountedRef.current) {
            toast.error("Nom de la base de données du vendeur manquant.");
            }
            return;
        }
        if (isMountedRef.current) {
        setLoading(true);
        }
        try {
            const res = await axios.get(`/api/admin/get-seller-data/${dbName}`);
            const data = res.data;
            if (data && isMountedRef.current) {
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
    
                if (isMountedRef.current) {
                setBilanData({
                    totalGasoilAttributed,
                    totalGasoilAppro,
                    remainingGasoil,
                });
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
            toast.error("Erreur lors du chargement des données du vendeur.");
            console.error(err);
            }
        } finally {
            if (isMountedRef.current) {
            setLoading(false);
            }
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
            const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'ajout du vendeur.';
            toast.error(errorMessage);
            console.error('Erreur lors de l\'ajout du vendeur:', err);
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
    // Protection contre le rendu avant le montage complet
    if (!isMountedRef.current) {
        return <div className="dashboard-wrapper" style={{ minHeight: '100vh' }} />;
    }

    return (
        <div className="dashboard-wrapper" key="dashboard-main">
            <ToastContainer 
                key="admin-toast-container"
                position="top-right" 
                autoClose={3000} 
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
                limit={5}
                enableMultiContainer={false}
            />

            {/* Sidebar Overlay pour mobile */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ opacity: 1 }}
                />
            )}

            {/* Sidebar Professionnelle */}
            <div
    className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
                style={{ transform: `translateX(${isSidebarOpen ? 0 : -260}px)`, transition: 'transform 0.3s ease' }}
>
    <div className="sidebar-header">
        <img src={logo} alt="Logo" className="sidebar-logo" />
                    <h4>MineGest</h4>
            <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
                &times;
            </button>
    </div>
    <ul className="sidebar-menu">
                    {[
                        { id: 'dashboard', icon: FaChartLine, label: 'Dashboard' },
                        { id: 'monthly-reports', icon: FaChartLine, label: 'Bilans mensuels' },
                        { id: 'forms', icon: FaPlus, label: 'Actions' },
                        { id: 'history', icon: FaHistory, label: 'Historique' },
                        { id: 'users', icon: FaUserShield, label: 'Utilisateurs' },
                        { id: 'machines', icon: FaTruck, label: 'Machines' },
                        { id: 'deletionHistory', icon: FaHistory, label: 'Historique des suppressions' },
                    ].map((item) => (
                        <li
                            key={item.id}
                            className={activeSection === item.id ? 'active' : ''}
                            onClick={() => { 
                                setActiveSection(item.id); 
                                if (item.id === 'deletionHistory') fetchDeletionHistory();
                                setIsSidebarOpen(false); 
                            }}
                        >
                            <item.icon />
                            <span>{item.label}</span>
        </li>
                    ))}
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
</div>

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
                <button 
                    className={`mobile-nav-item ${activeSection === 'machines' ? 'active' : ''}`}
                    onClick={() => setActiveSection('machines')}
                >
                    <FaTruck />
                    <span>Machines</span>
                </button>
                <button 
                    className="mobile-nav-item mobile-nav-logout"
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

            {/* Main Content */}
            <div className={`dashboard-main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* Header Professionnel */}
                <div className="dashboard-header-bar-light">
                    <Button 
                        variant="link" 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                        className="sidebar-toggle-btn desktop-only"
                    >
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
                </div>
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
                <div className="mb-4" style={{ padding: '0 1.5rem' }}>
                    <Row className="align-items-center">
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
                </div>
                <div className="kpi-grid-refined">
                    {/* Section des cartes pour la durée d'utilisation */}
                    <Card className="kpi-card-refined kpi-card-stock">
                            <div className="kpi-icon-bg"><FaWarehouse /></div>
                            <Card.Body>
                            <Card.Title>Stock Restant</Card.Title>
                            <h4 className="kpi-value">{selectedSeller ? (bilanData?.remainingGasoil !== undefined ? formatNumber(bilanData.remainingGasoil) : '...') : formatNumber(stockRestant)} L</h4>
                        </Card.Body>
                        </Card>
    {getDailyDurationData.length > 0 ? (
        getDailyDurationData.map((data, index) => (
                            <Card key={index} className="kpi-card-refined kpi-card-duration">
                    <div className="kpi-icon-bg"><FaClock /></div>
                    <Card.Body>
                        <Card.Title>Durée d'Utilisation</Card.Title>
                        <h5 className="kpi-subtitle">Machine: {data.name}</h5>
                        <h4 className="kpi-value">{Math.floor(data.durationHours)}h {Math.round((data.durationHours % 1) * 60)}m</h4>
                    </Card.Body>
                </Card>
        ))
    ) : (
                        <Card className="kpi-card-refined kpi-card-duration">
                <Card.Body>
                    <Card.Title>Durée d'Utilisation</Card.Title>
                    <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
                </Card.Body>
            </Card>
    )}
    
                    {/* Section des cartes pour l'attribution de gasoil */}
    {filteredAttributionsHistory.length > 0 ? (
        filteredAttributionsHistory.map((data, index) => (
                            <Card key={index} className="kpi-card-refined kpi-card-gasoil">
                    <div className="kpi-icon-bg"><FaGasPump /></div>
                    <Card.Body>
                        <Card.Title>Gasoil Attribué</Card.Title>
                        <h5 className="kpi-subtitle">Machine: {data.truckPlate}</h5>
                        <h4 className="kpi-value">{formatNumber(data.liters)} L</h4>
                    </Card.Body>
                </Card>
        ))
    ) : (
                        <Card className="kpi-card-refined kpi-card-gasoil">
                <Card.Body>
                    <Card.Title>Gasoil Attribué</Card.Title>
                    <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
                </Card.Body>
            </Card>
    )}
    
                    {/* Section pour les cartes du volume de sable */}
    {filteredChronoHistory.length > 0 ? (
    filteredChronoHistory.map((data, index) => (
                            <Card key={index} className="kpi-card-refined kpi-card-sable">
                <div className="kpi-icon-bg"><FaBoxes /></div>
                <Card.Body>
                    <Card.Title>Total Sable</Card.Title>
                    <h5 className="kpi-subtitle">Machine: {data.truckPlate}</h5>
                    <h4 className="kpi-value">{formatNumber(data.volumeSable)} m³</h4>
                </Card.Body>
            </Card>
    ))
) : (
                        <Card className="kpi-card-refined kpi-card-sable">
            <Card.Body>
                <Card.Title>Total Sable</Card.Title>
                <h5 className="kpi-subtitle">Aucune donnée pour la date sélectionnée.</h5>
            </Card.Body>
        </Card>
                    )}
                </div>
                </>
                )}
                {/* Main Content Area with conditional rendering */}
                <div className="dashboard-content-area">
                    {activeSection === 'dashboard' && (
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
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <Card.Title className="mb-0">Volume de Sable Journalier (m³)</Card.Title>
                                        <div className="btn-group" role="group">
                                            <Button
                                                variant={chartTypeSable === 'bar' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeSable('bar')}
                                            >
                                                <FaChartBar />
                                            </Button>
                                            <Button
                                                variant={chartTypeSable === 'line' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeSable('line')}
                                            >
                                                <FaChartLine />
                                            </Button>
                                            <Button
                                                variant={chartTypeSable === 'area' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeSable('area')}
                                            >
                                                <FaChartArea />
                                            </Button>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        {chartTypeSable === 'bar' ? (
                                            <BarChart data={getDailySableData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Bar dataKey="volumeSable" fill="#ec4899" radius={[8, 8, 0, 0]}>
                                                    {getDailySableData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={getColorsForMachines([entry])[0]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : chartTypeSable === 'line' ? (
                                            <LineChart data={getDailySableData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="volumeSable" 
                                                    stroke="#ec4899" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#ec4899', r: 5 }}
                                                    activeDot={{ r: 7 }}
                                                />
                                            </LineChart>
                                        ) : (
                                            <AreaChart data={getDailySableData}>
                                                <defs>
                                                    <linearGradient id="colorSable" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="volumeSable" 
                                                    stroke="#ec4899" 
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorSable)"
                                                />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xs={12} lg={6}>
                            <Card className="dashboard-chart-card">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <Card.Title className="mb-0">Durée d'Utilisation Journalière (heures)</Card.Title>
                                        <div className="btn-group" role="group">
                                            <Button
                                                variant={chartTypeDuration === 'bar' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeDuration('bar')}
                                            >
                                                <FaChartBar />
                                            </Button>
                                            <Button
                                                variant={chartTypeDuration === 'line' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeDuration('line')}
                                            >
                                                <FaChartLine />
                                            </Button>
                                            <Button
                                                variant={chartTypeDuration === 'area' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeDuration('area')}
                                            >
                                                <FaChartArea />
                                            </Button>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        {chartTypeDuration === 'bar' ? (
                                            <BarChart data={getDailyDurationData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Bar dataKey="durationHours" fill="#6366f1" radius={[8, 8, 0, 0]}>
                                                    {getDailyDurationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={getColorsForMachines([entry])[0]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : chartTypeDuration === 'line' ? (
                                            <LineChart data={getDailyDurationData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="durationHours" 
                                                    stroke="#6366f1" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#6366f1', r: 5 }}
                                                    activeDot={{ r: 7 }}
                                                />
                                            </LineChart>
                                        ) : (
                                            <AreaChart data={getDailyDurationData}>
                                                <defs>
                                                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="durationHours" 
                                                    stroke="#6366f1" 
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorDuration)"
                                                />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xs={12} lg={6}>
                            <Card className="dashboard-chart-card">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <Card.Title className="mb-0">Nombre de Voyages Journaliers</Card.Title>
                                        <div className="btn-group" role="group">
                                            <Button
                                                variant={chartTypeTrips === 'bar' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeTrips('bar')}
                                            >
                                                <FaChartBar />
                                            </Button>
                                            <Button
                                                variant={chartTypeTrips === 'line' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeTrips('line')}
                                            >
                                                <FaChartLine />
                                            </Button>
                                            <Button
                                                variant={chartTypeTrips === 'area' ? 'primary' : 'outline-secondary'}
                                                size="sm"
                                                onClick={() => setChartTypeTrips('area')}
                                            >
                                                <FaChartArea />
                                            </Button>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        {chartTypeTrips === 'bar' ? (
                                            <BarChart data={getDailyTripsData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Bar dataKey="trips" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                                                    {getDailyTripsData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={getColorsForMachines([entry])[0]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : chartTypeTrips === 'line' ? (
                                            <LineChart data={getDailyTripsData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="trips" 
                                                    stroke="#f59e0b" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#f59e0b', r: 5 }}
                                                    activeDot={{ r: 7 }}
                                                />
                                            </LineChart>
                                        ) : (
                                            <AreaChart data={getDailyTripsData}>
                                                <defs>
                                                    <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                                <YAxis stroke="#6b7280" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                    }} 
                                                    itemStyle={{ color: '#374151' }} 
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="trips" 
                                                    stroke="#f59e0b" 
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorTrips)"
                                                />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                        )}
                        {activeSection === 'forms' && (
                            <div className="form-sections-container">
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
                            </div>
                        )}
{activeSection === 'history' && (
                            <div>
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
                                            exportMachineReportToExcel(e.target.value, attributionsHistory, chronoHistory, filteredAppro);
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
                            <span>Historique des Soldes de Gasoil</span>
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
                        <div className="table-responsive-refined">
                            <Table striped bordered hover variant="light" className="mt-3 mobile-table">
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
                                        <tr><td colSpan="4" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>
                                    ) : (() => {
                                        const dailyBalances = calculateDailyBalances(attributionsHistory, approvisionnements);
                                        return dailyBalances.length > 0 ? (
                                            dailyBalances.map((b, index) => (
                                                <tr 
                                                    key={index}
                                                    style={{ 
                                                        transition: 'background-color 0.2s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                                >
                                                    <td data-label="Date">{moment(b.date).format('DD/MM/YYYY')}</td>
                                                    <td data-label="Approvisionnement">{formatNumber(b.approvisionnement)} L</td>
                                                    <td data-label="Attribution">{formatNumber(b.attribution)} L</td>
                                                    <td data-label="Solde"><strong style={{ color: b.solde >= 0 ? '#10b981' : '#ef4444' }}>{formatNumber(b.solde)} L</strong></td>
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
                                                const soldeFinal = lastBalance ? lastBalance.solde : 0;
                                                return <strong style={{ color: soldeFinal >= 0 ? '#10b981' : '#ef4444', fontSize: '1.2rem' }}>{formatNumber(soldeFinal)} L</strong>;
                                            })()}
                                        </td>
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
                            </div>
        )}

        {activeSection === 'machines' && (
            <div>
                <Card className="p-4 shadow-lg dashboard-chart-card">
                    <Card.Title className="text-dark">Gestion des Machines</Card.Title>
                    <Form.Group className="mb-4">
                        <Form.Label>Sélectionner un vendeur</Form.Label>
                        <Form.Select
                            value={selectedSellerForMachines?._id || ''}
                            onChange={(e) => {
                                const sellerId = e.target.value;
                                if (sellerId) {
                                    const seller = sellersHistory.find(s => s._id === sellerId);
                                    if (seller) {
                                        setSelectedSellerForMachines(seller);
                                        fetchMachinesForSeller(seller.dbName);
                                    }
                                } else {
                                    setSelectedSellerForMachines(null);
                                    setSellerMachines([]);
                                }
                            }}
                        >
                            <option value="">-- Choisir un vendeur --</option>
                            {sellersHistory.map((seller) => (
                                <option key={seller._id} value={seller._id}>
                                    {seller.username}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {selectedSellerForMachines && (
                        <div className="table-responsive-refined">
                            <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Plaque</th>
                                        <th>Type</th>
                                        <th>Solde (L)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingMachines ? (
                                        <tr>
                                            <td colSpan="4" className="text-center">
                                                <Spinner animation="border" variant="primary" /> Chargement...
                                            </td>
                                        </tr>
                                    ) : sellerMachines.length > 0 ? (
                                        sellerMachines.map((machine) => (
                                            <tr key={machine._id}>
                                                <td data-label="Nom">{machine.name || '-'}</td>
                                                <td data-label="Plaque">{machine.truckPlate || '-'}</td>
                                                <td data-label="Type">{machine.truckType || '-'}</td>
                                                <td data-label="Solde (L)">{formatNumber(machine.balance) || '0'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center">
                                                Aucune machine trouvée pour ce vendeur.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {!selectedSellerForMachines && (
                        <div className="text-center text-muted mt-4">
                            <p>Veuillez sélectionner un vendeur pour voir ses machines.</p>
                        </div>
                    )}
                </Card>
            </div>
        )}

        {activeSection === 'users' && (
                            <div>
                <Card className="p-4 shadow-lg dashboard-chart-card">
                    <Card.Title className="text-dark">Gestion des Utilisateurs (Vendeurs)</Card.Title>
                    <div className="table-responsive-refined">
                        <Table striped bordered hover variant="light" className="mt-3 mobile-table">
                            <thead>
                                <tr>
                                    <th>Date d'ajout</th>
                                    <th>Nom d'utilisateur</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="4" className="text-center"><Spinner animation="border" variant="primary" /> Chargement...</td></tr>) : sellersHistory.length > 0 ? (
                                    sortByDateDesc(sellersHistory).map((user, index) => (
                                        <tr key={index}>
                                            <td data-label="Date d'ajout">{moment(user.createdAt).format('DD/MM/YYYY')}</td>
                                            <td data-label="Nom d'utilisateur">{user.username}</td>
                                            <td data-label="Statut">
                                                <span className={`badge ${user.isActive !== false ? 'bg-success' : 'bg-danger'}`}>
                                                    {user.isActive !== false ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="d-flex gap-2 flex-wrap">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleEditSeller(user)}
                                                        title="Modifier le vendeur"
                                                        className="me-1"
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        variant={user.isActive !== false ? "warning" : "success"}
                                                        size="sm"
                                                        onClick={() => handleToggleActiveSeller(user)}
                                                        title={user.isActive !== false ? "Désactiver le compte" : "Activer le compte"}
                                                        className="me-1"
                                                    >
                                                        {user.isActive !== false ? <FaBan /> : <FaCheckCircle />}
                                                    </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteSeller(user._id)}
                                                    title="Supprimer le vendeur"
                                                >
                                                    <FaTrashAlt />
                                                </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (<tr><td colSpan="4" className="text-center">Aucun utilisateur ajouté.</td></tr>)}
                            </tbody>
                        </Table>
                    </div>
                </Card>
                            </div>
                        )}
        {activeSection === 'deletionHistory' && (
                            <div>
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
                                                            </td>
                                                        </tr>
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
                            </div>
        )}
{activeSection === 'monthly-reports' && (
                            <div>
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
                            </div>
)}
                </div>
            </div>

            {/* Modals remain the same but styled by the new CSS */}
            {/* Modal pour "Ajouter une Machine" */}
            <Modal show={showAddTruckerModal} onHide={handleCloseAddTrucker} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Ajout de machine</Modal.Title>
                </Modal.Header>
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
            </Modal>
            
            {/* Modal pour "Attribuer du Gasoil" */}
            <Modal show={showAttribGasoilModal} onHide={handleCloseAttribGasoil} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Attribution de Gasoil</Modal.Title>
                </Modal.Header>
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
            </Modal>
            
            {/* Modal pour "Approvisionnement du Stock" */}
            <Modal show={showApprovisionnementModal} onHide={handleCloseApprovisionnement} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Approvisionnement du Stock</Modal.Title>
                </Modal.Header>
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
            </Modal>
            
            {/* Modal pour "Chrono Machine" */}
            <Modal show={showChronoModal} onHide={handleCloseChrono} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Chrono Machine</Modal.Title>
                </Modal.Header>
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
            </Modal>
            
            {/* Modal pour "Ajouter Vendeur" */}
            <Modal show={showAddSellerModal} onHide={handleCloseAddSeller} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Ajouter un nouveau Vendeur</Modal.Title>
                </Modal.Header>
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
</Modal>

            {/* Modal pour "Modifier Vendeur" */}
            <Modal show={showEditSellerModal} onHide={() => {
                setShowEditSellerModal(false);
                setEditingSeller(null);
                setEditSellerUsername('');
                setEditSellerPassword('');
                setEditSellerWhatsapp('');
            }} centered className="modal-light-theme">
                <Modal.Header closeButton className="modal-header-light">
                    <Modal.Title>Modifier le Vendeur</Modal.Title>
                </Modal.Header>
                <Modal.Body className="modal-body-light">
                    <Form onSubmit={handleSaveEditSeller}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nom d'utilisateur</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={editSellerUsername} 
                                onChange={(e) => setEditSellerUsername(e.target.value)} 
                                placeholder="Nom du vendeur" 
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Nouveau mot de passe (laisser vide pour ne pas modifier)</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={editSellerPassword} 
                                onChange={(e) => setEditSellerPassword(e.target.value)} 
                                placeholder="Nouveau mot de passe" 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Numéro WhatsApp (optionnel)</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={editSellerWhatsapp} 
                                onChange={(e) => setEditSellerWhatsapp(e.target.value)} 
                                placeholder="Numéro WhatsApp" 
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-between mt-3">
                            <Button variant="success" type="submit" className="flex-grow-1 me-2">
                                <FaCheck /> Enregistrer les modifications
                            </Button>
                            <Button 
                                variant="danger" 
                                onClick={() => {
                                    setShowEditSellerModal(false);
                                    setEditingSeller(null);
                                    setEditSellerUsername('');
                                    setEditSellerPassword('');
                                    setEditSellerWhatsapp('');
                                }} 
                                className="flex-grow-1"
                            >
                                <FaTimes /> Annuler
                            </Button>
                            </div>
                        </Form>
                    </Modal.Body>
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