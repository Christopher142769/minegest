#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Test Complet pour l'Assistant Dux
Teste tous les composants et l'orchestration complète
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import Dict, Any, List

# Import de l'Assistant Dux
try:
    from Assistant_Dux import AssistantDux, quick_process
    print("✅ Import Assistant Dux réussi")
except ImportError as e:
    print(f"❌ Erreur d'import Assistant Dux : {e}")
    sys.exit(1)

# Import des modules individuels pour tests
try:
    from QuerytoPromptTransformer import transform_user_query
    from Expert_Web_Gemini import generate_web_code
    from Fonction_re_c_Apply import res_Code_Apply
    print("✅ Import modules individuels réussi")
except ImportError as e:
    print(f"❌ Erreur d'import modules : {e}")
    sys.exit(1)

class TestAssistantDux:
    """Classe de test complète pour l'Assistant Dux"""
    
    def __init__(self):
        self.test_results = []
        self.test_files = []
        self.start_time = datetime.now()
        
        print("🧪 INITIALISATION DES TESTS ASSISTANT DUX")
        print("=" * 60)
    
    def log_test(self, test_name: str, success: bool, details: str = "", duration: float = 0):
        """Enregistre un résultat de test"""
        result = {
            "test_name": test_name,
            "success": success,
            "details": details,
            "duration": duration,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name} ({duration:.2f}s)")
        if details:
            print(f"   📝 {details}")
    
    def create_test_file(self, filename: str, content: str = None) -> str:
        """Crée un fichier de test temporaire"""
        if content is None:
            content = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page de Test</title>
</head>
<body>
    <h1>Page de Test</h1>
    <p>Contenu initial pour les tests.</p>
