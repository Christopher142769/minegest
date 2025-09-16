require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const { log } = require('console');

const JWT_SECRET = process.env.JWT_SECRET || 'VOTRE_SECRET_JWT';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ===================== CONNEXIONS À LA BASE DE DONNÉES =====================
const dbConnections = {};

async function getUserDbConnection(dbName) {
    if (!dbName) {
        throw new Error('Database name is required.');
    }
    
    if (dbConnections[dbName]) {
        return dbConnections[dbName];
    }
    
    // Création d'une URL de base de données correcte et robuste
    const parsedUri = new URL(process.env.MONGO_URI);
    parsedUri.pathname = `/${dbName}`;
    const userDbUri = parsedUri.toString();

    console.log(`Tentative de connexion à la base de données: ${userDbUri}`);

    dbConnections[dbName] = mongoose.createConnection(userDbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    dbConnections[dbName].on('connected', () => console.log(`✅ MongoDB ${dbName} connecté`));
    dbConnections[dbName].on('error', err => console.error(`❌ Erreur MongoDB ${dbName}:`, err));

    return dbConnections[dbName];
}

// Assurez-vous d'utiliser le bon nom de base de données pour l'admin
// Il est crucial que cela soit 'truckers' et non 'truckers_main' comme dans votre code, car votre admin est initialisé avec dbName: 'truckers'
const defaultDbConnection = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Utilisez la même logique de connexion pour la base de données principale de l'admin
const mainDbConnection = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Remplacez la fonction existante par celle-ci
const authenticateTokenAndConnect = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
}

  jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
          return res.status(403).send('Token invalide.');
      }

      req.user = user;

      try {
          // Utiliser le nom de la base de données directement depuis le token
          if (req.user.dbName) {
              req.dbConnection = await getUserDbConnection(req.user.dbName);
          } else {
              req.dbConnection = mainDbConnection;
          }

          if (!req.dbConnection) {
              console.error("Erreur de connexion à la base de données pour l'utilisateur :", req.user.username);
              return res.status(500).send("Erreur de connexion à la base de données.");
          }

          next();
      } catch (err) {
          console.error('Erreur de connexion à la base de données :', err);
          return res.status(500).send('Erreur interne du serveur.');
      }
  });
};

// ===================== SCHÉMAS =====================
const CreditSchema = new mongoose.Schema({
    amount: Number,
    date: { type: Date, default: Date.now }
});

const GasoilSchema = new mongoose.Schema({
    liters: Number,
    date: { type: Date, default: Date.now },
    machineType: { type: String, enum: ['6 roues', '10 roues', '12 roues', 'Tracteur', 'Chargeuse', 'Autre'], default: '6 roues' },
    startTime: String,
    endTime: String,
    duration: String,
    operator: String,
    activity: String,
    chauffeurName: String,
    gasoilConsumed: Number,
    volumeSable: Number,
    startKmPhotoPath: String,
    endKmPhotoPath: String,
});

const MaintenanceSchema = new mongoose.Schema({
    itemName: String,
    unitPrice: Number,
    quantity: Number,
    totalPrice: Number,
    date: { type: Date, default: Date.now }
});

const ApproSchema = new mongoose.Schema({
    date: Date,
    fournisseur: String,
    quantite: Number,
    prixUnitaire: Number,
    montantTotal: Number,
    receptionniste: String
});

const TruckerSchema = new mongoose.Schema({
    name: String,
    truckPlate: String,
    truckType: { type: String, enum: ['6 roues', '10 roues', '12 roues'] },
    balance: { type: Number, default: 0 },
    credits: [CreditSchema],
    gasoils: [GasoilSchema],
});

const InvoiceSchema = new mongoose.Schema({
    name: String,
    truckPlate: String,
    truckType: String,
    unitPrice: Number,
    trips: Number,
    totalAmount: Number,
    balance: Number,
    status: Number,
    date: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Gestionnaire', 'Vendeur', 'Admin'], required: true },
    dbName: { type: String, required: false },
    whatsappNumber: { type: String, required: false },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    createdAt: { type: Date, default: Date.now }
});

const ActionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    action: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

