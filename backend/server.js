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
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ===================== Middleware d'authentification =====================
const authenticateUser = (req, res, next) => {
    const userId = req.headers['x-user-id']; 
    if (!userId) {
        return res.status(401).send('Authentification requise.');
    }
    req.userId = userId;
    next();
};

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
});

const MaintenanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemName: String,
  unitPrice: Number,
  quantity: Number,
  totalPrice: Number,
  date: { type: Date, default: Date.now }
});

const ApproSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: Date,
  fournisseur: String,
  quantite: Number,
  prixUnitaire: Number,
  montantTotal: Number,
  receptionniste: String
});

const TruckerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Gestionnaire', 'Vendeur'], required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // NOUVEAU: Pour lier le vendeur à son gestionnaire
  createdAt: { type: Date, default: Date.now }
});

const ActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  action: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Action = mongoose.model('Action', ActionSchema);

const logAction = async (userId, username, action, details) => {
    const newAction = new Action({ userId, username, action, details });
    await newAction.save();
};

// ===================== Routes Originales (Non sécurisées) =====================

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
      truckPlate,
      liters,
      machineType,
      startTime,
      endTime,
      duration,
      operator,
      activity,
      chauffeurName,
      gasoilConsumed,
      volumeSable,
      startKmPhoto, 
      endKmPhoto,   
    } = req.body;
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
    });
    await trucker.save();
    res.json(trucker);
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
    const { date, fournisseur, quantite, prixUnitaire, receptionniste } = req.body;
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

app.post('/api/maintenance', async (req, res) => {
  try {
    const { itemName, unitPrice, quantity } = req.body;
    const totalPrice = unitPrice * quantity;
    const truckers = await Trucker.find();
    const soldeInitial = truckers.reduce((sum, t) => sum + (t.balance || 0), 0);
    const approvisionnements = await Approvisionnement.find();
    const depenseGasoil = approvisionnements.reduce((acc, a) => acc + (a.montantTotal || 0), 0);
    const maintenanceData = await Maintenance.find();
    const depenseMaintenance = maintenanceData.reduce((acc, m) => acc + (m.totalPrice || 0), 0);
    let soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;
    if (soldeActuel < 0) soldeActuel = 0;
    if (totalPrice > soldeActuel) {
      return res.status(400).json({
        message: `Solde insuffisant : actuel ${soldeActuel} FCFA, dépense requise ${totalPrice} FCFA`
      });
    }
    const achat = new Maintenance({ itemName, unitPrice, quantity, totalPrice });
    await achat.save();
    res.status(201).json(achat);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/maintenance', async (req, res) => {
  try {
    const list = await Maintenance.find().sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/maintenance/bilan', async (req, res) => {
  try {
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

app.get('/api/attributions', async (req, res) => {
  try {
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
          startTime: gasoil.startTime,
          endTime: gasoil.endTime,
          duration: gasoil.duration,
          operator: gasoil.operator,
          activity: gasoil.activity,
          chauffeurName: gasoil.chauffeurName || '',
          gasoilConsumed: gasoil.gasoilConsumed || 0,
          volumeSable: gasoil.volumeSable || 0,
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
    const truckers = await Trucker.find();
    const total = truckers.reduce((acc, t) => acc + t.credits.reduce((sum, c) => sum + c.amount, 0), 0);
    res.json({ total });
  } catch (err) {
    res.status(500).send('Erreur serveur: ' + err.message);
  }
});

app.get('/api/bilan-complet', async (req, res) => {
  try {
    const truckers = await Trucker.find();
    const soldeInitial = truckers.reduce((sum, t) => sum + (t.balance || 0), 0);
    const approvisionnements = await Approvisionnement.find();
    const depenseGasoil = approvisionnements.reduce(
      (acc, a) => acc + (a.montantTotal || 0),
      0
    );
    const maintenanceData = await Maintenance.aggregate([
      {
        $group: {
          _id: '$itemName',
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalPrice' }
        }
      },
      {
        $project: {
          _id: 0,
          itemName: '$_id',
          totalQuantity: 1,
          totalAmount: 1
        }
      }
    ]);
    const depenseMaintenance = maintenanceData.reduce(
      (acc, m) => acc + (m.totalAmount || 0),
      0
    );
    const detailsGasoil = approvisionnements.map(a => ({
      date: a.date,
      fournisseur: a.fournisseur,
      quantite: a.quantite,
      prixUnitaire: a.prixUnitaire,
      montantTotal: a.montantTotal,
      receptionniste: a.receptionniste
    }));
    let soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;
    if (soldeActuel < 0) soldeActuel = 0;
    res.json({
      soldeInitial,
      depenseGasoil,
      depenseMaintenance,
      soldeActuel,
      detailsGasoil,
      detailsMaintenance: maintenanceData
    });
  } catch (err) {
    res.status(500).send('Erreur serveur: ' + err.message);
  }
});

app.post('/api/truckers/:id/gasoil', async (req, res) => {
  try {
      const { liters, date, machineType, operator, chauffeurName, activity } = req.body;
      if (!liters || liters <= 0) {
          return res.status(400).json({ message: 'La quantité de gasoil doit être supérieure à 0.' });
      }
      const trucker = await Trucker.findById(req.params.id);
      if (!trucker) {
          return res.status(404).json({ message: 'Machine non trouvée.' });
      }
      const approvisionnements = await Approvisionnement.find();
      const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
      const truckersWithGasoil = await Trucker.find();
      const totalAttribue = truckersWithGasoil.reduce((acc, t) => {
          return acc + t.gasoils.reduce((sum, g) => sum + (g.liters || 0), 0);
      }, 0);
      const restant = totalAppro - totalAttribue;
      if (liters > restant) {
          return res.status(400).json({ message: `Stock insuffisant : reste ${restant.toFixed(2)} L.` });
      }
      trucker.gasoils.push({
          liters: Number(liters),
          date,
          machineType,
          operator,
          activity,
          chauffeurName,
      });
      await trucker.save();
      res.status(200).json({ message: 'Gasoil attribué avec succès.' });
  } catch (err) {
      console.error('Erreur lors de l\'attribution de gasoil :', err);
      res.status(500).json({ message: 'Erreur serveur interne lors de l\'attribution.' });
  }
});

app.delete('/api/approvisionnement/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Approvisionnement.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: 'Approvisionnement non trouvé.' });
    }
    res.json({ message: 'Approvisionnement supprimé avec succès.' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/api/attribution-gasoil/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTrucker = await Trucker.findOneAndUpdate(
      { 'gasoils._id': id },
      { $pull: { gasoils: { _id: id } } },
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

// ===================== Nouvelles routes (Sécurisées par l'utilisateur) =====================

app.post('/api/factures', authenticateUser, async (req, res) => {
  try {
    const facture = new Invoice({ ...req.body, userId: req.userId });
    await facture.save();
    res.status(201).json(facture);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/factures', authenticateUser, async (req, res) => {
  try {
    const factures = await Invoice.find({ userId: req.userId }).sort({ date: -1 });
    res.json(factures);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/truckers', authenticateUser, async (req, res) => {
  try {
    const { name, truckPlate, truckType, balance = 0 } = req.body;
    const trucker = new Trucker({ name, truckPlate, truckType, balance, userId: req.userId });
    await trucker.save();
    const qrPayload = JSON.stringify({ id: trucker._id, name, truckPlate, truckType, balance });
    const qrDataURL = await QRCode.toDataURL(qrPayload);
    res.json({ trucker, qr: qrDataURL });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// app.get('/api/truckers', authenticateUser, async (req, res) => {
//   const { plate } = req.query;
//   const query = { userId: req.userId };
//   if (plate) {
//       query.truckPlate = plate;
//   }
//   const list = await Trucker.find(query);
//   res.json(list);
// });

// app.post('/api/truckers/:id/credit', authenticateUser, async (req, res) => {
//   try {
//     const { amount } = req.body;
//     const trucker = await Trucker.findOne({ _id: req.params.id, userId: req.userId });
//     if (!trucker) return res.status(404).send('Not found');
//     trucker.credits.push({ amount });
//     trucker.balance += amount;
//     await trucker.save();
//     res.json(trucker);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
// Routes pour les machines (camions)
app.get('/api/truckers', authenticateUser, async (req, res) => {
  try {
      const truckers = await Trucker.find({ userId: req.userId });
      res.json(truckers);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

app.post('/api/truckers', authenticateUser, async (req, res) => {
  try {
      const newTrucker = new Trucker({
          ...req.body,
          userId: req.userId
      });
      await newTrucker.save();
      res.status(201).json(newTrucker);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

app.get('/api/truckers/:id', authenticateUser, async (req, res) => {
  const trucker = await Trucker.findOne({ _id: req.params.id, userId: req.userId });
  if (!trucker) return res.status(404).send('Not found');
  res.json(trucker);
});

app.get('/api/truckers/:id/credits', authenticateUser, async (req, res) => {
  try {
    const trucker = await Trucker.findOne({ _id: req.params.id, userId: req.userId });
    if (!trucker) return res.status(404).send('Not found');
    res.json(trucker.credits);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/gasoil/attribution-chrono', authenticateUser, async (req, res) => {
  try {
    const {
      truckPlate,
      liters,
      machineType,
      startTime,
      endTime,
      duration,
      operator,
      activity,
      chauffeurName,
      gasoilConsumed,
      volumeSable,
      startKmPhoto,
      endKmPhoto,
    } = req.body;
    const trucker = await Trucker.findOne({ truckPlate, userId: req.userId });
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
    });
    await trucker.save();
    res.json(trucker);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// app.get('/api/gasoil/bilan', authenticateUser, async (req, res) => {
//   try {
//     const truckers = await Trucker.find({ userId: req.userId });
//     const bilan = truckers.map(t => {
//       const totalLiters = t.gasoils.reduce((sum, g) => sum + g.liters, 0);
//       const totalConsumed = t.gasoils.reduce((sum, g) => sum + (g.gasoilConsumed || 0), 0);
//       return {
//         truckPlate: t.truckPlate,
//         name: t.name,
//         totalLiters,
//         totalConsumed,
//       };
//     });
//     const totalGlobal = bilan.reduce((sum, t) => sum + t.totalLiters, 0);
//     const totalGlobalConsumed = bilan.reduce((sum, t) => sum + t.totalConsumed, 0);
//     const approvisionnements = await Approvisionnement.find({ userId: req.userId });
//     const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
//     const restante = totalAppro - totalGlobal;
//     res.json({ bilan, totalGlobal, totalGlobalConsumed, totalAppro, restante });
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
app.get('/api/gasoil/bilan', authenticateUser, async (req, res) => {
  try {
    const truckers = await Trucker.find({ userId: req.userId }); // Filtrage par userId
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
    
    // Filtrage également pour les approvisionnements
    const approvisionnements = await Approvisionnement.find({ userId: req.userId });
    
    const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
    const restante = totalAppro - totalGlobal;
    res.json({ bilan, totalGlobal, totalGlobalConsumed, totalAppro, restante });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/approvisionnement', authenticateUser, async (req, res) => {
  try {
    const { date, fournisseur, quantite, prixUnitaire, receptionniste } = req.body;
    const montantTotal = quantite * prixUnitaire;
    const record = new Approvisionnement({
      date,
      fournisseur,
      quantite,
      prixUnitaire,
      montantTotal,
      receptionniste,
      userId: req.userId
    });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// app.get('/api/approvisionnement', authenticateUser, async (req, res) => {
//   try {
//     const list = await Approvisionnement.find({ userId: req.userId }).sort({ date: -1 });
//     res.json(list);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });

// app.post('/api/maintenance', authenticateUser, async (req, res) => {
//   try {
//     const { itemName, unitPrice, quantity } = req.body;
//     const totalPrice = unitPrice * quantity;
//     const achat = new Maintenance({ itemName, unitPrice, quantity, totalPrice, userId: req.userId });
//     await achat.save();
//     res.status(201).json(achat);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
// Routes pour les approvisionnements
app.get('/api/approvisionnement', authenticateUser, async (req, res) => {
  try {
    const list = await Approvisionnement.find({ userId: req.userId }).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/approvisionnement', authenticateUser, async (req, res) => {
  try {
      const newAppro = new Approvisionnement({
          ...req.body,
          userId: req.userId
      });
      await newAppro.save();
      res.status(201).json(newAppro);
  } catch (err) {
      res.status(500).send(err.message);
  }
});
app.get('/api/maintenance', authenticateUser, async (req, res) => {
  try {
    const list = await Maintenance.find({ userId: req.userId }).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/maintenance/bilan', authenticateUser, async (req, res) => {
  try {
    const grouped = await Maintenance.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
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

app.get('/api/attributions', authenticateUser, async (req, res) => {
  try {
    const truckers = await Trucker.find({ userId: req.userId });
    const attributions = [];
    truckers.forEach(trucker => {
      trucker.gasoils.forEach(gasoil => {
        attributions.push({
          truckPlate: trucker.truckPlate,
          name: trucker.name,
          liters: gasoil.liters,
          date: gasoil.date,
          machineType: gasoil.machineType,
          startTime: gasoil.startTime,
          endTime: gasoil.endTime,
          duration: gasoil.duration,
          operator: gasoil.operator,
          activity: gasoil.activity,
          chauffeurName: gasoil.chauffeurName || '',
          gasoilConsumed: gasoil.gasoilConsumed || 0,
          volumeSable: gasoil.volumeSable || 0,
        });
      });
    });
    attributions.sort((a, b) => b.date - a.date);
    res.json(attributions);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/credits/bilan', authenticateUser, async (req, res) => {
  try {
    const truckers = await Trucker.find({ userId: req.userId });
    const total = truckers.reduce((acc, t) => acc + t.credits.reduce((sum, c) => sum + c.amount, 0), 0);
    res.json({ total });
  } catch (err) {
    res.status(500).send('Erreur serveur: ' + err.message);
  }
});

app.get('/api/bilan-complet', authenticateUser, async (req, res) => {
  try {
    const truckers = await Trucker.find({ userId: req.userId });
    const soldeInitial = truckers.reduce((sum, t) => sum + (t.balance || 0), 0);
    const approvisionnements = await Approvisionnement.find({ userId: req.userId });
    const depenseGasoil = approvisionnements.reduce(
      (acc, a) => acc + (a.montantTotal || 0),
      0
    );
    const maintenanceData = await Maintenance.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      {
        $group: {
          _id: '$itemName',
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalPrice' }
        }
      },
      {
        $project: {
          _id: 0,
          itemName: '$_id',
          totalQuantity: 1,
          totalAmount: 1
        }
      }
    ]);
    const depenseMaintenance = maintenanceData.reduce(
      (acc, m) => acc + (m.totalAmount || 0),
      0
    );
    const detailsGasoil = approvisionnements.map(a => ({
      date: a.date,
      fournisseur: a.fournisseur,
      quantite: a.quantite,
      prixUnitaire: a.prixUnitaire,
      montantTotal: a.montantTotal,
      receptionniste: a.receptionniste
    }));
    let soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;
    if (soldeActuel < 0) soldeActuel = 0;
    res.json({
      soldeInitial,
      depenseGasoil,
      depenseMaintenance,
      soldeActuel,
      detailsGasoil,
      detailsMaintenance: maintenanceData
    });
  } catch (err) {
    res.status(500).send('Erreur serveur: ' + err.message);
  }
});

app.post('/api/truckers/:id/gasoil', authenticateUser, async (req, res) => {
  try {
      const { liters, date, machineType, operator, chauffeurName, activity } = req.body;
      if (!liters || liters <= 0) {
          return res.status(400).json({ message: 'La quantité de gasoil doit être supérieure à 0.' });
      }
      const trucker = await Trucker.findOne({ _id: req.params.id, userId: req.userId });
      if (!trucker) {
          return res.status(404).json({ message: 'Machine non trouvée.' });
      }
      const approvisionnements = await Approvisionnement.find({ userId: req.userId });
      const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);
      const truckersWithGasoil = await Trucker.find({ userId: req.userId });
      const totalAttribue = truckersWithGasoil.reduce((acc, t) => {
          return acc + t.gasoils.reduce((sum, g) => sum + (g.liters || 0), 0);
      }, 0);
      const restant = totalAppro - totalAttribue;
      if (liters > restant) {
          return res.status(400).json({ message: `Stock insuffisant : reste ${restant.toFixed(2)} L.` });
      }
      trucker.gasoils.push({
          liters: Number(liters),
          date,
          machineType,
          operator,
          activity,
          chauffeurName,
      });
      await trucker.save();
      res.status(200).json({ message: 'Gasoil attribué avec succès.' });
  } catch (err) {
      console.error('Erreur lors de l\'attribution de gasoil :', err);
      res.status(500).json({ message: 'Erreur serveur interne lors de l\'attribution.' });
  }
});

app.delete('/api/approvisionnement/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Approvisionnement.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deletedRecord) {
      return res.status(404).json({ message: 'Approvisionnement non trouvé.' });
    }
    res.json({ message: 'Approvisionnement supprimé avec succès.' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/api/attribution-gasoil/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTrucker = await Trucker.findOneAndUpdate(
      { 'gasoils._id': id, userId: req.userId },
      { $pull: { gasoils: { _id: id } } },
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

// ===================== Routes de connexion et d'utilisateurs =====================

app.get('/api/admin/init', async (req, res) => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                password: 'password123',
                role: 'Gestionnaire'
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

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
      await logAction(user._id, user.username, 'Connexion utilisateur', { ip: req.ip });
      res.json({
          message: 'Connexion réussie',
          user: { username: user.username, role: user.role, id: user._id }
      });
  } else {
      res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect.');
  }
});

// Nouvelle route pour l'inscription : ouverte à tous
app.post('/api/register', async (req, res) => {
  try {
      const { username, password } = req.body;
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ username });
      if (existingUser) {
          return res.status(409).send('Ce nom d\'utilisateur est déjà pris.');
      }

      // Créer un nouvel utilisateur avec le rôle de gestionnaire
      const newUser = new User({ username, password, role: 'Gestionnaire' });
      await newUser.save();
      res.status(201).json({ message: 'Inscription réussie.' });
  } catch (err) {
      res.status(500).send(err.message);
  }
});

// Route pour l'ajout de vendeurs par un gestionnaire
// app.post('/api/users/addSeller', authenticateUser, async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         const managerId = req.userId; // L'ID du gestionnaire est extrait du token
//         const newUser = new User({ username, password, role: 'Vendeur', managerId });
//         await newUser.save();
//         await logAction(managerId, req.user.username, 'Ajout d\'un vendeur', { addedUser: newUser.username });
//         res.status(201).json(newUser);
//     } catch (err) {
//         if (err.code === 11000) {
//             return res.status(409).send('Ce nom d\'utilisateur est déjà pris.');
//         }
//         res.status(500).send(err.message);
//     }
// });

// app.get('/api/users/sellers', authenticateUser, async (req, res) => {
//     try {
//         const sellers = await User.find({ managerId: req.userId, role: 'Vendeur' }, 'username createdAt');
//         res.json(sellers);
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// });
// Route pour ajouter un vendeur (sécurisée)
app.post('/api/users/sellers', authenticateUser, async (req, res) => {
  try {
      const { username, password } = req.body;
      const managerId = req.userId;
      const newUser = new User({ username, password, role: 'Vendeur', managerId });
      await newUser.save();
      await logAction(managerId, username, 'Ajout d\'un vendeur', { addedUser: newUser.username });
      res.status(201).json(newUser);
  } catch (err) {
      if (err.code === 11000) {
          return res.status(409).send('Ce nom d\'utilisateur est déjà pris.');
      }
      res.status(500).send(err.message);
  }
});

// Route pour lister les vendeurs (sécurisée)
app.get('/api/users/sellers', authenticateUser, async (req, res) => {
  try {
      const sellers = await User.find({ managerId: req.userId, role: 'Vendeur' }, 'username createdAt');
      res.json(sellers);
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

app.get('/api/actions/:username', async (req, res) => {
    try {
        const actions = await Action.find({ username: req.params.username }).sort({ timestamp: -1 });
        res.json(actions);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));