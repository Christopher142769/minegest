import google.generativeai as genai
import os
from typing import Optional

class QueryToPromptTransformer:
    """
    Classe pour transformer les requêtes utilisateur en prompts précis 
    en utilisant l'API Gemini 2.0
    """
    
    def __init__(self, api_key: str):
        """
        Initialise le transformateur avec la clé API Gemini
        
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
            # Utiliser Gemini 2.0 Flash pour des réponses rapides
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            print("✅ API Gemini configurée avec succès")
        except Exception as e:
            print(f"❌ Erreur lors de la configuration de l'API Gemini : {e}")
    
    def transform_query(self, user_query: str, code_context: str = "") -> Optional[str]:
        """
        Transforme une requête utilisateur en prompt précis pour modification de code
        
        Args:
            user_query (str): Requête de l'utilisateur
            code_context (str): Contexte du code existant (optionnel)
            
        Returns:
            str: Prompt précis pour le LLM de génération de code
        """
        
        # Template de prompt amélioré pour maintenir la qualité et l...
        enhanced_prompt = f"""
Tu es un développeur web expert en HTML, CSS et JavaScript. Ton objectif est de modifier le code HTML existant selon les instructions de l'utilisateur.

CONTEXTE ET RÔLE :
- Tu recevras une requête utilisateur décrivant les modifications à apporter.
- Tu auras également le code HTML/CSS/JS existant de la page.
- Ton rôle est de fournir le code HTML COMPLET ET MIS À JOUR, intégrant toutes les modifications demandées.
- Le code doit être fonctionnel et respecter les bonnes pratiques web.

CONSIGNES DE GÉNÉRATION DE CODE :
1.  **Génération du code HTML/CSS/JS complet** : Assure-toi de générer un code HTML complet, avec tous les éléments nécessaires et une mise en page correcte.
2.  **Encapsulation stricte dans les balises [CODE_START] et [CODE_END]** : Le code HTML/CSS/JS modifié doit être *entièrement* encadré par ces balises. Absolument *aucune autre explication ou texte conversationnel* ne doit apparaître en dehors de ces balises.
    Exemple de format : `[CODE_START] <!DOCTYPE html>...</html> [CODE_END]`
3.  **Explications et commentaires DANS le code** : Si tu dois fournir une brève explication des modifications ou des commentaires, **intègre-les directement sous forme de commentaires HTML ()** à l'intérieur du bloc de code généré (entre [CODE_START] et [CODE_END]).
4.  **Séparation du CSS et du JavaScript** : Si des styles ou des scripts sont ajoutés, ils doivent être intégrés dans la structure HTML appropriée, en respectant les conventions de développement (balises `<style>` dans le `<head>` pour le CSS, balises `<script>` avant la fermeture du `<body>` pour le JavaScript).

INSTRUCTIONS TECHNIQUES REÇUES :
{user_query}

CODE EXISTANT À MODIFIER :
{code_context if code_context else "Aucun code existant - Créer depuis zéro"}

Génère maintenant le code selon ces spécifications, en te conformant strictement à l'encapsulation `[CODE_START]...[CODE_END]` :
"""
        return enhanced_prompt