// ===================== FONCTION UTILITAIRE POUR LES MODÈLES =====================
function getModel(dbConnection, modelName, schema) {
    if (dbConnection.models[modelName]) {
        return dbConnection.models[modelName];
    }
    return dbConnection.model(modelName, schema);
}

const User = mainDbConnection.model('User', UserSchema);
const Action = mainDbConnection.model('Action', ActionSchema);

async function sendWhatsAppPhoto(to, imageUrl) {
    log(`Fonctionnalité d'envoi WhatsApp en cours d'implémentation. Photo pour ${to}: ${imageUrl}`);
}

// ===================== ROUTES D'AUTHENTIFICATION =====================
app.get('/api/admin/init', async (req, res) => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                password: 'password123',
                role: 'Admin',
                dbName: 'truckers',
            });
            await adminUser.save();
            res.status(201).send('Admin user created!');
        } else {
            res.status(200).send('Admin user already exists.');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, whatsappNumber } = req.body;
        const newUser = new User({ username, password, role: 'Gestionnaire', whatsappNumber });
        const dbName = `truckers_${newUser._id.toString()}`;
        newUser.dbName = dbName;
        await newUser.save();
        const dbConnection = await getUserDbConnection(dbName);
        const Trucker = getModel(dbConnection, 'Trucker', TruckerSchema);
        const Maintenance = getModel(dbConnection, 'Maintenance', MaintenanceSchema);
        const Approvisionnement = getModel(dbConnection, 'Approvisionnement', ApproSchema);
        const Invoice = getModel(dbConnection, 'Invoice', InvoiceSchema);
        await Trucker.createCollection();
        await Maintenance.createCollection();
        await Approvisionnement.createCollection();
        await Invoice.createCollection();
        res.status(201).json({ message: 'Inscription réussie et base de données créée.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Ajout du dbName de l'utilisateur dans le token JWT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        const token = jwt.sign({ 
            id: user._id, 
            username: user.username, 
            role: user.role, 
            dbName: user.dbName // IMPORTANT: Ajout du nom de la base de données
        }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Connexion réussie', token, user: { id: user._id, username: user.username, role: user.role, dbName: user.dbName } });
    } else {
        res.status(401).send('Nom d\'utilisateur ou mot de passe invalide.');
    }
});

// ===================== ROUTES POUR LE TABLEAU DE BORD (protégées) =====================
const isGestionnaireOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Gestionnaire')) {
        next();
    } else {
        res.status(403).send('Accès refusé.');
    }
};

// NOUVEAU MIDDLEWARE: pour vérifier le rôle d'administrateur
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).send('Accès refusé. Rôle administrateur requis.');
    }
};

app.use(authenticateTokenAndConnect);

