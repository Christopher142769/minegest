# Fonction_re_c_Apply.py (Version corrigée - Pattern extraction amélioré + Reporting avancé)
import re
import os
import traceback
import json
from datetime import datetime 

def res_Code_Apply(answer_LLM, page_file_path, texte_a_supprimer=None, enable_reporting=True):
    """
    Extrait le code HTML de la réponse LLM en utilisant une stratégie robuste (balises personnalisées,
    balises Markdown, ou délimiteurs HTML standard)
    et remplace le bloc HTML complet existant dans le fichier spécifié.
    
    Args:
        answer_LLM (str): Réponse du LLM contenant le code encapsulé.
        page_file_path (str): Chemin vers le fichier HTML à modifier.
        texte_a_supprimer (str, optional): Non utilisé.
        enable_reporting (bool): Active/désactive le système de reporting détaillé.
    
    Returns:
        bool: True si succès, False sinon.
    """
    
    # Initialisation du système de reporting
    start_time = datetime.now()
    report_data = {
        "function_name": "res_Code_Apply",
        "start_time": start_time.isoformat(),
        "page_file_path": page_file_path,
        "answer_llm_length": len(answer_LLM) if answer_LLM else 0,
        "steps": [],
        "success": False,
        "error_details": None,
        "performance_metrics": {}
    }
    
    def add_step(step_name, success, details, duration=0):
        """Ajoute une étape au rapport"""
        if enable_reporting:
            report_data["steps"].append({
                "step_name": step_name,
                "success": success,
                "details": details,
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            })
    
    def save_report():
        """Sauvegarde le rapport final"""
        if enable_reporting:
            end_time = datetime.now()
            report_data["end_time"] = end_time.isoformat()
            report_data["total_duration"] = (end_time - start_time).total_seconds()
            
            # Générer un nom de fichier unique pour le rapport
            timestamp = end_time.strftime("%Y%m%d_%H%M%S")
            report_filename = f"res_Code_Apply_report_{timestamp}.json"
            
            try:
                with open(report_filename, 'w', encoding='utf-8') as f:
                    json.dump(report_data, f, indent=2, ensure_ascii=False)
                print(f"📊 Rapport détaillé sauvegardé : {report_filename}")
            except Exception as e:
                print(f"⚠️ Erreur lors de la sauvegarde du rapport : {e}")
    
    print(f"\n--- DÉBOGAGE : res_Code_Apply Démarré ---")
    print(f"DEBUG: page_file_path reçu: '{page_file_path}'")
    add_step("Initialisation", True, f"Fonction démarrée avec fichier: {page_file_path}")
    
    extracted_raw_code_candidate = "" # Stocke le bloc de code potentiel après la première étape d'extraction
    
    # --- Stratégie d'extraction robuste ---
    code_start_tag = "[CODE_START]"
    code_end_tag = "[CODE_END]"
    
    # 1. Priorité 1: Chercher un bloc Markdown qui contient du HTML (avec ou sans balises CODE_START)
    # Pattern flexible pour capturer ```html...``` ou ```...``` contenant du HTML
    markdown_patterns = [
        # Pattern 1: ```html [CODE_START]...HTML...[CODE_END]``` (avec espaces et sauts de ligne)
        r'```html\s*\[CODE_START\](.*?)\[CODE_END\]\s*```',
        # Pattern 2: ```html suivi de [CODE_START]...HTML...[CODE_END] puis ``` (plus flexible)
        r'```(?:html)?\s*\[CODE_START\](.*?)\[CODE_END\]\s*```',
        # Pattern 3: ```html...HTML...``` (sans balises CODE_START/END)
        r'```(?:html)?\s*(<!DOCTYPE html>.*?</html>)\s*```',
        # Pattern 4: ```html suivi de HTML direct (très permissif)
        r'```html\s*(.*?)\s*```',
        # Pattern 5: ``` générique contenant HTML
        r'```\s*(<!DOCTYPE html>.*?</html>)\s*```',
        # Pattern 6: Bloc Markdown avec [CODE_START] à l'intérieur (plus permissif)
        r'```(?:[a-zA-Z0-9]*)\s*(.*?\[CODE_START\].*?\[CODE_END\].*?)\s*```',
        # Pattern 7: Nouvelle stratégie - recherche de ```html suivi de tout jusqu'à ```
        r'```html\s*([\s\S]*?)\s*```'
    ]
    
    pattern_found = False
    extraction_start_time = datetime.now()
    
    for i, pattern in enumerate(markdown_patterns):
        match = re.search(pattern, answer_LLM, re.DOTALL | re.IGNORECASE)
        if match:
            print(f"DEBUG: Pattern Markdown {i+1} trouvé dans la réponse.")
            add_step(f"Pattern Markdown {i+1}", True, f"Pattern trouvé: {pattern[:50]}...")
            extracted_content = match.group(1).strip()
            
            # Si le contenu contient [CODE_START] et [CODE_END], extraire ce qui est entre
            if code_start_tag in extracted_content and code_end_tag in extracted_content:
                start_idx = extracted_content.find(code_start_tag)
                end_idx = extracted_content.find(code_end_tag)
                if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                    extracted_raw_code_candidate = extracted_content[start_idx + len(code_start_tag):end_idx].strip()
                    print(f"DEBUG: Contenu extrait entre [CODE_START] et [CODE_END] du pattern Markdown {i+1}.")
                    add_step("Extraction CODE_START/END", True, f"Contenu extrait entre balises, longueur: {len(extracted_raw_code_candidate)}")
                else:
                    extracted_raw_code_candidate = extracted_content
                    print(f"DEBUG: Balises trouvées mais extraction échouée, utilisation du contenu complet du pattern Markdown {i+1}.")
                    add_step("Extraction CODE_START/END", False, "Balises trouvées mais extraction échouée")
            else:
                extracted_raw_code_candidate = extracted_content
                print(f"DEBUG: Pas de balises CODE_START/END, utilisation du contenu complet du pattern Markdown {i+1}.")
                add_step("Extraction directe", True, f"Contenu extrait directement, longueur: {len(extracted_raw_code_candidate)}")
            
            pattern_found = True
            break
    
    extraction_duration = (datetime.now() - extraction_start_time).total_seconds()
    report_data["performance_metrics"]["extraction_duration"] = extraction_duration
    
    # 2. Priorité 2: Balises [CODE_START] et [CODE_END] directement dans la réponse (sans Markdown)
    if not pattern_found:
        print("DEBUG: Aucun pattern Markdown trouvé. Recherche des balises [CODE_START]/[CODE_END] directement.")
        add_step("Recherche balises directes", False, "Aucun pattern Markdown trouvé")
        start_index_custom = answer_LLM.find(code_start_tag)
        end_index_custom = answer_LLM.find(code_end_tag)
        
        if start_index_custom != -1 and end_index_custom != -1 and start_index_custom < end_index_custom:
            extracted_raw_code_candidate = answer_LLM[start_index_custom + len(code_start_tag):end_index_custom].strip()
            print(f"DEBUG: Contenu extrait via [CODE_START]/[CODE_END] directement.")
            add_step("Extraction balises directes", True, f"Contenu extrait via balises, longueur: {len(extracted_raw_code_candidate)}")
            pattern_found = True
        else:
            add_step("Extraction balises directes", False, "Balises CODE_START/END non trouvées ou mal formées")
    
    # 3. Priorité 3: Recherche directe d'un document HTML complet
    if not pattern_found:
        print("DEBUG: Recherche directe d'un document HTML dans toute la réponse.")
        html_document_match = re.search(r'(<!DOCTYPE html>.*?</html>)', answer_LLM, re.DOTALL | re.IGNORECASE)
        if html_document_match:
            extracted_raw_code_candidate = html_document_match.group(1).strip()
            print("DEBUG: Document HTML trouvé directement dans la réponse.")
            add_step("Recherche HTML directe", True, f"Document HTML trouvé, longueur: {len(extracted_raw_code_candidate)}")
            pattern_found = True
        else:
            add_step("Recherche HTML directe", False, "Aucun document HTML complet trouvé")
    
    # 4. Fallback: Si rien n'est trouvé, utiliser toute la réponse
    if not pattern_found:
        print("DEBUG: Aucun pattern spécifique trouvé. Utilisation de toute la réponse comme candidat.")
        add_step("Fallback complet", True, f"Utilisation de toute la réponse, longueur: {len(answer_LLM.strip())}")
        extracted_raw_code_candidate = answer_LLM.strip()

    print(f"DEBUG: Candidat brut extrait (premiers 200 caractères): '{extracted_raw_code_candidate[:200]}...'")

    # --- Nettoyage et validation finale ---
    # Nettoyer les balises résiduelles
    extracted_raw_code_candidate = extracted_raw_code_candidate.replace(code_start_tag, "").replace(code_end_tag, "").strip()
    
    # Chercher le document HTML final dans le candidat nettoyé
    new_html_content = ""
    
    # Pattern pour trouver un document HTML complet (plus flexible)
    html_patterns = [
        r'(<!DOCTYPE html>.*?</html>)',  # Avec DOCTYPE
        r'(<html[^>]*>.*?</html>)',      # Sans DOCTYPE mais avec balise html
        r'(<HTML[^>]*>.*?</HTML>)'       # Version majuscules
    ]
    
    html_found = False
    for i, html_pattern in enumerate(html_patterns):
        html_match = re.search(html_pattern, extracted_raw_code_candidate, re.DOTALL | re.IGNORECASE)
        if html_match:
            new_html_content = html_match.group(1).strip()
            print(f"DEBUG: Document HTML final extrait via pattern HTML {i+1}.")
            html_found = True
            break
    
    # Si aucun pattern HTML spécifique n'est trouvé, mais que le candidat semble contenir du HTML
    if not html_found and ('<html' in extracted_raw_code_candidate.lower() or '<!doctype' in extracted_raw_code_candidate.lower()):
        print("DEBUG: Tentative de nettoyage et d'extraction manuelle du HTML...")
        # Chercher le début et la fin du document HTML
        lines = extracted_raw_code_candidate.split('\n')
        html_lines = []
        in_html = False
        
        for line in lines:
            line_lower = line.lower().strip()
            if not in_html and ('<!doctype html>' in line_lower or '<html' in line_lower):
                in_html = True
                html_lines.append(line)
            elif in_html:
                html_lines.append(line)
                if '</html>' in line_lower:
                    break
        
        if html_lines:
            new_html_content = '\n'.join(html_lines).strip()
            print(f"DEBUG: Document HTML extrait manuellement.")
            html_found = True
    
    # Stratégie finale de fallback : extraction plus agressive du HTML
    if not html_found and extracted_raw_code_candidate:
        print("DEBUG: Tentative d'extraction HTML aggressive...")
        # Chercher n'importe quelle balise HTML dans le candidat
        if re.search(r'</?html[^>]*>', extracted_raw_code_candidate, re.IGNORECASE):
            # Extraire tout depuis la première balise html jusqu'à la dernière
            html_start = re.search(r'<html[^>]*>', extracted_raw_code_candidate, re.IGNORECASE)
            html_end = re.search(r'</html>', extracted_raw_code_candidate, re.IGNORECASE)
            
            if html_start and html_end:
                new_html_content = extracted_raw_code_candidate[html_start.start():html_end.end()]
                print(f"DEBUG: Document HTML extrait par recherche agressive.")
                html_found = True
            elif html_start:
                # Si pas de balise de fermeture, prendre tout depuis html
                new_html_content = extracted_raw_code_candidate[html_start.start():]
                print(f"DEBUG: Document HTML partiel extrait (sans balise de fermeture).")
                html_found = True
    
    if not html_found:
        print(f"ERROR:Fonction_re_c_Apply:❌ Aucun bloc de code HTML valide (<!DOCTYPE html> ou <html>) trouvé dans la réponse du modèle.")
        print(f"DEBUG: Contenu de answer_LLM:\n{repr(answer_LLM)}")
        print(f"DEBUG: Candidat extrait après nettoyage:\n{repr(extracted_raw_code_candidate)}")
        
        report_data["success"] = False
        report_data["error_details"] = "Aucun bloc HTML valide trouvé"
        add_step("Validation HTML finale", False, "Aucun bloc HTML valide trouvé dans tous les candidats")
        save_report()
        
        print(f"--- DÉBOGAGE : res_Code_Apply Terminé (Échec Extraction HTML) ---\n")
        return False
        
    # Vérifier si le nouveau code HTML est vide
    if not new_html_content.strip():
        print(f"ERROR:Fonction_re_c_Apply:❌ Le nouveau code HTML extrait est vide après nettoyage.")
        report_data["success"] = False
        report_data["error_details"] = "Code HTML extrait vide"
        add_step("Validation contenu HTML", False, "Le code HTML extrait est vide")
        save_report()
        return False
    
    add_step("Validation contenu HTML", True, f"Code HTML valide extrait, longueur: {len(new_html_content)}")
    print(f"DEBUG: Longueur du nouveau code HTML final: {len(new_html_content)} caractères.")
    print(f"DEBUG: Début du nouveau code HTML final: '{new_html_content[:100]}...'")
    print(f"DEBUG: Fin du nouveau code HTML final: '...{new_html_content[-100:]}'")

    # --- Application du code au fichier ---
    file_ops_start_time = datetime.now()
    
    if not os.path.exists(page_file_path):
        print(f"ERROR:Fonction_re_c_Apply:❌ Le fichier cible n'existe pas : {page_file_path}")
        report_data["success"] = False
        report_data["error_details"] = f"Fichier cible inexistant: {page_file_path}"
        add_step("Vérification fichier cible", False, f"Fichier inexistant: {page_file_path}")
        save_report()
        return False
    
    add_step("Vérification fichier cible", True, f"Fichier existe: {page_file_path}")
    
    try:
        with open(page_file_path, 'r', encoding='utf-8') as f:
            existing_file_content = f.read()
        print(f"DEBUG: Contenu du fichier existant lu avec succès : {page_file_path}")
        add_step("Lecture fichier existant", True, f"Fichier lu, longueur: {len(existing_file_content)}")
    except Exception as e:
        print(f"ERROR:Fonction_re_c_Apply:❌ Erreur lors de la lecture du fichier existant '{page_file_path}': {e}")
        report_data["success"] = False
        report_data["error_details"] = f"Erreur lecture fichier: {str(e)}"
        add_step("Lecture fichier existant", False, f"Erreur: {str(e)}")
        save_report()
        return False

    # Patterns de remplacement flexibles
    replacement_patterns = [
        r'(<!DOCTYPE html>.*?</html>)',  # Avec DOCTYPE
        r'(<html[^>]*>.*?</html>)'       # Sans DOCTYPE
    ]
    
    modified_file_content = existing_file_content
    replacement_made = False
    
    for i, repl_pattern in enumerate(replacement_patterns):
        if re.search(repl_pattern, existing_file_content, re.DOTALL | re.IGNORECASE):
            modified_file_content = re.sub(
                repl_pattern, 
                new_html_content, 
                existing_file_content, 
                flags=re.DOTALL | re.IGNORECASE, 
                count=1
            )
            print(f"DEBUG: Remplacement effectué avec le pattern {i+1}.")
            replacement_made = True
            break

    if not replacement_made or existing_file_content == modified_file_content:
        print(f"WARNING:Fonction_re_c_Apply:⚠️ Aucune modification n'a été appliquée au fichier cible. "
              f"Le pattern HTML n'a peut-être pas été trouvé dans le fichier existant, "
              f"ou le nouveau code est identique à l'ancien.")
        add_step("Remplacement HTML", False, "Aucune modification appliquée - pattern non trouvé ou contenu identique")
        
        # Fallback: remplacer tout le contenu du fichier par le nouveau HTML
        if new_html_content.strip():
            print(f"DEBUG: Tentative de remplacement complet du contenu du fichier.")
            modified_file_content = new_html_content
            add_step("Remplacement complet fallback", True, "Remplacement complet du contenu du fichier")

    file_ops_duration = (datetime.now() - file_ops_start_time).total_seconds()
    report_data["performance_metrics"]["file_operations_duration"] = file_ops_duration

    try:
        target_dir = os.path.dirname(page_file_path)
        if target_dir and not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
            print(f"DEBUG: Répertoire parent créé : {target_dir}")
            add_step("Création répertoire", True, f"Répertoire créé: {target_dir}")
        
        write_start_time = datetime.now()
        with open(page_file_path, 'w', encoding='utf-8') as f:
            f.write(modified_file_content)
        write_duration = (datetime.now() - write_start_time).total_seconds()
        
        report_data["success"] = True
        report_data["performance_metrics"]["file_write_duration"] = write_duration
        add_step("Écriture fichier final", True, f"Fichier écrit avec succès, durée: {write_duration:.3f}s")
        
        print(f"✅ Code appliqué et fichier mis à jour avec succès dans {page_file_path}")
        print(f"--- DÉBOGAGE : res_Code_Apply Terminé (Succès) ---\n")
        
        save_report()
        return True
        
    except Exception as e:
        print(f"ERROR:Fonction_re_c_Apply:❌ Erreur lors de l'écriture dans le fichier '{page_file_path}': {e}")
        traceback.print_exc()
        
        report_data["success"] = False
        report_data["error_details"] = f"Erreur écriture fichier: {str(e)}"
        add_step("Écriture fichier final", False, f"Erreur: {str(e)}")
        save_report()
        
        return False