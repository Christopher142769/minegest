import React, { useState, useRef } from 'react';
import { Form, Button, Card, Spinner, InputGroup, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaUserPlus, FaLock, FaSignInAlt, FaWhatsapp, FaKey, FaCopy, FaImage } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import { toJpeg } from 'html-to-image';
import './RegisterScreen.css';

const RegisterScreen = ({ onRegisterSuccess, onBackToLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalUsername, setModalUsername] = useState('');
    const [modalPassword, setModalPassword] = useState('');
    const divRef = useRef(null);

    const API_URL = "https://minegestback.onrender.com";

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);

        const url = `${API_URL}/api/register`;
        const data = { username, password, whatsappNumber };

        try {
            const response = await axios.post(url, data);

            setModalUsername(response.data.username);
            setModalPassword(response.data.password);
            setShowModal(true);
            
            toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        } catch (error) {
            console.error('Erreur d\'inscription:', error.response ? error.response.data : error.message);
            toast.error(error.response ? error.response.data.message || error.response.data : 'Erreur d\'inscription. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCredentials = () => {
        if (!navigator.clipboard) {
            toast.error('Votre navigateur ne supporte pas la copie automatique.');
            return;
        }
        
        navigator.clipboard.writeText(`Nom d'utilisateur: ${modalUsername}\nMot de passe: ${modalPassword}`)
            .then(() => toast.success('Identifiants copiés dans le presse-papiers !'))
            .catch(err => {
                console.error('Erreur lors de la copie:', err);
                toast.error('Erreur lors de la copie. Assurez-vous d\'être sur une connexion sécurisée (HTTPS).');
            });
    };

    const handleDownloadAsImage = () => {
        if (divRef.current === null) {
            toast.error('Contenu à télécharger introuvable. Veuillez réessayer.');
            return;
        }

        // Utilisation de setTimeout pour garantir que le DOM est prêt
        // et ajout de skipFonts pour résoudre les erreurs CORS.
        setTimeout(() => {
            toJpeg(divRef.current, { 
                cacheBust: true,
                skipFonts: true // C'est la solution pour vos erreurs !
            })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'identifiants.jpeg';
                link.href = dataUrl;
                link.click();
                toast.success('Image téléchargée !');
            })
            .catch((err) => {
                console.error('Erreur lors de la conversion en image', err);
                toast.error('Erreur lors du téléchargement de l\'image.');
            });
        }, 50);
    };

    return (
        <motion.div
            className="auth-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <Card className="auth-card animated-card">
                <div className="p-4">
                    <div className="text-center mb-4">
                        <FaUserPlus size={48} color="#27B158" />
                        <h3 className="mt-3 card-title">Créer votre compte</h3>
                        <p className="card-subtitle">Rejoignez-nous pour gérer vos tâches.</p>
                    </div>
                    <Form onSubmit={handleRegister}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nom d'utilisateur</Form.Label>
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaUserPlus /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nom d'utilisateur"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Numéro WhatsApp</Form.Label>
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaWhatsapp /></InputGroup.Text>
                                <Form.Control
                                    type="tel"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    placeholder="Numéro WhatsApp (Ex: 229XXXXXXXX)"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Mot de passe</Form.Label>
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaLock /></InputGroup.Text>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mot de passe"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>Confirmer le mot de passe</Form.Label>
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaKey /></InputGroup.Text>
                                <Form.Control
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmer le mot de passe"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Button
                            variant="primary"
                            type="submit"
                            className="w-100 btn-register"
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : 'S\'inscrire'}
                        </Button>
                        <div className="text-center mt-3">
                            <Button variant="link" onClick={onBackToLogin} className="back-to-login">
                                <FaSignInAlt className="me-2" /> J'ai déjà un compte
                            </Button>
                        </div>
                    </Form>
                </div>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="text-center w-100">
                        <FaUserPlus className="me-2" /> Vos Identifiants
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div ref={divRef} className="p-3 text-center" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <h5>🎉 Inscription réussie !</h5>
                        <p>Veuillez noter vos identifiants pour la connexion.</p>
                        <hr />
                        <p>
                            <strong>Nom d'utilisateur:</strong> <span className="text-primary">{modalUsername}</span>
                        </p>
                        <p>
                            <strong>Mot de passe:</strong> <span className="text-danger">{modalPassword}</span>
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer className="justify-content-between">
                    <Button variant="outline-primary" onClick={handleCopyCredentials} className="me-2">
                        <FaCopy /> Copier
                    </Button>
                    <Button variant="outline-success" onClick={handleDownloadAsImage}>
                        <FaImage /> Télécharger en image
                    </Button>
                    <Button variant="primary" onClick={onBackToLogin}>
                        <FaSignInAlt className="me-2" /> Aller à la connexion
                    </Button>
                </Modal.Footer>
            </Modal>
        </motion.div>
    );
};

export default RegisterScreen;