import google.generativeai as genai
import os
from typing import Optional
import logging # Import the logging module

logger = logging.getLogger(__name__)

class GeminiWebExpert:
    """
    Classe pour utiliser Gemini comme expert en développement web
    """
    
    def __init__(self, api_key: str):
        """
        Initialise l'expert Gemini avec la clé API
        
        Args:
            api_key (str): Clé API Gemini
        """
        self.api_key = api_key
        self.model = None
        self.configure_api()
    
    def configure_api(self):
        """Configure l'API Gemini avec la clé fournie"""
        try:
            genai.configure(api_key=self.api_key)
            # Utiliser Gemini 2.0 Flash pour la génération de code
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("✅ API Gemini configurée avec succès pour Expert_Web_Gemini")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la configuration de l'API Gemini (Expert_Web_Gemini) : {e}")
    
    def _build_expert_message(self, prompt: str, existing_code: str = "") -> list:
        """
        Construit le message à envoyer à Gemini pour la génération de code.
        """
        
        # Le contenu de ce prompt doit être adapté à la tâche de génération/modification de code
        # en se basant sur le prompt technique généré par QueryToPromptTransformer.
        # Il inclut également le code existant pour que Gemini puisse le modifier.
        
        message_parts = [
            """Tu es un expert en développement web (HTML, CSS, JavaScript) avec une connaissance approfondie des bonnes pratiques et de la compatibilité navigateur.
            Ton rôle est de générer ou de modifier du code web en te basant sur un prompt technique très précis.

            Instructions pour générer le code :
            1.  **Génère un code HTML, CSS, JavaScript COMPLET et VALIDE**. N'envoie pas seulement les extraits de code, mais une page web fonctionnelle si le prompt demande une création ou si le contexte existant est fragmenté.
            2.  **Encapsule TOUT le code généré ou modifié** (HTML, CSS, JS) dans une seule paire de balises `[CODE_START]` et `[CODE_END]`. NE mets RIEN d'autre entre ces balises que le code.
            3.  **Intègre les styles CSS** dans une balise `<style>` placée dans le `<head>` du document HTML.
            4.  **Intègre les scripts JavaScript** dans une balise `<script>` placée juste avant la balise de fermeture `</body>`.
            5.  **Ne crée PAS de nouveaux fichiers** (CSS ou JS externes). Tout doit être intégré directement dans le fichier HTML unique.
            6.  **Respecte le prompt technique à la lettre**. Si le prompt est ambigu, fais une interprétation logique mais reste dans le cadre technique.
            7.  **Fournis une brève explication** de tes modifications *avant* le bloc `[CODE_START]`.
            8.  **Ajoute des commentaires dans le code HTML/CSS/JS** pour expliquer les parties modifiées ou ajoutées et pourquoi ces changements ont été faits.

            Prompt Technique :
            """ + prompt + """

            Code HTML, CSS, JavaScript EXISTANT (à modifier ou à utiliser comme base si applicable) :
            """ + (existing_code if existing_code else "Aucun code existant.") + """

            Ton objectif est de répondre avec :
            - Une brève explication textuelle de ce que tu as fait.
            - Le bloc de code HTML, CSS, JavaScript complet et valide, encadré par `[CODE_START]` et `[CODE_END]`.
            - Des commentaires clairs dans le code pour expliquer les modifications.
            """
        ]
        
        return [{"role": "user", "parts": message_parts}]

    def generate_code(self, prompt: str, existing_code: str = "") -> Optional[str]:
        """
        Génère du code modifié avec Gemini
        
        Args:
            prompt (str): Prompt technique précis (venant du transformateur Gemini)
            existing_code (str): Code existant à modifier (contenu de Page_file)
            
        Returns:
            str: Réponse complète de Gemini avec le code
        """
        
        # Construction du message pour Gemini
        gemini_message = self._build_expert_message(prompt, existing_code)
        
        try:
            if not self.model:
                logger.error("❌ Modèle Gemini non configuré. Impossible de générer le code.")
                return None

            response = self.model.generate_content(gemini_message)
            
            if response and response.candidates:
                logger.info("✅ Code généré avec succès par Gemini.")
                return response.candidates[0].content.parts[0].text
            else:
                logger.warning("⚠️ Aucune réponse valide reçue du modèle Gemini pour la génération de code.")
                return None
        except Exception as e:
            logger.error(f"❌ Erreur lors de la communication avec Gemini pour la génération de code : {e}")
            return None

def generate_web_code(technical_prompt: str, page_file_path: str) -> Optional[str]:
    """
    Fonction principale pour générer du code web avec Gemini
    
    Args:
        technical_prompt (str): Prompt technique précis (venant du transformateur)
        page_file_path (str): Chemin vers le fichier de code existant
        
    Returns:
        str: Réponse complète de Gemini avec le code
    """
    
    # Clé API Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
    if not GEMINI_API_KEY:
        logger.error("❌ La clé API Gemini n'est pas définie dans l'environnement. Impossible de créer l'expert.")
        return None
    
    # Créer l'expert Gemini
    expert = GeminiWebExpert(GEMINI_API_KEY)
    
    if not expert.model:
        logger.error("❌ Impossible d'initialiser l'expert Gemini")
        return None
    
    # Lire le code existant depuis Page_file
    existing_code = ""
    if os.path.exists(page_file_path):
        try:
            with open(page_file_path, "r", encoding="utf-8") as file:
                existing_code = file.read()
            logger.info(f"✅ Code existant lu depuis {page_file_path}")
        except Exception as e:
            logger.warning(f"⚠️ Erreur lecture fichier {page_file_path}: {e}")
            logger.warning("Continuation sans le code existant.")
    else:
        logger.info(f"⚠️ Fichier {page_file_path} non trouvé - Génération depuis zéro")
    
    # Génération du code avec Gemini
    logger.info("🔄 Génération du code en cours avec Gemini...")
    response = expert.generate_code(technical_prompt, existing_code)
    
    if response:
        logger.info("✅ Réponse de Gemini reçue.")
        return response
    else:
        logger.error("❌ Aucune réponse de code généré par Gemini.")
        return None