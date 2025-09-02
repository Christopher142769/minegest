    <script>
        // Variables globales pour la synthèse vocale
        let speechSynthesis = window.speechSynthesis;
        let isProcessing = false;
        let processingInterval;
        let currentFileContent = '';

        // Configuration de l'API (à adapter selon votre configuration FastAPI)
        const API_BASE_URL = 'http://localhost:8000'; // Changez cette URL selon votre configuration

        // Messages pour différentes phases
        const processingMessages = [
            "J'applique vos demandes...",
            "J'essaie de faire que cela vous convienne...",
            "Analyse du code en cours...",
            "Optimisation en cours...",
            "Presque terminé...",
            "Finalisation..."
        ];

        const completionMessages = [
            "Cela vous convient-il ?",
            "Avez-vous d'autres modifications à faire ?",
            "En quoi puis-je encore vous aider ?",
            "Le traitement est terminé !",
            "Modification appliquée avec succès !"
        ];

        // Animation de rotation pour le loading
        const spinKeyframes = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.textContent = spinKeyframes;
        document.head.appendChild(styleSheet);

        // Génération des étoiles
        function createStars() {
            const starsContainer = document.getElementById('stars');
            const starCount = 200;
            
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 3 + 's';
                star.style.animationDuration = (Math.random() * 3 + 2) + 's';
                starsContainer.appendChild(star);
            }
        }

        // Génération des particules
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.position = 'fixed';
                particle.style.width = '3px';
                particle.style.height = '3px';
                particle.style.background = '#00ffff';
                particle.style.borderRadius = '50%';
                particle.style.pointerEvents = 'none';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animation = `float ${Math.random() * 20 + 15}s ease-in-out infinite`;
                particle.style.animationDelay = Math.random() * 20 + 's';
                particlesContainer.appendChild(particle);
            }
        }

        // Effet Matrix pour le texte
        function typewriterEffect(element, text, speed = 50) {
            element.innerHTML = '';
            let i = 0;
            
            function typeChar() {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                }
            }
            
            typeChar();
        }

        // Fonction pour afficher le titre avec effet Matrix
        function displayTitleEffect() {
            const title = document.getElementById('title');
            const text = "Assistant Dux Web (FastAPI)";
            typewriterEffect(title, text, 100);
        }

        // Fonction pour la synthèse vocale
        function speakText(text) {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
        }

        // Fonction pour afficher/masquer les messages du robot
        function showRobotMessage(message, duration = 5000) {
            // Supprimer l'ancienne bulle s'il y en a une
            const existingBubble = document.querySelector('.robot-bubble');
            if (existingBubble) {
                existingBubble.remove();
            }

            // Créer la nouvelle bulle
            const bubble = document.createElement('div');
            bubble.className = 'robot-bubble';
            bubble.textContent = message;
            document.body.appendChild(bubble);

            // Supprimer la bulle après la durée spécifiée
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.remove();
                }
            }, duration);
        }

        // Fonction pour faire parler le robot
        function robotSpeak() {
            const messages = [
                "Bonjour ! Je suis votre assistant IA.",
                "Comment puis-je vous aider aujourd'hui ?",
                "N'hésitez pas à me demander des modifications !",
                "Je suis là pour optimiser votre code !",
                "Précisez bien la zone à modifier pour de meilleurs résultats."
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            showRobotMessage(randomMessage);
            speakText(randomMessage);
        }

        // Fonction pour afficher les messages d'erreur
        function showMessage(message, type = 'error') {
            const messageContainer = document.getElementById('message-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}-message`;
            messageDiv.textContent = message;
            
            // Supprimer les anciens messages
            const existingMessages = messageContainer.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            messageContainer.appendChild(messageDiv);
            
            // Supprimer le message après 5 secondes
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }

        // Fonction pour afficher l'indicateur de chargement
        function showLoading() {
            const loadingIndicator = document.getElementById('loading-indicator');
            const loadingText = document.getElementById('loading-text');
            loadingIndicator.style.display = 'block';
            isProcessing = true;
            
            let messageIndex = 0;
            processingInterval = setInterval(() => {
                loadingText.textContent = processingMessages[messageIndex];
                messageIndex = (messageIndex + 1) % processingMessages.length;
            }, 2000);
        }

        // Fonction pour masquer l'indicateur de chargement
        function hideLoading() {
            const loadingIndicator = document.getElementById('loading-indicator');
            loadingIndicator.style.display = 'none';
            isProcessing = false;
            
            if (processingInterval) {
                clearInterval(processingInterval);
            }
        }

        // Fonction pour charger le contenu du fichier
        async function loadFileContent(filePath) {
            try {
                const response = await fetch(`${API_BASE_URL}/load-file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file_path: filePath })
                });

                const data = await response.json();
                
                if (response.ok) {
                    currentFileContent = data.content;
                    document.getElementById('currentCodeBlock').textContent = data.content;
                    showMessage(`Fichier "${filePath}" chargé avec succès !`, 'success');
                } else {
                    showMessage(data.detail || 'Erreur lors du chargement du fichier', 'error');
                    document.getElementById('currentCodeBlock').textContent = 'Erreur de chargement';
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('Erreur de connexion avec le serveur', 'error');
                document.getElementById('currentCodeBlock').textContent = 'Erreur de connexion';
            }
        }

        // Fonction pour appliquer les modifications
        async function applyModifications(filePath, userQuery) {
            try {
                showLoading();
                
                const response = await fetch(`${API_BASE_URL}/modify-file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_path: filePath,
                        user_query: userQuery
                    })
                });

                const data = await response.json();
                hideLoading();
                
                if (response.ok) {
                    // Mettre à jour le contenu affiché
                    currentFileContent = data.modified_content;
                    document.getElementById('currentCodeBlock').textContent = data.modified_content;
                    
                    // Afficher le message de succès
                    const successMessage = data.message || 'Modification appliquée avec succès !';
                    showMessage(successMessage, 'success');
                    
                    // Message du robot
                    const robotMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];
                    showRobotMessage(robotMessage, 4000);
                    speakText(robotMessage);
                    
                } else {
                    showMessage(data.detail || 'Erreur lors de la modification', 'error');
                    showRobotMessage("Désolé, une erreur s'est produite. Essayez de reformuler votre demande.", 5000);
                }
            } catch (error) {
                hideLoading();
                console.error('Erreur:', error);
                showMessage('Erreur de connexion avec le serveur', 'error');
                showRobotMessage("Problème de connexion avec le serveur.", 5000);
            }
        }

        // Fonction pour copier le code
        function copyCode() {
            const codeBlock = document.getElementById('currentCodeBlock');
            const textArea = document.createElement('textarea');
            textArea.value = codeBlock.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            showMessage('Code copié dans le presse-papiers !', 'success');
            showRobotMessage("Code copié ! Vous pouvez maintenant le coller où vous voulez.", 3000);
        }

        // Gestionnaire de soumission du formulaire
        document.getElementById('dux-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (isProcessing) {
                showMessage('Une opération est déjà en cours, veuillez patienter...', 'error');
                return;
            }
            
            const filePath = document.getElementById('target_file_path').value.trim();
            const userQuery = document.getElementById('user_query').value.trim();
            
            if (!filePath || !userQuery) {
                showMessage('Veuillez remplir tous les champs requis', 'error');
                return;
            }
            
            // D'abord charger le fichier, puis appliquer les modifications
            await loadFileContent(filePath);
            
            // Petite pause pour que l'utilisateur voit le contenu chargé
            setTimeout(async () => {
                await applyModifications(filePath, userQuery);
            }, 1000);
        });

        // Gestionnaire pour le champ de chemin de fichier (chargement automatique)
        document.getElementById('target_file_path').addEventListener('blur', function() {
            const filePath = this.value.trim();
            if (filePath && !isProcessing) {
                loadFileContent(filePath);
            }
        });

        // Gestion des commandes spéciales
        document.getElementById('user_query').addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            // Commande de reset
            if (query.includes('ramène') && query.includes('état initial')) {
                if (currentFileContent) {
                    document.getElementById('currentCodeBlock').textContent = currentFileContent;
                    showMessage('Page remise à son état initial', 'success');
                    showRobotMessage("État initial restauré !", 3000);
                    this.value = '';
                }
            }
        });

        // Gestion des raccourcis clavier
        document.addEventListener('keydown', function(e) {
            // Ctrl + Enter pour soumettre
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                document.getElementById('dux-form').dispatchEvent(new Event('submit'));
            }
            
            // Ctrl + C sur le code block pour copier
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target.id === 'currentCodeBlock') {
                copyCode();
            }
            
            // Escape pour annuler le traitement
            if (e.key === 'Escape' && isProcessing) {
                hideLoading();
                showMessage('Opération annulée', 'error');
            }
        });

        // Fonction d'initialisation
        function initializeApp() {
            // Créer les étoiles et particules
            createStars();
            createParticles();
            
            // Afficher le titre avec effet
            setTimeout(() => {
                displayTitleEffect();
            }, 500);
            
            // Message de bienvenue du robot après 3 secondes
            setTimeout(() => {
                showRobotMessage("Bienvenue ! Je suis votre assistant IA. Cliquez sur moi pour plus d'infos !", 6000);
                speakText("Bienvenue ! Je suis votre assistant de modification de code.");
            }, 3000);
            
            // Focus sur le premier champ
            document.getElementById('target_file_path').focus();
        }

        // Vérification du support de la synthèse vocale
        function checkSpeechSynthesisSupport() {
            if (!('speechSynthesis' in window)) {
                console.warn('La synthèse vocale n\'est pas supportée par ce navigateur');
                showMessage('Synthèse vocale non disponible dans ce navigateur', 'error');
            }
        }

        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', function() {
            if (document.hidden && speechSynthesis.speaking) {
                speechSynthesis.pause();
            } else if (!document.hidden && speechSynthesis.paused) {
                speechSynthesis.resume();
            }
        });

        // Fonction de nettoyage avant fermeture
        window.addEventListener('beforeunload', function() {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            if (processingInterval) {
                clearInterval(processingInterval);
            }
        });

        // Auto-sauvegarde des champs (localStorage)
        function saveFormData() {
            const filePath = document.getElementById('target_file_path').value;
            const userQuery = document.getElementById('user_query').value;
            
            localStorage.setItem('dux_file_path', filePath);
            localStorage.setItem('dux_user_query', userQuery);
        }

        function loadFormData() {
            const savedFilePath = localStorage.getItem('dux_file_path');
            const savedUserQuery = localStorage.getItem('dux_user_query');
            
            if (savedFilePath) {
                document.getElementById('target_file_path').value = savedFilePath;
            }
            
            if (savedUserQuery) {
                document.getElementById('user_query').value = savedUserQuery;
            }
        }

        // Sauvegarde automatique des champs
        document.getElementById('target_file_path').addEventListener('input', saveFormData);
        document.getElementById('user_query').addEventListener('input', saveFormData);

        // Initialisation au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            checkSpeechSynthesisSupport();
            loadFormData();
            initializeApp();
        });

        // Fonction d'aide contextuelle
        function showContextualHelp() {
            const helpMessages = {
                'ajouter': 'Pour ajouter un élément, précisez sa position et ses propriétés. Ex: "Ajoute un bouton rouge en bas de page"',
                'modifier': 'Pour modifier, précisez l\'élément et le changement désiré. Ex: "Modifie la couleur du titre en bleu"',
                'supprimer': 'Pour supprimer, identifiez clairement l\'élément. Ex: "Supprime le bouton de validation"',
                'style': 'Pour les styles, soyez précis. Ex: "Change le background en dégradé bleu-violet"',
                'responsive': 'Pour le responsive, précisez les écrans. Ex: "Rend le menu responsive sur mobile"'
            };
            
            const query = document.getElementById('user_query').value.toLowerCase();
            let helpMessage = null;
            
            for (const [keyword, message] of Object.entries(helpMessages)) {
                if (query.includes(keyword)) {
                    helpMessage = message;
                    break;
                }
            }
            
            if (helpMessage) {
                showRobotMessage(helpMessage, 7000);
            }
        }

        // Aide contextuelle en temps réel
        document.getElementById('user_query').addEventListener('input', function() {
            clearTimeout(this.helpTimeout);
            this.helpTimeout = setTimeout(showContextualHelp, 2000);
        });

        console.log('🚀 Assistant Dux Web initialisé avec succès !');