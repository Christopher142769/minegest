# app.py
import os
from flask import Flask, render_template, request, flash, redirect, url_for
import sys

# Assurez-vous que le répertoire courant est dans le sys.path
# pour que les imports de vos modules fonctionnent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Assistant_Dux import AssistantDux # Importez votre classe AssistantDux

app = Flask(__name__)
app.secret_key = 'votre_cle_secrete_pour_flask_messages' # Changez cette clé pour une clé complexe en production !

@app.route('/', methods=['GET', 'POST'])
def index():
    user_query = ""
    target_file_path = ""
    current_file_content = ""
    
    if request.method == 'POST':
        # Lors d'une soumission de formulaire (POST)
        user_query = request.form.get('user_query', '')
        target_file_path = request.form.get('target_file_path', '')
    else: # request.method == 'GET'
        # Lors d'un chargement initial ou après une redirection (GET)
        # Tenter de récupérer le chemin du fichier depuis les paramètres d'URL
        target_file_path = request.args.get('file', '') 
        # Si la redirection a passé un chemin via l'URL, on le récupère.
        # Sinon, il restera vide et l'utilisateur devra le saisir.

    # Si un chemin de fichier est fourni (GET ou POST), essayer de lire son contenu
    if target_file_path and os.path.exists(target_file_path):
        try:
            with open(target_file_path, 'r', encoding='utf-8') as f:
                current_file_content = f.read()
        except Exception as e:
            flash(f"❌ Erreur lors de la lecture du fichier '{target_file_path}' : {e}", "error")
            current_file_content = ""
            
    elif target_file_path: # Le fichier n'existe pas, mais un chemin a été spécifié
        flash(f"⚠️ Le fichier '{target_file_path}' n'existe pas. Il sera créé si une modification est appliquée.", "warning")
        current_file_content = ""
    else: # Aucun chemin de fichier fourni (première visite ou après réinitialisation)
        current_file_content = ""


    if request.method == 'POST' and user_query and target_file_path:
        print(f"Requête reçue : '{user_query}' pour le fichier : '{target_file_path}'")
        
        # Initialiser l'AssistantDux avec le chemin du fichier spécifié par l'utilisateur
        dux = AssistantDux(default_page_file=target_file_path)
        
        # S'assurer que le fichier existe avant de tenter de le lire ou de le modifier
        # La fonction `create_file_if_not_exists` est dans Assistant_Dux.py
        dux.create_file_if_not_exists(target_file_path)

        modification_result = dux.process_user_request(user_query, target_file=target_file_path)
        
        if modification_result["success"]:
            flash(f"✅ Modification appliquée avec succès au fichier '{target_file_path}' !", "success")
            # Le contenu du fichier sera rechargé par le GET qui suit la redirection
        else:
            flash(f"❌ Échec de la modification : {modification_result['message']}", "error")
            
        # Rediriger vers la même page, en passant le chemin du fichier cible dans l'URL
        # pour qu'il soit récupéré par la requête GET suivante.
        return redirect(url_for('index', query='', file=target_file_path)) 
        
    elif request.method == 'POST':
        # Si le POST a eu lieu mais qu'il manque des données
        if not user_query:
            flash("Veuillez entrer une requête.", "warning")
        if not target_file_path:
            flash("Veuillez spécifier le chemin du fichier cible.", "warning")

    return render_template('index.html', 
                           user_query=user_query, # Pour pré-remplir la requête si re-soumission invalide
                           target_file_path=target_file_path, # Pour garder le chemin du fichier dans le champ
                           current_code=current_file_content)

if __name__ == '__main__':
    app.run(debug=True)
