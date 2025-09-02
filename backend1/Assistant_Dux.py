import os
import sys
from typing import Optional, Dict, Any
import json
from datetime import datetime
import logging # Importez le module logging

# Configurez le logger
logger = logging.getLogger(__name__)

# Import des modules personnalisés
try:
    from QuerytoPromptTransformer import QueryToPromptTransformer
    from Expert_Web_Gemini import generate_web_code
    from Fonction_re_c_Apply import res_Code_Apply
except ImportError as e:
    logger.error(f"❌ Erreur d'import des modules : {e}")
    logger.error("Assurez-vous que tous les fichiers sont dans le même répertoire")
    sys.exit(1)

class AssistantDux:
    """
    Assistant Dux - Orchestrateur principal du système de modification de code web
    
    Coordonne les trois étapes principales :
    1. Transformation de la requête utilisateur en prompt technique (QuerytoPromptTransformer)
    2. Génération du code modifié avec Gemini (Expert_Web_Gemini) 
    3. Application du code dans le fichier cible (Fonction_re_c_Apply)
    """
    
    def __init__(self, default_page_file: str = "Page_file"):
        """
        Initialise l'Assistant Dux
        
        Args:
            default_page_file (str): Fichier par défaut pour les modifications de code
        """
        self.default_page_file = default_page_file
        self.session_id = self._generate_session_id()
        self.history = []
        # NOUVEAU : Dictionnaire pour stocker l'état initial des fichiers
        self._initial_code_state: Dict[str, str] = {} 
        
        logger.info("🤖 Assistant Dux initialisé avec succès")
        logger.info(f"📁 Fichier par défaut : {self.default_page_file}")
        logger.info(f"🆔 Session ID : {self.session_id}")
    
    def _generate_session_id(self) -> str:
        """Génère un ID de session unique basé sur la date et un hachage court."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        # Un hachage simple pour rendre l'ID plus unique
        short_hash = os.urandom(8).hex()[:8] 
        return f"{timestamp}_{short_hash}"

    def create_file_if_not_exists(self, file_path: str) -> bool:
        """
        Crée un fichier avec un contenu HTML de base s'il n'existe pas.
        """
        if not os.path.exists(file_path):
            default_content = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ma Page Web</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }
        h1 {
            color: #0056b3;
        }
    </style>
</head>
<body>
    <h1>Bienvenue sur Ma Page Web</h1>
    <p>Ceci est un paragraphe par défaut.</p>
</body>
</html>"""
            try:
                # Assurez-vous que le répertoire existe avant de créer le fichier
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(default_content)
                logger.info(f"📄 Fichier créé : {file_path}")
                # NOUVEAU : Capture l'état initial du fichier nouvellement créé
                self._initial_code_state[file_path] = default_content
                return True
            except Exception as e:
                logger.error(f"❌ Erreur création fichier {file_path} : {e}")
                return False
        else:
            logger.info(f"📄 Fichier existant : {file_path}")
            return True
    
    def process_user_request(self, user_query: str, target_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Traite la requête de l'utilisateur en orchestrant les étapes de transformation,
        génération et application de code.
        
        Args:
            user_query (str): La requête de l'utilisateur.
            target_file (str, optional): Le chemin du fichier cible à modifier.
                                         Utilise self.default_page_file si non fourni.
                                         
        Returns:
            Dict[str, Any]: Un dictionnaire avec le succès/échec et les messages/résultats.
        """
        current_file = target_file if target_file else self.default_page_file
        start_time = datetime.now()
        
        # S'assurer que le fichier cible existe ou le créer
        if not self.create_file_if_not_exists(current_file):
            return {"success": False, "message": "Impossible d'assurer l'existence du fichier cible."}

        existing_code = ""
        try:
            with open(current_file, "r", encoding="utf-8") as file:
                existing_code = file.read()
            logger.info(f"Code existant lu pour le contexte IA depuis {current_file}")
            # NOUVEAU : Capture l'état initial du fichier si ce n'est pas déjà fait
            if current_file not in self._initial_code_state:
                self._initial_code_state[current_file] = existing_code
                logger.info(f"État initial du fichier '{current_file}' capturé.")
        except Exception as e:
            logger.warning(f"⚠️ Erreur de lecture du fichier {current_file}: {e}. Poursuite sans code existant.")
            # Si le fichier ne peut pas être lu, il n'y a pas d'état initial à capturer
            # et existing_code restera vide.

        # NOUVEAU : Gérer la requête de réinitialisation
        if user_query.strip().lower() == "ramène la page à son état initial":
            logger.info(f"Requête de réinitialisation détectée pour le fichier : {current_file}")
            if current_file in self._initial_code_state:
                initial_content = self._initial_code_state[current_file]
                logger.info("Tentative de restauration du fichier à son état initial.")
                # Appeler directement res_Code_Apply avec le contenu initial
                # res_Code_Apply est conçu pour extraire le HTML d'une chaîne, donc passer l'HTML pur devrait fonctionner.
                success = res_Code_Apply(initial_content, current_file)
                if success:
                    logger.info(f"✅ Fichier '{current_file}' restauré avec succès à son état initial.")
                    self._add_to_history(user_query, True, "Page restaurée à son état initial.", initial_content, start_time)
                    return {"success": True, "message": "Page restaurée à son état initial.", "code_applied": initial_content}
                else:
                    logger.error(f"❌ Échec de la restauration du fichier '{current_file}'.")
                    self._add_to_history(user_query, False, "Échec de la restauration de la page.", "", start_time)
                    return {"success": False, "message": "Échec de la restauration de la page à son état initial."}
            else:
                logger.warning(f"Impossible de restaurer '{current_file}'. Aucun état initial n'a été enregistré.")
                self._add_to_history(user_query, False, "Aucun état initial n'a été enregistré.", "", start_time)
                return {"success": False, "message": "Aucun état initial n'a été enregistré pour cette page."}
        
        # Étape 1: Transformer la requête utilisateur en prompt technique
        query_transformer = QueryToPromptTransformer(api_key=os.getenv("GEMINI_API_KEY"))
        if not query_transformer.model:
            logger.error("❌ API Gemini non configurée pour QueryToPromptTransformer.")
            self._add_to_history(user_query, False, "Erreur API Gemini (Transformer).", "", start_time)
            return {"success": False, "message": "Erreur : La configuration de l'API Gemini a échoué pour la transformation de la requête."}
        
        logger.info("INFO:QuerytoPromptTransformer:✅ API Gemini configurée avec succès pour QueryToPromptTransformer") # Ajout du log INFO pour cohérence
        
        technical_prompt = query_transformer.transform_query(user_query, existing_code)
        if not technical_prompt:
            logger.error("❌ Échec de la transformation de la requête en prompt technique.")
            self._add_to_history(user_query, False, "Échec transformation requête.", "", start_time)
            return {"success": False, "message": "Échec de la transformation de la requête utilisateur en prompt technique."}
        logger.info("✅ Requête transformée en prompt technique.")

        # Étape 2: Générer le code avec Gemini
        generated_code_response = generate_web_code(technical_prompt, current_file) # Passer le chemin du fichier pour Expert_Web_Gemini
        if not generated_code_response:
            logger.error("❌ Échec de la génération du code par Gemini.")
            self._add_to_history(user_query, False, "Échec génération code Gemini.", "", start_time)
            return {"success": False, "message": "Échec de la génération du code par l'expert Gemini."}
        logger.info("✅ Code généré par Gemini.")

        # Étape 3: Appliquer le code au fichier
        try:
            success = res_Code_Apply(generated_code_response, current_file)
            if success:
                logger.info(f"✅ Modification appliquée avec succès au fichier '{current_file}' !")
                self._add_to_history(user_query, True, "Modification appliquée.", generated_code_response, start_time)
                return {"success": True, "message": "Modification appliquée avec succès.", "code_applied": generated_code_response}
            else:
                logger.error(f"❌ Échec de l'application du code généré au fichier.")
                self._add_to_history(user_query, False, "Échec application code.", generated_code_response, start_time)
                return {"success": False, "message": "Échec de l'application du code généré au fichier."}
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'application du code: {e}")
            self._add_to_history(user_query, False, f"Erreur application code: {e}", generated_code_response, start_time)
            return {"success": False, "message": f"Erreur inattendue lors de l'application du code: {e}"}

    def _add_to_history(self, user_query: str, success: bool, message: str, generated_code: str, start_time: datetime) -> None:
        """Ajoute une entrée à l'historique de la session."""
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        self.history.append({
            "timestamp": end_time.isoformat(),
            "user_query": user_query,
            "success": success,
            "message": message,
            "generated_code_preview": generated_code[:200] + "..." if generated_code else "N/A",
            "duration_seconds": duration
        })
        
    def display_summary(self) -> None:
        """Affiche un résumé de la session"""
        logger.info(f"\n{'='*60}")
        logger.info("📊 RÉSUMÉ DE LA SESSION ASSISTANT DUX")
        logger.info(f"{'='*60}")
        logger.info(f"🆔 Session ID : {self.session_id}")
        logger.info(f"📁 Fichier par défaut : {self.default_page_file}")
        logger.info(f"📈 Nombre de requêtes traitées : {len(self.history)}")
        
        if self.history:
            successful = sum(1 for h in self.history if h["success"])
            logger.info(f"✅ Requêtes réussies : {successful}")
            logger.info(f"❌ Requêtes échouées : {len(self.history) - successful}")
            
            logger.info(f"\n📋 Dernières requêtes :")
            for i, entry in enumerate(self.history[-3:], 1):  # Affiche les 3 dernières requêtes
                status = "✅" if entry["success"] else "❌"
                time = entry["timestamp"][:19].replace("T", " ")
                query_preview = entry["user_query"][:50] + "..." if len(entry["user_query"]) > 50 else entry["user_query"]
                logger.info(f"  {i}. [{time}] {status} \"{query_preview}\" - Durée: {entry['duration_seconds']:.2f}s")