// MODIFICATION: Route pour qu'un gestionnaire ajoute un vendeur
// Cette route est maintenant réservée aux 'Gestionnaire' et aux 'Admin'
app.post('/api/users', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const { username, password } = req.body;
        // Créer l'utilisateur dans la DB principale
        const newUser = new User({ username, password, role: 'Vendeur', managerId: req.user.id });
        const dbName = `vendeur_${newUser._id.toString()}`;
        newUser.dbName = dbName;
        await newUser.save();

        // Création de la base de données pour le vendeur
        const dbConnection = await getUserDbConnection(dbName);
        const Trucker = getModel(dbConnection, 'Trucker', TruckerSchema);
        const Maintenance = getModel(dbConnection, 'Maintenance', MaintenanceSchema);
        const Approvisionnement = getModel(dbConnection, 'Approvisionnement', ApproSchema);
        const Invoice = getModel(dbConnection, 'Invoice', InvoiceSchema);
        await Trucker.createCollection();
        await Maintenance.createCollection();
        await Approvisionnement.createCollection();
        await Invoice.createCollection();
        
        res.status(201).json({ message: 'Vendeur ajouté et base de données créée.', user: newUser });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Récupération des utilisateurs en fonction du rôle
app.get('/api/users', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const query = {};
        if (req.user.username === 'admin') {
            // L'admin voit TOUS les utilisateurs
        } else if (req.user.role === 'Gestionnaire') {
            // Un gestionnaire ne voit que les vendeurs qu'il a créés
            query.managerId = req.user.id;
        }
        const users = await User.find(query, 'username role createdAt managerId dbName');
        res.json(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// NOUVEAU: Route pour l'admin pour obtenir les données d'un vendeur spécifique
// =============================================================
//      Route pour récupérer toutes les données d'un vendeur (pour l'admin)
// =============================================================
// =============================================================
//      Route pour récupérer toutes les données d'un vendeur (pour l'admin)
// =============================================================
app.get('/api/admin/get-seller-data/:dbName', isGestionnaireOrAdmin, async (req, res) => {
    const { dbName } = req.params;
    
    try {
        const userDbConnection = await getUserDbConnection(dbName);

        const Trucker = userDbConnection.model('Trucker', TruckerSchema);
        const Approvisionnement = userDbConnection.model('Approvisionnement', ApprovisionnementSchema);

        const truckers = await Trucker.find();
        const approvisionnements = await Approvisionnement.find();
        
        // Agréger l'historique des attributions à partir de la collection des camions
        const history = truckers.flatMap(trucker =>
            trucker.gasoils.map(gasoil => ({
                _id: gasoil._id,
                truckPlate: trucker.truckPlate,
                liters: gasoil.liters,
                date: gasoil.date,
                operator: gasoil.operator,
                name: gasoil.name,
                activity: gasoil.activity
            }))
        );

        res.json({
            truckers,
            approvisionnements,
            history
        });

    } catch (err) {
        console.error('Erreur lors de la récupération des données du vendeur:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des données du vendeur.' });
    }
});
// MODIFICATION: Un gestionnaire ne voit que ses propres attributions
app.get('/api/attributions', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const truckers = await Trucker.find({});
        const history = truckers.flatMap(trucker =>
            trucker.gasoils.map(gasoil => ({
                ...gasoil.toObject(),
                truckPlate: trucker.truckPlate,
            }))
        );
        res.json(history);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Un gestionnaire ne voit que ses propres camions
app.get('/api/truckers', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const { plate } = req.query;
        const list = plate ? await Trucker.find({ truckPlate: plate }) : await Trucker.find();
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/truckers', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const { name, truckPlate, truckType, balance = 0 } = req.body;

        const trucker = new Trucker({ name, truckPlate, truckType, balance });
        await trucker.save();

        let qrDataURL = null;
        try {
            const qrPayload = JSON.stringify({ id: trucker._id.toString(), name, truckPlate, truckType, balance });
            qrDataURL = await QRCode.toDataURL(qrPayload);
        } catch (qrErr) {
            console.error('Erreur lors de la génération du QR code :', qrErr);
        }
        res.status(201).json({ trucker, qr: qrDataURL });
    } catch (err) {
        console.error('Erreur lors de l\'ajout d\'un camion :', err.message);
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Bilan pour un gestionnaire
app.get('/api/gasoil/bilan', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const Approvisionnement = getModel(req.dbConnection, 'Approvisionnement', ApproSchema);

        const totalApprovisionnement = await Approvisionnement.aggregate([
            { $group: { _id: null, total: { $sum: '$quantite' } } }
        ]);

        const totalAttribution = await Trucker.aggregate([
            { $unwind: '$gasoils' },
            { $group: { _id: null, total: { $sum: '$gasoils.liters' } } }
        ]);

        const totalAppro = totalApprovisionnement.length > 0 ? totalApprovisionnement[0].total : 0;
        const totalAttributed = totalAttribution.length > 0 ? totalAttribution[0].total : 0;
        const stockRestant = totalAppro - totalAttributed;

        res.json({
            totalAppro,
            totalAttributed,
            stockRestant,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Approvisionnement pour un gestionnaire
app.get('/api/approvisionnement', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Approvisionnement = getModel(req.dbConnection, 'Approvisionnement', ApproSchema);
        const list = await Approvisionnement.find().sort({ date: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/approvisionnement', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Approvisionnement = getModel(req.dbConnection, 'Approvisionnement', ApproSchema);
        const { date, fournisseur, quantite, prixUnitaire, receptionniste } = req.body;
        const montantTotal = quantite * prixUnitaire;
        const record = new Approvisionnement({ date, fournisseur, quantite, prixUnitaire, montantTotal, receptionniste });
        await record.save();
        res.status(201).json(record);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MODIFICATION: Maintenance pour un gestionnaire
app.get('/api/maintenance', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Maintenance = getModel(req.dbConnection, 'Maintenance', MaintenanceSchema);
        const list = await Maintenance.find().sort({ date: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/maintenance/bilan', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Maintenance = getModel(req.dbConnection, 'Maintenance', MaintenanceSchema);
        const grouped = await Maintenance.aggregate([
            { $group: { _id: '$itemName', totalQuantity: { $sum: '$quantity' }, totalAmount: { $sum: '$totalPrice' } } },
            { $project: { _id: 0, itemName: '$_id', totalQuantity: 1, totalAmount: 1 } },
            { $sort: { itemName: 1 } }
        ]);
        const totalGlobalAmount = grouped.reduce((acc, curr) => acc + curr.totalAmount, 0);
        res.json({ bilan: grouped, totalGlobalAmount });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ===================== AUTRES ROUTES =====================
// MODIFICATION: Routes pour les données d'un gestionnaire
app.get('/api/truckers/:id/credit', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const { amount } = req.body;
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) return res.status(404).send('Not found');
        trucker.credits.push({ amount });
        trucker.balance += amount;
        await trucker.save();
        res.json(trucker);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/manager-info', authenticateTokenAndConnect, async (req, res) => {
    try {
        const User = mainDbConnection.model('User', UserSchema);
        if (!req.user.managerId) {
            return res.status(404).json({ message: 'Gestionnaire non trouvé pour cet utilisateur.' });
        }
        const manager = await User.findById(req.user.managerId, 'username whatsappNumber');

        if (!manager) {
            return res.status(404).json({ message: 'Informations du gestionnaire introuvables.' });
        }
        res.json({ whatsappNumber: manager.whatsappNumber });
    } catch (err) {
        console.error('Erreur lors de la récupération des informations du gestionnaire :', err);
        res.status(500).send(err.message);
    }
});

app.get('/api/truckers/:id', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) return res.status(404).send('Not found');
        res.json(trucker);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/truckers/:id/credits', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) return res.status(404).send('Not found');
        res.json(trucker.credits);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/gasoil/attribution-chrono', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const { truckPlate, liters, machineType, startTime, endTime, duration, operator, activity, chauffeurName, gasoilConsumed, volumeSable, startKmPhoto, endKmPhoto } = req.body;
        const trucker = await Trucker.findOne({ truckPlate });
        if (!trucker) return res.status(404).send('Camionneur non trouvé');

        const now = new Date();
        const folderName = `${truckPlate}_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const folderPath = path.join(uploadDir, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        let startKmPhotoPath = null;
        if (startKmPhoto) {
            const base64Data = startKmPhoto.replace(/^data:image\/(png|jpeg);base64,/, '');
            const filename = `${truckPlate}_start_km_${now.getTime()}.png`;
            const filePath = path.join(folderPath, filename);
            fs.writeFileSync(filePath, base64Data, 'base64');
            startKmPhotoPath = filePath;
        }
        let endKmPhotoPath = null;
        if (endKmPhoto) {
            const base64Data = endKmPhoto.replace(/^data:image\/(png|jpeg);base64,/, '');
            const filename = `${truckPlate}_end_km_${now.getTime()}.png`;
            const filePath = path.join(folderPath, filename);
            fs.writeFileSync(filePath, base64Data, 'base64');
            endKmPhotoPath = filePath;
        }

        trucker.gasoils.push({ liters, date: new Date(), machineType, startTime, endTime, duration, operator, activity, chauffeurName, gasoilConsumed, volumeSable, startKmPhotoPath, endKmPhotoPath });
        await trucker.save();
        res.json(trucker);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/truckers/:id/gasoil', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const { liters, date, machineType, operator, chauffeurName, activity } = req.body;
        if (!liters || liters <= 0) {
            return res.status(400).json({ message: 'La quantité de gasoil doit être supérieure à 0.' });
        }
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) {
            return res.status(404).json({ message: 'Machine non trouvée.' });
        }
        trucker.gasoils.push({ liters: Number(liters), date, machineType, operator, activity, chauffeurName });
        await trucker.save();
        res.status(200).json({ message: 'Gasoil attribué avec succès.' });
    } catch (err) {
        console.error('Erreur lors de l\'attribution de gasoil :', err);
        res.status(500).json({ message: 'Erreur serveur interne lors de l\'attribution.' });
    }
});

app.get('/api/credits/bilan', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const total = (await Trucker.find()).reduce((acc, t) => acc + t.credits.reduce((sum, c) => sum + c.amount, 0), 0);
        res.json({ total });
    } catch (err) {
        res.status(500).send('Erreur serveur: ' + err.message);
    }
});

app.get('/api/bilan-complet', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const Approvisionnement = getModel(req.dbConnection, 'Approvisionnement', ApproSchema);
        const Maintenance = getModel(req.dbConnection, 'Maintenance', MaintenanceSchema);
        const truckers = await Trucker.find();
        const soldeInitial = truckers.reduce((sum, t) => sum + (t.balance || 0), 0);
        const approvisionnements = await Approvisionnement.find();
        const depenseGasoil = approvisionnements.reduce((acc, a) => acc + (a.montantTotal || 0), 0);
        const maintenanceData = await Maintenance.aggregate([
            { $group: { _id: '$itemName', totalQuantity: { $sum: '$quantity' }, totalAmount: { $sum: '$totalPrice' } } },
            { $project: { _id: 0, itemName: '$_id', totalQuantity: 1, totalAmount: 1 } }
        ]);
        const depenseMaintenance = maintenanceData.reduce((acc, m) => acc + (m.totalAmount || 0), 0);
        let soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;
        if (soldeActuel < 0) soldeActuel = 0;
        res.json({
            soldeInitial,
            depenseGasoil,
            depenseMaintenance,
            soldeActuel,
            detailsGasoil: approvisionnements,
            detailsMaintenance: maintenanceData
        });
    } catch (err) {
        res.status(500).send('Erreur serveur: ' + err.message);
    }
});

app.delete('/api/approvisionnement/:id', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Approvisionnement = getModel(req.dbConnection, 'Approvisionnement', ApproSchema);
        const deletedRecord = await Approvisionnement.findByIdAndDelete(req.params.id);
        if (!deletedRecord) {
            return res.status(404).json({ message: 'Approvisionnement non trouvé.' });
        }
        res.json({ message: 'Approvisionnement supprimé avec succès.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/maintenance', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Maintenance = getModel(req.dbConnection, 'Maintenance', MaintenanceSchema);
        const { itemName, unitPrice, quantity } = req.body;
        const totalPrice = unitPrice * quantity;
        const achat = new Maintenance({ itemName, unitPrice, quantity, totalPrice });
        await achat.save();
        res.status(201).json(achat);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/api/attribution-gasoil/:id', isGestionnaireOrAdmin, async (req, res) => {
    try {
        const Trucker = getModel(req.dbConnection, 'Trucker', TruckerSchema);
        const updatedTrucker = await Trucker.findOneAndUpdate(
            { 'gasoils._id': req.params.id },
            { $pull: { gasoils: { _id: req.params.id } } },
            { new: true }
        );
        if (!updatedTrucker) {
            return res.status(404).json({ message: 'Attribution de gasoil non trouvée.' });
        }
        res.json({ message: 'Attribution de gasoil supprimée avec succès.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
defaultDbConnection.on('connected', () => console.log('✅ MongoDB defaultDb (truckers) connecté'));
defaultDbConnection.on('error', err => console.error('❌ Erreur MongoDB defaultDb (truckers):', err));
mainDbConnection.on('connected', () => console.log('✅ MongoDB mainDb (truckers_main) connecté'));
mainDbConnection.on('error', err => console.error('❌ Erreur MongoDB mainDb (truckers_main):', err));