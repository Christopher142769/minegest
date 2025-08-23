// Fichier : src/components/MyComponent.js

import React, { useState } from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 
import moment from 'moment';

const MyComponent = () => {
    // État pour la date, initialisé à la date d'aujourd'hui
    const [date, setDate] = useState(new Date());

    const handleSubmit = (event) => {
        event.preventDefault();
        // Le format que vous voulez envoyer à l'API (ex: YYYY-MM-DD)
        const formattedDate = moment(date).format('YYYY-MM-DD'); 
        console.log('Date formatée pour l\'envoi :', formattedDate);
        // ... Logique pour envoyer la date au backend
    };

    return (
        <Card className="p-4 shadow-lg card-glass">
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-2">
                    <Form.Label>Date</Form.Label>
                    <div style={{ display: 'block' }}>
                        <DatePicker
                            selected={date}
                            onChange={(d) => setDate(d)}
                            dateFormat="dd/MM/yyyy"
                            className="form-control"
                            required
                        />
                    </div>
                </Form.Group>
                <Button type="submit">Soumettre</Button>
            </Form>
        </Card>
    );
};

export default MyComponent;
