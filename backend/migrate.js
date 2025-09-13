require('dotenv').config();
const mongoose = require('mongoose');

// ===================== Schémas =====================
const CreditSchema = new mongoose.Schema({ amount: Number, date: { type: Date, default: Date.now } });
const GasoilSchema = new mongoose.Schema({ liters: Number, date: { type: Date, default: Date.now }, machineType: { type: String, enum: ['6 roues', '10 roues', '12 roues', 'Tracteur', 'Chargeuse', 'Autre'], default: '6 roues' }, startTime: String, endTime: String, duration: String, operator: String, activity: String, chauffeurName: String, gasoilConsumed: Number, volumeSable: Number, startKmPhotoPath: String, endKmPhotoPath: String, });
const MaintenanceSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, itemName: String, unitPrice: Number, quantity: Number, totalPrice: Number, date: { type: Date, default: Date.now } });
const ApproSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, date: Date, fournisseur: String, quantite: Number, prixUnitaire: Number, montantTotal: Number, receptionniste: String });
const TruckerSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: String, truckPlate: String, truckType: { type: String, enum: ['6 roues', '10 roues', '12 roues'] }, balance: { type: Number, default: 0 }, credits: [CreditSchema], gasoils: [GasoilSchema], });
const InvoiceSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: String, truckPlate: String, truckType: String, unitPrice: Number, trips: Number, totalAmount: Number, balance: Number, status: Number, date: { type: Date, default: Date.now } });
const UserSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, role: { type: String, enum: ['Gestionnaire', 'Vendeur'], required: true }, managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, createdAt: { type: Date, default: Date.now } });
const ActionSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, username: String, action: { type: String, required: true }, details: mongoose.Schema.Types.Mixed, timestamp: { type: Date, default: Date.now } });

const User = mongoose.model('User', UserSchema);
const Trucker = mongoose.model('Trucker', TruckerSchema);
const Approvisionnement = mongoose.model('Approvisionnement', ApproSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Maintenance = mongoose.model('Maintenance', MaintenanceSchema);
const Action = mongoose.model('Action', ActionSchema);

// Fonction de migration
const migrate = async () => {
    try {
        console.log('Connexion à la base de données...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connecté à la base de données.');

        // Utilisez l'ID de gestionnaire fourni en variable d'environnement, sinon trouvez le premier
        const managerIdToUse = process.env.MANAGER_ID || (await User.findOne({ role: 'Gestionnaire' }))._id;

        if (!managerIdToUse) {
            console.error('Aucun gestionnaire existant trouvé. Veuillez créer un compte "Gestionnaire" ou définir l\'ID via la variable d\'environnement MANAGER_ID.');
            return;
        }

        console.log(`Migration des données existantes vers le gestionnaire : ${managerIdToUse}`);

        // Mise à jour de toutes les collections pour lier les données au gestionnaire
        console.log('Mise à jour des vendeurs...');
        await User.updateMany({ role: 'Vendeur' }, { $set: { managerId: managerIdToUse } });

        console.log('Mise à jour des camions...');
        await Trucker.updateMany({}, { $set: { userId: managerIdToUse } });

        console.log('Mise à jour des approvisionnements...');
        await Approvisionnement.updateMany({}, { $set: { userId: managerIdToUse } });

        console.log('Mise à jour des factures...');
        await Invoice.updateMany({}, { $set: { userId: managerIdToUse } });

        console.log('Mise à jour des maintenances...');
        await Maintenance.updateMany({}, { $set: { userId: managerIdToUse } });

        console.log('Mise à jour des actions...');
        await Action.updateMany({}, { $set: { userId: managerIdToUse } });

        console.log('Migration terminée avec succès !');

    } catch (err) {
        console.error('Erreur lors de la migration:', err);
    } finally {
        mongoose.disconnect();
    }
};

migrate();