import config
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from pathlib import Path
from Assistant_Dux import AssistantDux
import re
from typing import Dict
import json
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from enum import Enum
import shutil

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Définition du répertoire d'upload
UPLOAD_DIR = Path("upload")
if not UPLOAD_DIR.exists():
    UPLOAD_DIR.mkdir()

# Création de l'application FastAPI
app = FastAPI(
    title="Assistant Dux Web",
    description="API pour modifier des fichiers web avec l'IA",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- Configuration de l'authentification ---
SECRET_KEY = "votre-clé-secrète-ultra-sécurisée" # REMPLACER PAR UNE VRAIE CLÉ
ALGORITHM = "HS256"
USERS_DB = Path("users.json")
if not USERS_DB.exists():
    # Initialiser avec un utilisateur admin par défaut pour la démo
    admin_password = bcrypt.hashpw("admin_password".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    with open(USERS_DB, "w") as f:
        json.dump({
            "admin": {
                "username": "admin",
                "hashed_password": admin_password,
                "role": "admin",
                "trials_left": -1 # -1 pour les essais illimités
            }
        }, f, indent=4)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- Modèles Pydantic ---
class UserRole(str, Enum):
    user = "user"
    admin = "admin"

class GenerationRequest(BaseModel):
    file_path: str
    user_query: str

class UserInDB(BaseModel):
    username: str
    hashed_password: str
    role: UserRole = UserRole.user
    trials_left: int = 3
    subscription_end: str | None = None # Date de fin d'abonnement
    
class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateSubscription(BaseModel):
    username: str
    months: int

class UpdateProfile(BaseModel):
    new_username: str | None = None
    new_password: str | None = None

class ManageAdmin(BaseModel):
    username: str

# --- Fonctions d'aide pour l'authentification ---
def get_user_from_db(username: str) -> UserInDB | None:
    try:
        with open(USERS_DB, "r") as f:
            users = json.load(f)
            user_data = users.get(username)
            if user_data:
                # Vérifier et mettre à jour le statut d'abonnement
                if user_data.get("subscription_end"):
                    sub_end_date = datetime.fromisoformat(user_data["subscription_end"])
                    if datetime.now() > sub_end_date:
                        user_data["trials_left"] = 0
                        user_data["subscription_end"] = None
                        with open(USERS_DB, "w") as f_write:
                             json.dump(users, f_write, indent=4)
                return UserInDB(**user_data)
    except (IOError, json.JSONDecodeError) as e:
        logger.error(f"Erreur de lecture de la base de données des utilisateurs: {e}")
    return None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = get_user_from_db(username)
        if user is None:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Fonction pour vérifier si l'utilisateur est un admin
def get_current_admin_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès refusé. Vous n'êtes pas administrateur.")
    return current_user

# --- Regex pour extraire le code ---
CODE_PATTERN = re.compile(r'\[CODE_START\](.*?)\[CODE_END\]', re.DOTALL)

# --- Endpoints de l'application ---

@app.post("/register")
async def register(request: LoginRequest):
    if get_user_from_db(request.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur existe déjà."
        )
    
    hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    with open(USERS_DB, "r+") as f:
        users = json.load(f)
        users[request.username] = {
            "username": request.username,
            "hashed_password": hashed_password,
            "role": "user",
            "trials_left": 3,
            "subscription_end": None
        }
        f.seek(0)
        json.dump(users, f, indent=4)
    
    return {"message": "Utilisateur enregistré avec succès"}

@app.post("/login")
async def login(request: LoginRequest):
    logger.info(f"Tentative de connexion pour l'utilisateur: {request.username}")
    user_in_db = get_user_from_db(request.username)
    if not user_in_db or not bcrypt.checkpw(request.password.encode('utf-8'), user_in_db.hashed_password.encode('utf-8')):
        logger.warning(f"Échec de la connexion pour l'utilisateur: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect."
        )

    access_token = create_access_token(
        data={"sub": user_in_db.username}, expires_delta=timedelta(hours=24)
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user_in_db.role}

@app.get("/user/me")
async def get_my_info(current_user: UserInDB = Depends(get_current_user)):
    return {"username": current_user.username, "trials_left": current_user.trials_left, "role": current_user.role, "subscription_end": current_user.subscription_end}

@app.post("/generate")
async def generate_template(request: GenerationRequest, current_user: UserInDB = Depends(get_current_user)):
    if current_user.trials_left <= 0:
        if current_user.subscription_end:
            sub_end_date = datetime.fromisoformat(current_user.subscription_end)
            if datetime.now() > sub_end_date:
                 raise HTTPException(status_code=403, detail="Votre abonnement a expiré.")
        else:
            raise HTTPException(status_code=403, detail="Vous avez atteint votre limite de 3 essais.")
        
    try:
        assistant = AssistantDux()
        
        user_folder = UPLOAD_DIR / current_user.username
        if not user_folder.exists():
            user_folder.mkdir()
            
        target_file_path = user_folder / request.file_path

        modification_result = assistant.process_user_request(
            target_file=str(target_file_path),
            user_query=request.user_query
        )

        if modification_result["success"]:
            # Décrémenter le nombre de tentatives uniquement si l'utilisateur n'est pas en mode illimité
            if current_user.trials_left > 0:
                current_user.trials_left -= 1
            
            with open(USERS_DB, "r+") as f:
                users = json.load(f)
                users[current_user.username]["trials_left"] = current_user.trials_left
                f.seek(0)
                json.dump(users, f, indent=4)
            
            full_code = modification_result.get("code_applied", "")
            match = CODE_PATTERN.search(full_code)
            clean_code = match.group(1).strip() if match else full_code
            
            return {
                "status": "success",
                "message": "Template généré et mis à jour avec succès !",
                "code": clean_code,
                "trials_left": current_user.trials_left
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec de la génération : {modification_result['message']}")
            
    except Exception as e:
        logger.error(f"Erreur lors de la génération du template : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur : {str(e)}")

@app.get("/list-files")
async def list_files(current_user: UserInDB = Depends(get_current_user)):
    try:
        user_folder = UPLOAD_DIR / current_user.username
        if not user_folder.exists():
            return {"success": True, "files": [], "count": 0}
            
        files = []
        for item in user_folder.iterdir():
            if item.is_file() and not item.name.startswith('.'):
                files.append({
                    "name": item.name,
                    "path": str(item.relative_to(user_folder)),
                    "size": item.stat().st_size,
                    "extension": item.suffix
                })
        
        return {
            "success": True,
            "files": files,
            "count": len(files),
            "working_directory": str(user_folder.absolute())
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la lecture du répertoire d'upload : {str(e)}"
        )

@app.get("/get-file-content")
async def get_file_content(file_path: str, current_user: UserInDB = Depends(get_current_user)):
    user_folder = UPLOAD_DIR / current_user.username
    target_file_path = user_folder / file_path
    logger.info(f"Tentative de lecture du fichier : {target_file_path}")

    if not target_file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Fichier non trouvé à l'emplacement : {target_file_path}"
        )
    
    with open(target_file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    return {"content": content}

@app.get("/files/{username}/{file_path:path}")
async def serve_user_file(username: str, file_path: str):
    user_folder = UPLOAD_DIR / username
    target_file_path = user_folder / file_path
    if not target_file_path.is_file():
        raise HTTPException(status_code=404, detail="Fichier non trouvé.")
    return FileResponse(target_file_path)

# --- Endpoints Admin existants (mis à jour) ---
@app.get("/admin/users")
async def get_all_users(current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        with open(USERS_DB, "r") as f:
            users = json.load(f)
            # Exclure le mot de passe haché pour des raisons de sécurité
            safe_users = [{k: v for k, v in user.items() if k != 'hashed_password'} for user in users.values()]
            return {"users": safe_users}
    except (IOError, json.JSONDecodeError) as e:
        logger.error(f"Erreur de lecture de la base de données des utilisateurs: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/update-subscription")
async def update_subscription(request: UpdateSubscription, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin":
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier l'abonnement de l'administrateur.")
        
    user_in_db = get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        with open(USERS_DB, "r+") as f:
            users = json.load(f)
            
            # Calculer la date de fin d'abonnement
            subscription_end_date = datetime.now() + timedelta(days=request.months * 30)
            
            users[request.username]["trials_left"] = -1 # Essais illimités
            users[request.username]["subscription_end"] = subscription_end_date.isoformat()
            
            f.seek(0)
            json.dump(users, f, indent=4)
            return {"message": f"Abonnement de {request.months} mois accordé à {request.username}."}
            
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'abonnement: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

# --- NOUVEAUX ENDPOINTS POUR L'ADMIN ---

@app.put("/admin/profile")
async def update_admin_profile(request: UpdateProfile, current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        with open(USERS_DB, "r+") as f:
            users = json.load(f)
            
            # Mise à jour du mot de passe
            if request.new_password:
                hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                users[current_admin.username]["hashed_password"] = hashed_password
            
            # Mise à jour du nom d'utilisateur
            if request.new_username and request.new_username != current_admin.username:
                if users.get(request.new_username):
                    raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris.")
                
                # Mettre à jour l'entrée dans le dictionnaire
                users[request.new_username] = users.pop(current_admin.username)
                users[request.new_username]["username"] = request.new_username
                
                # Renommer le répertoire de l'utilisateur
                old_folder = UPLOAD_DIR / current_admin.username
                new_folder = UPLOAD_DIR / request.new_username
                if old_folder.exists():
                    shutil.move(str(old_folder), str(new_folder))
                    
            f.seek(0)
            json.dump(users, f, indent=4)
            return {"message": "Profil mis à jour avec succès", "new_username": request.new_username or current_admin.username}
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du profil: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/profile/upload-image")
async def upload_profile_image(file: UploadFile = File(...), current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        user_folder = UPLOAD_DIR / current_admin.username
        if not user_folder.exists():
            user_folder.mkdir()
            
        # Supprimer les anciennes images de profil pour éviter l'encombrement
        for f in user_folder.glob("profile_image.*"):
            f.unlink()
            
        file_extension = Path(file.filename).suffix
        file_path = user_folder / f"profile_image{file_extension}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "Image de profil téléchargée avec succès", "image_url": f"/files/{current_admin.username}/profile_image{file_extension}"}
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de l'image de profil: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.delete("/admin/users/{username}")
async def delete_user(username: str, current_admin: UserInDB = Depends(get_current_admin_user)):
    if username == "admin" or username == current_admin.username:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer ou supprimer l'administrateur principal.")
        
    user_in_db = get_user_from_db(username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        with open(USERS_DB, "r+") as f:
            users = json.load(f)
            if username in users:
                del users[username]
                
                # Supprimer le répertoire de l'utilisateur
                user_folder = UPLOAD_DIR / username
                if user_folder.exists():
                    shutil.rmtree(user_folder)
                    
                f.seek(0)
                json.dump(users, f, indent=4)
                return {"message": f"Utilisateur {username} supprimé avec succès."}
            else:
                raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de l'utilisateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/promote")
async def promote_user_to_admin(request: ManageAdmin, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin":
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier le rôle de l'administrateur principal.")
        
    user_in_db = get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        with open(USERS_DB, "r+") as f:
            users = json.load(f)
            if users.get(request.username):
                users[request.username]["role"] = "admin"
                f.seek(0)
                json.dump(users, f, indent=4)
                return {"message": f"Utilisateur {request.username} promu au rôle d'administrateur avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors de la promotion de l'utilisateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/demote")
async def demote_admin_to_user(request: ManageAdmin, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin" or request.username == current_admin.username:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas rétrograder l'administrateur principal ou vous-même.")
        
    user_in_db = get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        with open(USERS_DB, "r+") as f:
            users = json.load(f)
            if users.get(request.username):
                users[request.username]["role"] = "user"
                f.seek(0)
                json.dump(users, f, indent=4)
                return {"message": f"Administrateur {request.username} rétrogradé au rôle d'utilisateur avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors de la rétrogradation de l'administrateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))  # prend le port fourni par Render

    logger.info("🚀 Démarrage d'Assistant Dux Web...")
    logger.info("📁 Répertoire d'upload: %s", UPLOAD_DIR.absolute())
    logger.info("🌐 Interface web: http://127.0.0.1:%s" % port)
    logger.info("📖 Documentation API: http://127.0.0.1:%s/docs" % port)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",   # obligatoire pour exposer le service
        port=port,
        reload=True       # tu peux le laisser pour le dev
    )
