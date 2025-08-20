const mongoose = require('mongoose');

// ===================== Schémas =====================
// Définition des schémas nécessaires pour le modèle Trucker
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
// Connexion à la base de données sans les options obsolètes
mongoose.connect('mongodb://localhost/truckers');

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ Erreur de connexion MongoDB:'));
db.once('open', async () => {
  console.log('✅ Connexion à la base de données réussie.');

  try {
    console.log('⏳ Vidage de toutes les attributions de gasoil...');

    // Met à jour tous les documents Trucker pour vider leur tableau de 'gasoils'.
    // Cela supprime toutes les attributions de gasoil de la base de données.
    const result = await Trucker.updateMany(
      {},
      { $set: { gasoils: [] } }
    );

    console.log(`✅ ${result.modifiedCount} camion(s) mis à jour.`);
    console.log('✨ Toutes les attributions de gasoil ont été supprimées.');
  } catch (err) {
    console.error('❌ Erreur lors du vidage des attributions de gasoil:', err);
  } finally {
    // Ferme la connexion à la base de données
    mongoose.connection.close();
    console.log('👋 Connexion fermée.');
  }
});