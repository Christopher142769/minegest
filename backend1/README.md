# Projet : Assistant Dux - Modificateur de Code Web Automatisé

Ce projet est une application web permettant de modifier du code (HTML, CSS, JS) en utilisant des requêtes en langage naturel. L'application s'appuie sur l'API Gemini de Google pour comprendre la demande de l'utilisateur, générer le code correspondant et l'appliquer à un fichier cible.

## Fonctionnalités

*   **Interface Web Intuitive** : Une page web simple où l'utilisateur peut saisir sa demande et spécifier le fichier à modifier.
*   **Traitement en Langage Naturel** : L'utilisateur peut formuler des demandes simples comme "ajoute un bouton rouge" ou "change la couleur de fond en bleu".
*   **Génération de Code par IA** : Utilise le modèle `gemini-2.0-flash-exp` pour générer du code HTML, CSS et JavaScript complet et fonctionnel.
*   **Application Automatisée** : Le code généré remplace automatiquement le contenu du fichier cible.
*   **Double Point d'Entrée** : Le projet peut être lancé soit comme une application web traditionnelle avec **Flask**, soit comme une API avec **FastAPI**.

## Architecture du Projet

Le système est organisé autour d'un orchestrateur principal, `Assistant_Dux.py`, qui coordonne un pipeline en trois étapes :

1.  `QuerytoPromptTransformer.py`: Ce module reçoit la requête de l'utilisateur et la transforme en un "prompt" technique détaillé, spécifiquement conçu pour être compris par un modèle de langage expert en développement web.
2.  `Expert_Web_Gemini.py`: Ce module prend le prompt technique, interroge l'API Gemini de Google, et récupère le code HTML/CSS/JS généré.
3.  `Fonction_re_c_Apply.py`: Ce module extrait le code pur de la réponse de l'IA et l'écrit dans le fichier cible spécifié par l'utilisateur.

### Fichiers Clés

*   `main.py`: Point d'entrée de l'application **FastAPI**. Lance un serveur web sur le port 8000.
*   `app.py`: Point d'entrée de l'application **Flask**.
*   `Assistant_Dux.py`: Le cerveau du projet, qui orchestre les différentes étapes.
*   `static/index.html`: L'interface utilisateur pour l'application FastAPI.
*   `templates/index.html`: L'interface utilisateur pour l'application Flask.
*   `requirements.txt`: La liste des dépendances Python nécessaires.

## Instructions d'Installation et d'Exécution

### Prérequis

*   Python 3.7+
*   Un éditeur de code (ex: VS Code)
*   Une clé d'API Google Gemini

### 1. Cloner le Projet

(Si le projet est sur un dépôt Git)
```bash
git clone <url_du_depot>
cd Remake-1
```

### 2. Installer les Dépendances

Ouvrez un terminal dans le dossier `Remake-1` et exécutez la commande suivante pour installer les bibliothèques Python nécessaires :

```bash
pip install -r requirements.txt
```

### 3. Configurer la Clé d'API

Le projet nécessite une clé d'API de Google Gemini pour fonctionner. Pour l'instant, la clé est codée en dur dans les fichiers `Expert_Web_Gemini.py` et `QuerytoPromptTransformer.py`.

**Important** : Pour une utilisation sécurisée, il est fortement recommandé de ne pas laisser la clé en clair dans le code. Remplacez la clé `"AIzaSy..."` par votre propre clé.

### 4. Lancer l'Application

Vous avez deux options pour lancer l'application.

#### Option A : Avec FastAPI (Recommandé)

C'est l'approche la plus moderne. Exécutez la commande suivante dans le terminal :

```bash
uvicorn main:app --reload
```

L'application sera accessible à l'adresse [http://127.0.0.1:8000](http://127.0.0.1:8000).

#### Option B : Avec Flask

Exécutez la commande suivante :

```bash
python app.py
```

L'application sera accessible à l'adresse [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Utilisation

1.  Ouvrez votre navigateur et allez à l'adresse de l'application (http://127.0.0.1:8000 pour FastAPI).
2.  Dans le champ **"Chemin du fichier cible"**, entrez le nom du fichier que vous souhaitez créer ou modifier (ex: `mapage.html`).
3.  Dans le champ **"Votre requête"**, décrivez la modification que vous souhaitez apporter (ex: "Crée un titre h1 centré avec le texte 'Bonjour le monde'").
4.  Cliquez sur le bouton **"Appliquer la modification"**.
5.  L'application va traiter votre demande, générer le code et l'appliquer au fichier. La page se rafraîchira et affichera le nouveau contenu du fichier.
"# Assistant_Dux-" 
"# Assistant_Dux-" 
