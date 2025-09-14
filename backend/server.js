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

// IMPORTANT : Assurez-vous d'installer ces modules: npm install jsonwebtoken
// Remplacez 'VOTRE_SECRET_JWT' par une chaîne de caractères complexe
const JWT_SECRET = process.env.JWT_SECRET || 'VOTRE_SECRET_JWT';
// Configuration Twilio (décommenter si vous l'avez configuré)
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioClient = require('twilio')(accountSid, authToken);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ===================== CONNEXIONS À LA BASE DE DONNÉES =====================
// Connexion pour l'ancienne base de données 'truckers'
const defaultDbConnection = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Connexion pour la base de données principale 'truckers_main' (pour les utilisateurs)
const mainDbUri = process.env.MONGO_URI.replace('truckers', 'truckers_main');
const mainDbConnection = mongoose.createConnection(mainDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const dbConnections = {};

async function getUserDbConnection(userId) {
    if (!userId) {
        throw new Error('User ID is required.');
    }
    const User = mainDbConnection.model('User', UserSchema);
    const user = await User.findById(userId);

    if (!user || !user.dbName) {
        throw new Error('User or database not found.');
    }

    if (!dbConnections[user.dbName]) {
        const userDbUri = process.env.MONGO_URI.replace('truckers', user.dbName);
        dbConnections[user.dbName] = mongoose.createConnection(userDbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Nouvelle connexion créée pour la base de données: ${user.dbName}`);
    }
    return dbConnections[user.dbName];
}

// Middleware pour la vérification du token JWT et la gestion des connexions
const authenticateTokenAndConnect = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        // Pour les routes publiques (login, register), on n'a pas besoin de token
        return next();
    }
    
    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;

        try {
            // Si le token contient un `dbName`, on utilise la connexion dynamique
            if (user.dbName) {
                req.dbConnection = await getUserDbConnection(user.id);
            } else {
                // Sinon (pour l'admin par défaut), on utilise la connexion par défaut
                req.dbConnection = defaultDbConnection;
            }
            next();
        } catch (dbError) {
            console.error('Erreur de connexion à la base de données:', dbError);
            res.status(500).send('Erreur de connexion à la base de données.');
        }
    });
};

app.use(authenticateTokenAndConnect);

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
  role: { type: String, enum: ['Gestionnaire', 'Vendeur'], required: true },
  dbName: { type: String, required: false },
  whatsappNumber: { type: String, required: false },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Pour lier les vendeurs aux gestionnaires
  createdAt: { type: Date, default: Date.now }
});

const ActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  action: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const User = mainDbConnection.model('User', UserSchema);
const Action = mainDbConnection.model('Action', ActionSchema);

// Fonction pour l'envoi WhatsApp (avec une API comme Twilio)
// Cette fonction est conceptuelle, vous devez la configurer avec vos credentials Twilio
async function sendWhatsAppPhoto(to, imageUrl) {
    // try {
    //     await twilioClient.messages.create({
    //         mediaUrl: [imageUrl],
    //         from: 'whatsapp:+14155238886', // Votre numéro Twilio
    //         to: `whatsapp:${to}`
    //     });
    //     console.log(`Photo envoyée à ${to}.`);
    // } catch (error) {
    //     console.error('Erreur lors de l\'envoi de la photo WhatsApp:', error);
    // }
    log(`Fonctionnalité d'envoi WhatsApp en cours d'implémentation. Photo pour ${to}: ${imageUrl}`);
}

// ===================== ROUTES D'AUTHENTIFICATION =====================
// Route d'initialisation de l'administrateur par défaut (à exécuter une seule fois !)
app.get('/api/admin/init', async (req, res) => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                password: 'password123', // REMPLACEZ CECI !
                role: 'Gestionnaire',
                dbName: 'truckers', // Base de données par défaut
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

// Route d'inscription pour les nouveaux gestionnaires
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, whatsappNumber } = req.body;
        const newUser = new User({ username, password, role: 'Gestionnaire', whatsappNumber });
        
        // Créer un nom de base de données unique pour le nouveau gestionnaire
        const dbName = `truckers_${newUser._id.toString()}`;
        newUser.dbName = dbName;
        await newUser.save();
        
        // Créer la connexion et les collections pour la nouvelle BDD
        const dbConnection = await getUserDbConnection(newUser._id);
        await dbConnection.model('Trucker', TruckerSchema).createCollection();
        await dbConnection.model('Maintenance', MaintenanceSchema).createCollection();
        await dbConnection.model('Approvisionnement', ApproSchema).createCollection();
        await dbConnection.model('Invoice', InvoiceSchema).createCollection();

        res.status(201).json({ message: 'Inscription réussie et base de données créée.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route de connexion
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role, dbName: user.dbName }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Connexion réussie', token, user: { id: user._id, username: user.username, role: user.role } });
    } else {
        res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect.');
    }
});

// Route pour ajouter un nouvel utilisateur (vendeur)
app.post('/api/users', async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'Gestionnaire') {
            return res.status(403).send('Seuls les gestionnaires peuvent ajouter des vendeurs.');
        }
        const { username, password } = req.body;
        const newUser = new User({ username, password, role: 'Vendeur', managerId: req.user.id });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour obtenir la liste des vendeurs
// Correction pour la route /api/users
app.get('/api/users', async (req, res) => {
  try {
      const User = mainDbConnection.model('User', UserSchema);
      // Permettre aux rôles 'Admin' ET 'Gestionnaire' d'accéder à toutes les données
      if (req.user.role === 'Admin' || req.user.role === 'Gestionnaire') {
          const users = await User.find({}, 'username role creationDate');
          return res.json(users);
      }
      
      // La logique pour les autres rôles peut rester inchangée
      if (req.user.role === 'Vendeur') {
          return res.status(403).send('Accès refusé.');
      }

      // Si l'utilisateur n'a aucun des rôles ci-dessus, envoyer une réponse par défaut
      return res.status(403).send('Accès refusé.');

  } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      res.status(500).send(err.message);
  }
});

// ===================== ROUTES DE GESTION DE DONNÉES (protégées) =====================
// Les routes ci-dessous utilisent `req.dbConnection` pour accéder à la bonne base de données.

// FACTURES
app.post('/api/factures', async (req, res) => {
    try {
        const Invoice = req.dbConnection.model('Invoice', InvoiceSchema);
        const facture = new Invoice(req.body);
        await facture.save();
        res.status(201).json(facture);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/factures', async (req, res) => {
    try {
        const Invoice = req.dbConnection.model('Invoice', InvoiceSchema);
        const factures = await Invoice.find().sort({ date: -1 });
        res.json(factures);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// CAMIONNEURS
app.post('/api/truckers', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const { name, truckPlate, truckType, balance = 0 } = req.body;
        const trucker = new Trucker({ name, truckPlate, truckType, balance });
        await trucker.save();
        const qrPayload = JSON.stringify({ id: trucker._id, name, truckPlate, truckType, balance });
        const qrDataURL = await QRCode.toDataURL(qrPayload);
        res.json({ trucker, qr: qrDataURL });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/truckers', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const { plate } = req.query;
        const list = plate ? await Trucker.find({ truckPlate: plate }) : await Trucker.find();
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/truckers/:id/credit', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
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

app.get('/api/truckers/:id', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) return res.status(404).send('Not found');
        res.json(trucker);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/truckers/:id/credits', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const trucker = await Trucker.findById(req.params.id);
        if (!trucker) return res.status(404).send('Not found');
        res.json(trucker.credits);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// GASOIL
app.post('/api/gasoil/attribution-chrono', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const { truckPlate, liters, machineType, startTime, endTime, duration, operator, activity, chauffeurName, gasoilConsumed, volumeSable, startKmPhoto, endKmPhoto } = req.body;
        const trucker = await Trucker.findOne({ truckPlate });
        if (!trucker) return res.status(404).send('Camionneur non trouvé');
        
        // La logique pour la sauvegarde des photos
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

app.post('/api/truckers/:id/gasoil', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
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

// BILAN ET RAPPORTS
app.get('/api/gasoil/bilan', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const Approvisionnement = req.dbConnection.model('Approvisionnement', ApproSchema);
        const truckers = await Trucker.find();
        const bilan = truckers.map(t => ({
            truckPlate: t.truckPlate,
            name: t.name,
            totalLiters: t.gasoils.reduce((sum, g) => sum + g.liters, 0),
            totalConsumed: t.gasoils.reduce((sum, g) => sum + (g.gasoilConsumed || 0), 0),
        }));
        const totalGlobal = bilan.reduce((sum, t) => sum + t.totalLiters, 0);
        const totalGlobalConsumed = bilan.reduce((sum, t) => sum + t.totalConsumed, 0);
        const approvisionnements = await Approvisionnement.find();
        const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
        const restante = totalAppro - totalGlobal;
        res.json({ bilan, totalGlobal, totalGlobalConsumed, totalAppro, restante });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/attributions', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const truckers = await Trucker.find();
        const attributions = [];
        truckers.forEach(trucker => {
            trucker.gasoils.forEach(gasoil => {
                attributions.push({
                    truckPlate: trucker.truckPlate,
                    name: trucker.name,
                    liters: gasoil.liters,
                    date: gasoil.date,
                    machineType: gasoil.machineType,
                    operator: gasoil.operator,
                    activity: gasoil.activity,
                    chauffeurName: gasoil.chauffeurName || '',
                });
            });
        });
        attributions.sort((a, b) => b.date - a.date);
        res.json(attributions);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/credits/bilan', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const total = (await Trucker.find()).reduce((acc, t) => acc + t.credits.reduce((sum, c) => sum + c.amount, 0), 0);
        res.json({ total });
    } catch (err) {
        res.status(500).send('Erreur serveur: ' + err.message);
    }
});

app.get('/api/bilan-complet', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
        const Approvisionnement = req.dbConnection.model('Approvisionnement', ApproSchema);
        const Maintenance = req.dbConnection.model('Maintenance', MaintenanceSchema);
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

// APPROVISIONNEMENT
app.post('/api/approvisionnement', async (req, res) => {
    try {
        const Approvisionnement = req.dbConnection.model('Approvisionnement', ApproSchema);
        const { date, fournisseur, quantite, prixUnitaire, receptionniste } = req.body;
        const montantTotal = quantite * prixUnitaire;
        const record = new Approvisionnement({ date, fournisseur, quantite, prixUnitaire, montantTotal, receptionniste });
        await record.save();
        res.status(201).json(record);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/approvisionnement', async (req, res) => {
    try {
        const Approvisionnement = req.dbConnection.model('Approvisionnement', ApproSchema);
        const list = await Approvisionnement.find().sort({ date: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/api/approvisionnement/:id', async (req, res) => {
    try {
        const Approvisionnement = req.dbConnection.model('Approvisionnement', ApproSchema);
        const deletedRecord = await Approvisionnement.findByIdAndDelete(req.params.id);
        if (!deletedRecord) {
            return res.status(404).json({ message: 'Approvisionnement non trouvé.' });
        }
        res.json({ message: 'Approvisionnement supprimé avec succès.' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// MAINTENANCE
app.post('/api/maintenance', async (req, res) => {
    try {
        const Maintenance = req.dbConnection.model('Maintenance', MaintenanceSchema);
        const { itemName, unitPrice, quantity } = req.body;
        const totalPrice = unitPrice * quantity;
        const achat = new Maintenance({ itemName, unitPrice, quantity, totalPrice });
        await achat.save();
        res.status(201).json(achat);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/maintenance', async (req, res) => {
    try {
        const Maintenance = req.dbConnection.model('Maintenance', MaintenanceSchema);
        const list = await Maintenance.find().sort({ date: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/maintenance/bilan', async (req, res) => {
    try {
        const Maintenance = req.dbConnection.model('Maintenance', MaintenanceSchema);
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

// SUPPRESSION
app.delete('/api/attribution-gasoil/:id', async (req, res) => {
    try {
        const Trucker = req.dbConnection.model('Trucker', TruckerSchema);
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