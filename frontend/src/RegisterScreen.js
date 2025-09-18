import React, { useState } from 'react';
import { Form, Button, Card, Spinner, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaUserPlus, FaLock, FaSignInAlt, FaWhatsapp, FaKey } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import './RegisterScreen.css'; // On renomme le CSS pour englober la logique de style.

const RegisterScreen = ({ onRegisterSuccess, onBackToLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [loading, setLoading] = useState(false);
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
            await axios.post(url, data);
            toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            onRegisterSuccess();
        } catch (error) {
            console.error('Erreur d\'inscription:', error.response ? error.response.data : error.message);
            toast.error(error.response ? error.response.data : 'Erreur d\'inscription. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="auth-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <Card className="auth-card animated-card">
                <div className="p-4">
                    <div className="text-center mb-4">
                        <FaUserPlus size={60} color="#6c5ce7" />
                        <h3 className="mt-3 card-title">Créer votre compte</h3>
                        <p className="card-subtitle">Rejoignez-nous pour gérer vos tâches.</p>
                    </div>
                    <Form onSubmit={handleRegister}>
                        <Form.Group className="mb-3">
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
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaWhatsapp /></InputGroup.Text>
                                <Form.Control
                                    type="tel" // Utiliser 'tel' pour les numéros de téléphone
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    placeholder="Numéro WhatsApp (Ex: 229XXXXXXXX)"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
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
                            className="w-100 mt-2 btn-register"
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
        </motion.div>
    );
};

export default RegisterScreen;