</body>
</html>"""
        
        try:
            with open(filename, "w", encoding="utf-8") as f:
                f.write(content)
            self.test_files.append(filename)
            return filename
        except Exception as e:
            print(f"❌ Erreur création fichier {filename}: {e}")
            return None
    
    def cleanup_test_files(self):
        """Nettoie les fichiers de test"""
        for filename in self.test_files:
            try:
                if os.path.exists(filename):
                    os.remove(filename)
                    print(f"🗑️ Fichier supprimé : {filename}")
            except Exception as e:
                print(f"⚠️ Erreur suppression {filename}: {e}")
    
    def test_individual_modules(self):
        """Teste chaque module individuellement"""
        print("\n" + "="*60)
        print("🔧 TEST DES MODULES INDIVIDUELS")
        print("="*60)
        
        # Test 1: QuerytoPromptTransformer
        start_time = time.time()
        try:
            test_query = "Ajoute un bouton rouge centré sur la page"
            prompt = transform_user_query(test_query)
            
            success = prompt is not None and len(prompt) > 50
            details = f"Prompt généré: {len(prompt) if prompt else 0} caractères"
            
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("QuerytoPromptTransformer", success, details, duration)
        
        # Test 2: Expert_Web_Gemini (avec fichier de test)
        start_time = time.time()
        test_file = self.create_test_file("test_gemini.html")
        
        try:
            if prompt:  # Utiliser le prompt du test précédent
                code_response = generate_web_code(prompt, test_file)
                success = (code_response is not None and 
                          "[CODE_START]" in code_response and 
                          "[CODE_END]" in code_response)
                details = f"Réponse générée: {len(code_response) if code_response else 0} caractères"
            else:
                success = False
                details = "Pas de prompt disponible pour le test"
                
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Expert_Web_Gemini", success, details, duration)
        
        # Test 3: Fonction_re_c_Apply
        start_time = time.time()
        try:
            if success and code_response:  # Si le test précédent a réussi
                apply_success = res_Code_Apply(code_response, test_file)
                success = apply_success
                details = f"Application réussie: {apply_success}"
            else:
                success = False
                details = "Pas de code à appliquer"
                
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Fonction_re_c_Apply", success, details, duration)
    
    def test_assistant_dux_initialization(self):
        """Teste l'initialisation de l'Assistant Dux"""
        print("\n" + "="*60)
        print("🤖 TEST INITIALISATION ASSISTANT DUX")
        print("="*60)
        
        start_time = time.time()
        try:
            dux = AssistantDux("test_init.html")
            
            success = (dux is not None and 
                      hasattr(dux, 'session_id') and 
                      hasattr(dux, 'default_page_file') and
                      hasattr(dux, 'history'))
            
            details = f"Session ID: {dux.session_id}, Fichier: {dux.default_page_file}"
            
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Initialisation AssistantDux", success, details, duration)
        
        return dux if success else None
    
    def test_file_creation(self, dux):
        """Teste la création automatique de fichiers"""
        print("\n" + "="*40)
        print("📄 TEST CRÉATION DE FICHIERS")
        print("="*40)
        
        start_time = time.time()
        test_file = "test_creation.html"
        
        try:
            # S'assurer que le fichier n'existe pas
            if os.path.exists(test_file):
                os.remove(test_file)
            
            success = dux.create_file_if_not_exists(test_file)
            file_exists = os.path.exists(test_file)
            
            success = success and file_exists
            details = f"Fichier créé: {file_exists}"
            
            if file_exists:
                self.test_files.append(test_file)
                
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Création de fichier", success, details, duration)
    
    def test_complete_workflow(self, dux):
        """Teste le workflow complet"""
        print("\n" + "="*60)
        print("🔄 TEST WORKFLOW COMPLET")
        print("="*60)
        
        test_queries = [
            {
                "query": "Ajoute un bouton rouge centré avec le texte 'Cliquer ici'",
                "expected_elements": ["button", "red", "center"]
            },
            {
                "query": "Change la couleur de fond de la page en bleu clair",
                "expected_elements": ["background", "blue", "body"]
            },
            {
                "query": "Ajoute un titre h1 avec le texte 'Ma Page Web'",
                "expected_elements": ["h1", "titre", "Ma Page Web"]
            }
        ]
        
        for i, test_case in enumerate(test_queries, 1):
            print(f"\n🧪 Test Workflow {i}/{len(test_queries)}")
            print("-" * 40)
            
            start_time = time.time()
            test_file = f"test_workflow_{i}.html"
            
            try:
                # Créer le fichier de test
                self.create_test_file(test_file)
                
                # Traiter la requête complète
                result = dux.process_user_request(test_case["query"], test_file)
                
                success = result["success"]
                details = result["final_message"]
                
                # Vérifications supplémentaires
                if success:
                    # Vérifier que le fichier a été modifié
                    if os.path.exists(test_file):
                        with open(test_file, "r", encoding="utf-8") as f:
                            content = f.read()
                        details += f" | Taille finale: {len(content)} caractères"
                    
            except Exception as e:
                success = False
                details = f"Exception: {str(e)}"
            
            duration = time.time() - start_time
            self.log_test(f"Workflow Complet {i}", success, details, duration)
    
    def test_quick_process_function(self):
        """Teste la fonction quick_process"""
        print("\n" + "="*40)
        print("⚡ TEST FONCTION QUICK_PROCESS")
        print("="*40)
        
        start_time = time.time()
        test_file = "test_quick.html"
        
        try:
            success = quick_process(
                "Ajoute un paragraphe avec le texte 'Test quick process'", 
                test_file
            )
            
            # Vérifier que le fichier existe et contient du contenu
            file_exists = os.path.exists(test_file)
            if file_exists:
                self.test_files.append(test_file)
                with open(test_file, "r", encoding="utf-8") as f:
                    content = f.read()
                details = f"Fichier créé: {file_exists}, Taille: {len(content)} caractères"
            else:
                details = "Fichier non créé"
                success = False
                
        except Exception as e:
            success = False
            details = f"Exception: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Quick Process", success, details, duration)
    
    def test_error_handling(self):
        """Teste la gestion d'erreurs"""
        print("\n" + "="*40)
        print("⚠️ TEST GESTION D'ERREURS")
        print("="*40)
        
        # Test avec fichier inexistant et non créable
        start_time = time.time()
        try:
            dux = AssistantDux()
            
            # Tester avec un chemin invalide
            invalid_path = "/root/impossible/fichier.html"  # Chemin probablement inaccessible
            result = dux.process_user_request("Test erreur", invalid_path)
            
            # Le test réussit si l'erreur est gérée proprement (pas de crash)
            success = not result["success"]  # On s'attend à un échec contrôlé
            details = "Erreur gérée correctement sans crash"
            
        except Exception as e:
            success = False
            details = f"Exception non gérée: {str(e)}"
        
        duration = time.time() - start_time
        self.log_test("Gestion d'erreurs", success, details, duration)
    
    def run_all_tests(self):
        """Lance tous les tests"""
        print("🚀 LANCEMENT DE TOUS LES TESTS")
        print("=" * 80)
        
        # Tests individuels des modules
        self.test_individual_modules()
        
        # Test d'initialisation
        dux = self.test_assistant_dux_initialization()
        
        if dux:
            # Tests avec l'instance Dux
            self.test_file_creation(dux)
            self.test_complete_workflow(dux)
        
        # Tests de fonctions utilitaires
        self.test_quick_process_function()
        
        # Tests de gestion d'erreurs
        self.test_error_handling()
        
        # Rapport final
        self.generate_final_report()
    
    def generate_final_report(self):
        """Génère le rapport final des tests"""
        end_time = datetime.now()
        total_duration = (end_time - self.start_time).total_seconds()
        
        print("\n" + "="*80)
        print("📊 RAPPORT FINAL DES TESTS")
        print("="*80)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - successful_tests
        
        print(f"🕐 Durée totale des tests : {total_duration:.2f} secondes")
        print(f"📈 Tests exécutés : {total_tests}")
        print(f"✅ Tests réussis : {successful_tests}")
        print(f"❌ Tests échoués : {failed_tests}")
        print(f"📊 Taux de réussite : {(successful_tests/total_tests)*100:.1f}%")
        
        print(f"\n📋 DÉTAIL DES RÉSULTATS :")
        print("-" * 80)
        
        for i, result in enumerate(self.test_results, 1):
            status = "✅" if result["success"] else "❌"
            print(f"{i:2d}. {status} {result['test_name']:<30} ({result['duration']:.2f}s)")
            if result["details"]:
                print(f"     📝 {result['details']}")
        
        # Tests échoués en détail
        failed_results = [r for r in self.test_results if not r["success"]]
        if failed_results:
            print(f"\n❌ TESTS ÉCHOUÉS EN DÉTAIL :")
            print("-" * 80)
            for result in failed_results:
                print(f"• {result['test_name']}")
                print(f"  📝 {result['details']}")
                print(f"  🕐 {result['timestamp']}")
                print()
        
        # Recommandations
        print(f"\n💡 RECOMMANDATIONS :")
        print("-" * 80)
        
        if failed_tests == 0:
            print("🎉 Tous les tests sont passés ! L'Assistant Dux est prêt à être utilisé.")
        elif failed_tests <= 2:
            print("⚠️ Quelques tests ont échoué. Vérifiez les configurations API et les permissions de fichiers.")
        else:
            print("🔧 Plusieurs tests ont échoué. Vérifiez l'installation et la configuration complète.")
        
        print(f"\n{'='*80}")
        
        # Sauvegarder le rapport
        self.save_report_to_file()
    
    def save_report_to_file(self):
        """Sauvegarde le rapport dans un fichier JSON"""
        try:
            report_data = {
                "test_session": {
                    "start_time": self.start_time.isoformat(),
                    "end_time": datetime.now().isoformat(),
                    "total_tests": len(self.test_results),
                    "successful_tests": sum(1 for r in self.test_results if r["success"]),
                    "failed_tests": sum(1 for r in self.test_results if not r["success"])
                },
                "test_results": self.test_results
            }
            
            with open("test_report_assistant_dux.json", "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            print("💾 Rapport sauvegardé dans : test_report_assistant_dux.json")
            
        except Exception as e:
            print(f"⚠️ Erreur sauvegarde rapport : {e}")


def main():
    """Fonction principale"""
    print("🧪 SCRIPT DE TEST ASSISTANT DUX")
    print("Démarrage des tests automatisés...")
    print()
    
    # Créer et lancer les tests
    tester = TestAssistantDux()
    
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrompus par l'utilisateur")
    except Exception as e:
        print(f"\n❌ Erreur critique dans les tests : {e}")
    finally:
        # Nettoyer les fichiers de test
        print("\n🧹 Nettoyage des fichiers de test...")
        tester.cleanup_test_files()
        print("✅ Nettoyage terminé")


if __name__ == "__main__":
    main()