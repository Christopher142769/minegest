import React, { useState } from 'react';
import { Form, Button, Card, Spinner, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaSignInAlt, FaUserTie, FaUserShield, FaUserPlus, FaTruck, FaExchangeAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import backgroundImg from './truck-background.jpg';
import './LoginScreen.css';

const LoginScreen = ({ onLogin, onRoleChange, onGoToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState('Gestionnaire');
    const API_URL = "https://minegestback.onrender.com";

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const url = `${API_URL}/api/login`;
        const data = { username, password };

        try {
            const response = await axios.post(url, data);
            const { user, token } = response.data;
            if (user.role === userType) {
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', token);
                onLogin(user);
            } else {
                toast.error(`Échec de la connexion : Vous ne pouvez pas vous connecter en tant que ${userType}.`);
            }
        } catch (error) {
            console.error('Erreur de connexion:', error.response ? error.response.data : error.message);
            toast.error("Nom d'utilisateur ou mot de passe incorrect.");
        } finally {
            setLoading(false);
        }
    };

    const toggleUserType = () => {
        const newType = userType === 'Gestionnaire' ? 'Vendeur' : 'Gestionnaire';
        setUserType(newType);
        onRoleChange(newType);
    };

    return (
        <div className="login-container d-flex justify-content-center align-items-center">
            <div className="background-overlay" style={{ backgroundImage: `url(${backgroundImg})` }}></div>
            <motion.div
                className="login-card shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            >
                <div className="icon-section d-none d-md-flex flex-column justify-content-center align-items-center text-white">
                    <motion.div
                        initial={{ rotateY: -90 }}
                        animate={{ rotateY: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        {userType === 'Gestionnaire' ? (
                            <FaUserShield size={80} />
                        ) : (
                            <FaUserTie size={80} />
                        )}
                    </motion.div>
                    <h4 className="mt-3 text-center">
                        {userType === 'Gestionnaire' ? 'Accès Gestionnaire' : 'Accès Vendeur'}
                    </h4>
                </div>
                <div className="form-section p-4">
                    <motion.div
                        className="text-center mb-4"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <FaTruck size={45} className="text-primary mb-2" />
                        <h3 className="text-primary">Gasoil Manager</h3>
                        <h5 className="text-secondary">Connexion</h5>
                    </motion.div>
                    <Form onSubmit={handleLogin}>
                        <div className="role-switcher-container mb-3">
                            <span className="me-2 text-secondary">Rôle :</span>
                            <div className="role-switcher">
                                <span className={userType === 'Gestionnaire' ? 'active' : ''}>Gestionnaire</span>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={toggleUserType}
                                    className="mx-2"
                                >
                                    <FaExchangeAlt />
                                </Button>
                                <span className={userType === 'Vendeur' ? 'active' : ''}>Vendeur</span>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Nom d'utilisateur</Form.Label>
                            <InputGroup className="input-with-icon">
                                <InputGroup.Text><FaUser /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Entrez votre nom d'utilisateur"
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
                                    placeholder="Entrez votre mot de passe"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Button
                            variant="primary"
                            type="submit"
                            className="w-100 mt-3"
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : <><FaSignInAlt /> Se Connecter</>}
                        </Button>
                        <div className="text-center mt-3">
                            <Button variant="link" onClick={onGoToRegister}>
                                <FaUserPlus /> S'inscrire
                            </Button>
                        </div>
                    </Form>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginScreen;