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
// mongoose.connect('mongodb://localhost/truckers', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
  // --- NOUVEAUX CHAMPS POUR LES PHOTOS ---
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

// ===================== Routes =====================

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

// app.post('/api/gasoil/attribution-chrono', async (req, res) => {
//   try {
//     const {
//       truckPlate,
//       liters,
//       machineType,
//       startTime,
//       endTime,
//       duration,
//       operator,
//       activity,
//       chauffeurName,
//       gasoilConsumed,
//       volumeSable,
//     } = req.body;

//     if (!liters || liters <= 0) return res.status(400).send('La quantité doit être positive.');

//     const approvisionnements = await Approvisionnement.find();
//     const totalAppro = approvisionnements.reduce((acc, curr) => acc + curr.quantite, 0);

//     const truckers = await Trucker.find();
//     const totalAttribue = truckers.reduce((acc, t) => {
//       return acc + t.gasoils.reduce((sum, g) => sum + g.liters, 0);
//     }, 0);

//     const restant = totalAppro - totalAttribue;
//     if (restant <= 0) return res.status(400).json({ message: `Stock épuisé.` });
//     if (liters > restant) return res.status(400).json({ message: `Stock insuffisant : reste ${restant.toFixed(2)} L.` });

//     const trucker = await Trucker.findOne({ truckPlate });
//     if (!trucker) return res.status(404).send('Camionneur non trouvé');

//     trucker.gasoils.push({
//       liters,
//       date: new Date(),
//       machineType,
//       startTime,
//       endTime,
//       duration,
//       operator,
//       activity,
//       chauffeurName,
//       gasoilConsumed,
//       volumeSable,
//     });

//     await trucker.save();
//     res.json(trucker);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
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
      startKmPhoto, // Nouvelle donnée
      endKmPhoto,   // Nouvelle donnée
    } = req.body;

    // if (!liters || liters < 0) return res.status(400).send('La quantité doit être positive.');

    // ... (le code existant pour la vérification du stock) ...

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
      startKmPhotoPath, // Sauvegarde du chemin
      endKmPhotoPath,   // Sauvegarde du chemin
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

// app.post('/api/approvisionnement', async (req, res) => {
//   try {
//     const { date, fournisseur, quantite, prixUnitaire, receptionniste } = req.body;
//     const montantTotal = quantite * prixUnitaire;

//     const truckers = await Trucker.find();
//     const soldeInitial = truckers.reduce((sum, t) => sum + (t.balance || 0), 0);

//     const approvisionnements = await Approvisionnement.find();
//     const depenseGasoil = approvisionnements.reduce((acc, a) => acc + (a.montantTotal || 0), 0);

//     const maintenanceData = await Maintenance.find();
//     const depenseMaintenance = maintenanceData.reduce((acc, m) => acc + (m.totalPrice || 0), 0);

//     let soldeActuel = soldeInitial - depenseGasoil - depenseMaintenance;
//     if (soldeActuel < 0) soldeActuel = 0;

//     if (montantTotal > soldeActuel) {
//       return res.status(400).json({
//         message: `Solde insuffisant : actuel ${soldeActuel} FCFA, dépense requise ${montantTotal} FCFA`
//       });
//     }

//     const record = new Approvisionnement({
//       date,
//       fournisseur,
//       quantite,
//       prixUnitaire,
//       montantTotal,
//       receptionniste
//     });
//     await record.save();
//     res.status(201).json(record);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });

// app.get('/api/approvisionnement', async (req, res) => {
//   try {
//     const list = await Approvisionnement.find().sort({ date: -1 });
//     res.json(list);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
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
// Ajouter cette nouvelle route dans la section "Routes" de votre code backend
app.post('/api/truckers/:id/gasoil', async (req, res) => {
  try {
      const { liters, date, machineType, operator, chauffeurName, activity } = req.body;
      
      // Validation basique
      if (!liters || liters <= 0) {
          return res.status(400).json({ message: 'La quantité de gasoil doit être supérieure à 0.' });
      }

      const trucker = await Trucker.findById(req.params.id);
      if (!trucker) {
          return res.status(404).json({ message: 'Machine non trouvée.' });
      }
      
      // Mettre à jour la balance de stock
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

      // Ajouter l'attribution à la liste des gasoils du camion
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
    
    // Utiliser $pull pour trouver le document Trucker qui contient l'attribution
    // et retirer cette attribution de son tableau de 'gasoils'.
    const updatedTrucker = await Trucker.findOneAndUpdate(
      { 'gasoils._id': id },
      { $pull: { gasoils: { _id: id } } },
      { new: true } // Cette option retourne le document mis à jour
    );

    if (!updatedTrucker) {
      return res.status(404).json({ message: 'Attribution de gasoil non trouvée.' });
    }

    res.json({ message: 'Attribution de gasoil supprimée avec succès.' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // NON HASHÉ POUR SIMPLICITÉ, À HACHER EN PRODUCTION
  role: { type: String, enum: ['Gestionnaire', 'Vendeur'], required: true },
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

// Fonction pour enregistrer les actions
const logAction = async (userId, username, action, details) => {
    const newAction = new Action({ userId, username, action, details });
    await newAction.save();
};

// ===================== NOUVELLES ROUTES (À ajouter avant `app.listen`) =====================

// Route pour l'initialisation de l'administrateur (à exécuter une seule fois !)
app.get('/api/admin/init', async (req, res) => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                password: 'password123', // REMPLACEZ CECI !
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

// Route de connexion
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
      // Log l'action de connexion
      await logAction(user._id, user.username, 'Connexion utilisateur', { ip: req.ip });

      res.json({
          message: 'Connexion réussie',
          user: { username: user.username, role: user.role, id: user._id }
      });
  } else {
      res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect.');
  }
});

// Route pour ajouter un nouvel utilisateur (vendeur)
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

// Route pour obtenir la liste de tous les utilisateurs
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username role'); // Ne renvoie pas les mots de passe
        res.json(users);
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
mongoose.connection.on('connected', () => console.log('✅ MongoDB connecté'));
mongoose.connection.on('error', err => console.error('❌ Erreur MongoDB:', err));