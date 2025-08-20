const mongoose = require('mongoose');

// Assurez-vous que cette ligne est correcte pour votre connexion
mongoose.connect('mongodb://localhost/truckers', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ Erreur de connexion MongoDB:'));
db.once('open', async () => {
  console.log('✅ Connexion à la base de données réussie.');

  try {
    // Récupérer toutes les collections existantes dans la base de données
    const collections = await db.db.listCollections().toArray();
    
    // Si des collections existent, les vider une par une
    if (collections.length > 0) {
      console.log('⏳ Vidage des collections...');
      for (const collection of collections) {
        // Supprimer tous les documents de la collection
        await db.collection(collection.name).deleteMany({});
        console.log(`✅ Collection '${collection.name}' vidée avec succès.`);
      }
    } else {
      console.log('ℹ️ Aucune collection à vider.');
    }

    console.log('✨ Base de données réinitialisée. Toutes les données ont été supprimées.');
  } catch (err) {
    console.error('❌ Erreur lors de la réinitialisation de la base de données:', err);
  } finally {
    // Fermer la connexion une fois l'opération terminée
    mongoose.connection.close();
    console.log('👋 Connexion fermée.');
  }
});