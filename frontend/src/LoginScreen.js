import React, { useState } from 'react';
import { Form, Button, Card, Spinner, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaSignInAlt, FaTruck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';

const LoginScreen = ({ onLogin, onRoleChange }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState('Gestionnaire');
    const API_URL = "https://minegest.pro-aquacademy.com";

    const handleLogin = async (e) => {
        // --- DÉBUT DU DÉBOGAGE ---
        console.log("handleLogin a été appelé !");
        // --- FIN DU DÉBOGAGE ---

        e.preventDefault();
        setLoading(true);

        const url = `${API_URL}/api/login`;
        const data = { username, password };

        try {
            const response = await axios.post(url, data);

            console.log('Connexion réussie ! Réponse du serveur:', response);

            const { user } = response.data;
            console.log('Rôle de l\'utilisateur:', user.role, 'Type d\'utilisateur sélectionné:', userType);

            if (user.role === userType) {
                onLogin(user);
            } else {
                toast.error(`Connexion échouée : Vous ne pouvez pas vous connecter en tant que ${userType}.`);
            }
        } catch (error) {
            console.error('Erreur de connexion:', error.response ? error.response.data : error.message);
            toast.error("Nom d'utilisateur ou mot de passe incorrect.");
        } finally {
            console.log('Fin de la tentative de connexion.');
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100vh', background: 'linear-gradient(135deg,rgb(255, 255, 255),rgb(3, 247, 234))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
        >
            <Card className="p-4 shadow-lg" style={{ width: '90%', maxWidth: '400px', borderRadius: '15px' }}>
                <motion.div
                    className="text-center mb-4"
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.2 }}
                >
                    <FaTruck size={50} className="text-primary mb-2" />
                    <h3 className="text-primary">Gasoil Manager</h3>
                    <h5 className="text-secondary">Connexion</h5>
                </motion.div>
                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                        <Form.Label>Rôle</Form.Label>
                        <Form.Select
                            value={userType}
                            onChange={(e) => {
                                setUserType(e.target.value);
                                onRoleChange(e.target.value);
                            }}
                        >
                            <option value="Gestionnaire">Gestionnaire</option>
                            <option value="Vendeur">Vendeur</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Nom d'utilisateur</Form.Label>
                        <InputGroup>
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
                        <InputGroup>
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
                </Form>
            </Card>
        </motion.div>
    );
};

export default LoginScreen;