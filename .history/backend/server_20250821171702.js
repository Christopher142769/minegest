require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connexion à MongoDB réussie'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
// ===================== Schémas =====================
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
  // Ajoutez le champ 'recordedBy' pour l'historique
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByUsername: String,
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

const Trucker = mongoose.model('Trucker', TruckerSchema);
const Maintenance = mongoose.model('Maintenance', MaintenanceSchema);
const Approvisionnement = mongoose.model('Approvisionnement', ApproSchema);

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

const Invoice = mongoose.model('Invoice', InvoiceSchema);

// Ajoutez ce schéma pour l'historique des actions
const ActionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    actionType: String,
    details: Object,
    timestamp: { type: Date, default: Date.now }
});
const Action = mongoose.model('Action', ActionSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Vendeur'], required: true }
});
const User = mongoose.model('User', UserSchema);

// Fonction utilitaire pour logguer les actions
async function logAction(userId, username, actionType, details) {
    const action = new Action({
        userId,
        username,
        actionType,
        details
    });
    await action.save();
}

// ===================== Routes =====================
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (role !== 'Vendeur') {
            return res.status(400).send('Seuls les vendeurs peuvent être ajoutés.');
        }
        const newUser = new User({ username, password, role });
        await newUser.save();
        await logAction(newUser._id, newUser.username, 'Ajout utilisateur', { addedUser: newUser.username, role: newUser.role });
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username role');
        res.json(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Identifiants invalides.' });
        }
        res.status(200).json({ message: 'Connexion réussie', user });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/factures', async (req, res) => {
  try {
    const facture = new Invoice(req.body);
    await facture.save();
    res.status(201).json(facture);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/factures', async (req, res) => {
  try {
    const factures = await Invoice.find().sort({ date: -1 });
    res.json(factures);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/truckers', async (req, res) => {
  try {
    const { name, truckPlate, truckType, userId, username, balance = 0 } = req.body;
    const trucker = new Trucker({ name, truckPlate, truckType, balance });
    await trucker.save();

    const qrPayload = JSON.stringify({ id: trucker._id, name, truckPlate, truckType, balance });
    const qrDataURL = await QRCode.toDataURL(qrPayload);

    await logAction(userId, username, 'Ajout de machine', { truckPlate: trucker.truckPlate, name: trucker.name });

    res.json({ trucker, qr: qrDataURL });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/truckers', async (req, res) => {
  const { plate } = req.query;
  const list = plate ? await Trucker.find({ truckPlate: plate }) : await Trucker.find();
  res.json(list);
});

app.post('/api/truckers/:id/credit', async (req, res) => {
  try {
    const { amount } = req.body;
    const trucker = await Trucker.findById(req.params.id);
    if (!trucker) return res.status(404).send('Not found');

    trucker.credits.push({ amount });
    trucker.balance += amount;
    await trucker.save();
    
    await logAction(trucker._id, trucker.username, 'Ajout de crédit', { trucker: trucker.name, amount });
    
    res.json(trucker);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/truckers/:id', async (req, res) => {
  const trucker = await Trucker.findById(req.params.id);
  if (!trucker) return res.status(404).send('Not found');
  res.json(trucker);
});

app.get('/api/truckers/:id/credits', async (req, res) => {
  try {
    const trucker = await Trucker.findById(req.params.id);
    if (!trucker) return res.status(404).send('Not found');
    res.json(trucker.credits);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/gasoil/attribution-chrono', async (req, res) => {
  try {
    const {
      truckPlate, liters, machineType, startTime, endTime, duration, operator, activity, chauffeurName, gasoilConsumed, volumeSable, startKmPhoto, endKmPhoto, userId, username
    } = req.body;

    if (!liters || liters <= 0) return res.status(400).send('La quantité doit être positive.');

    // Stock verification code...
    const approvisionnements = await Approvisionnement.find();
    const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
    const truckers = await Trucker.find();
    const totalAttribue = truckers.reduce((acc, t) => acc + t.gasoils.reduce((sum, g) => sum + g.liters, 0), 0);
    const restant = totalAppro - totalAttribue;
    if (liters > restant) return res.status(400).json({ message: `Stock insuffisant : reste ${restant.toFixed(2)} L.` });

    const trucker = await Trucker.findOne({ truckPlate });
    if (!trucker) return res.status(404).send('Camionneur non trouvé');

    // --- LOGIQUE POUR SAUVEGARDER LES PHOTOS ---
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
    // --- FIN DE LA LOGIQUE PHOTOS ---

    trucker.gasoils.push({
      liters,
      date: new Date(),
      machineType,
      startTime,
      endTime,
      duration,
      operator,
      activity,
      chauffeurName,
      gasoilConsumed,
      volumeSable,
      startKmPhotoPath,
      endKmPhotoPath,
      recordedBy: userId,
      recordedByUsername: username,
    });

    await trucker.save();

    await logAction(userId, username, 'Attribution chrono', { machine: truckPlate, duration, gasoilConsumed });
    
    res.json(trucker);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Route pour obtenir l'historique des actions d'un utilisateur
app.get('/api/actions/:username', async (req, res) => {
    try {
        const actions = await Action.find({ username: req.params.username }).sort({ timestamp: -1 });
        res.json(actions);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/gasoil/bilan', async (req, res) => {
  try {
    const truckers = await Trucker.find();
    const bilan = truckers.map(t => {
      const totalLiters = t.gasoils.reduce((sum, g) => sum + g.liters, 0);
      const totalConsumed = t.gasoils.reduce((sum, g) => sum + (g.gasoilConsumed || 0), 0);
      return {
        truckPlate: t.truckPlate,
        name: t.name,
        totalLiters,
        totalConsumed,
      };
    });
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

app.post('/api/approvisionnement', async (req, res) => {
  try {
    const { date, fournisseur, quantite, prixUnitaire, receptionniste, userId, username } = req.body;
    const montantTotal = quantite * prixUnitaire;

    const record = new Approvisionnement({
      date,
      fournisseur,
      quantite,
      prixUnitaire,
      montantTotal,
      receptionniste
    });
    await record.save();

    await logAction(userId, username, 'Approvisionnement', { quantite, fournisseur });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/approvisionnement', async (req, res) => {
  try {
    const list = await Approvisionnement.find().sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Route pour supprimer une entrée d'attribution-chrono par son ID
app.delete('/api/gasoil/attribution-chrono/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Gasoil.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ message: 'Entrée non trouvée.' });
        }
        res.status(200).json({ message: 'Entrée supprimée avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'entrée.', error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));