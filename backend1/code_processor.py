# code_processor.py
import re
import os
from typing import Optional

"""
Ce module gère le traitement final de la réponse de l'IA, 
notamment l'extraction du code et son application au fichier cible.
"""

def extract_code_from_response(llm_response: str) -> Optional[str]:
    """
    Extrait le bloc de code à partir de la réponse du LLM en utilisant les
    marqueurs [CODE_START] et [CODE_END].

    Args:
        llm_response: La réponse textuelle complète du modèle de langage.

    Returns:
        Le code extrait, ou None si les marqueurs ne sont pas trouvés.
    """
    try:
        # Utilise une expression régulière pour trouver le contenu entre les marqueurs.
        # re.DOTALL permet au '.' de correspondre également aux nouvelles lignes.
        match = re.search(r'\[CODE_START\](.*)\[CODE_END\]', llm_response, re.DOTALL)
        if match:
            # .group(1) capture le contenu entre les parenthèses dans le pattern
            code = match.group(1).strip()
            print(f"✅ Code extrait avec succès ({len(code)} caractères).")
            return code
        else:
            print("❌ Erreur : Marqueurs [CODE_START]/[CODE_END] non trouvés dans la réponse.")
            # En cas d'échec, on tente une extraction "brute" du HTML pour la rétro-compatibilité
            html_pattern = r'<!DOCTYPE html>.*</html>'
            html_match = re.search(html_pattern, llm_response, re.DOTALL | re.IGNORECASE)
            if html_match:
                code = html_match.group(0).strip()
                print("⚠️ Avertissement : Extraction effectuée sur la base des balises HTML, car les marqueurs étaient absents.")
                return code
            print("❌ Échec final de l'extraction du code.")
            return None
    except Exception as e:
        print(f"❌ Erreur inattendue lors de l'extraction du code : {e}")
        return None

def apply_code_to_file(code: str, target_file_path: str) -> bool:
    """
    Écrit le code fourni dans le fichier cible, écrasant son contenu.

    Args:
        code: Le code à écrire dans le fichier.
        target_file_path: Le chemin absolu du fichier à modifier.

    Returns:
        True si l'écriture a réussi, False sinon.
    """
    if not code:
        print("❌ Opération annulée : Aucun code à appliquer.")
        return False
        
    try:
        # S'assurer que le répertoire parent existe
        parent_dir = os.path.dirname(target_file_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
            
        with open(target_file_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"💾 Code appliqué avec succès au fichier : {target_file_path}")
        return True
    except IOError as e:
        print(f"❌ Erreur d'E/S lors de l'écriture dans le fichier '{target_file_path}': {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue lors de l'application du code : {e}")
        return False
