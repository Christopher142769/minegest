const mongoose = require('mongoose');

// ===================== Schémas =====================
// Définition des schémas nécessaires pour le modèle Trucker.
// C'est nécessaire pour que Mongoose puisse se connecter et manipuler la collection.
const GasoilSchema = new mongoose.Schema({
  liters: Number,
  date: { type: Date, default: Date.now },
  machineType: String,
  startTime: String,
  endTime: String,
  duration: String,
  operator: String,
  activity: String,
  chauffeurName: String,
  gasoilConsumed: Number,
  volumeSable: Number,
});

const CreditSchema = new mongoose.Schema({
  amount: Number,
  date: { type: Date, default: Date.now }
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

// ===================== Connexion et Exécution =====================
// Connexion à la base de données.
// J'ai retiré les options obsolètes (`useNewUrlParser`, `useUnifiedTopology`).
mongoose.connect('mongodb://localhost/truckers');

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ Erreur de connexion MongoDB:'));
db.once('open', async () => {
  console.log('✅ Connexion à la base de données réussie.');

  try {
    console.log('⏳ Vidage de la collection "truckers"...');
    
    // Supprime tous les documents de la collection 'truckers'.
    const result = await Trucker.deleteMany({});
    
    console.log(`✅ ${result.deletedCount} camion(s) supprimé(s).`);
    console.log('✨ La collection "truckers" a été vidée avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors du vidage de la collection "truckers":', err);
  } finally {
    // Ferme la connexion à la base de données après l'opération.
    mongoose.connection.close();
    console.log('👋 Connexion fermée.');
  }
});
