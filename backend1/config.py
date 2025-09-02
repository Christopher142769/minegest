import os
from dotenv import load_dotenv
import logging # Import the logging module

logger = logging.getLogger(__name__)

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()

# Récupérer la clé API Gemini depuis les variables d'environnement
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Vérifier si la clé API est définie
if not GEMINI_API_KEY:
    logger.critical("La clé API Gemini n'est pas définie. Veuillez créer un fichier .env et y ajouter GEMINI_API_KEY=VOTRE_CLE")
    raise ValueError("La clé API Gemini n'est pas définie. Veuillez créer un fichier .env et y ajouter GEMINI_API_KEY=VOTRE_CLE")

logger.info("Configuration chargée avec succès.")