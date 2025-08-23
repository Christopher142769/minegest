import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Image, Row, Col, Spinner } from 'react-bootstrap';
import axios from 'axios';
import logo from './logo.png';

export default function ViewTrucker() {
  const { id } = useParams();
  const [trucker, setTrucker] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/truckers/${id}`)
      .then(res => setTrucker(res.data))
      .catch(err => alert("Erreur : " + err));
  }, [id]);

  if (!trucker) return <Spinner animation="border" />;

  return (
    <Card className="mt-4 p-3 shadow" style={{ maxWidth: '400px' }}>
      <Row>
        <Col xs={4}><Image src={logo} fluid rounded /></Col>
        <Col>
          <h5>{trucker.name}</h5>
          <p><strong>Camion :</strong> {trucker.truckPlate}</p>
          <p><strong>Type :</strong> {trucker.truckType}</p>
          <p><strong>Solde :</strong> {trucker.balance} FCFA</p>
        </Col>
      </Row>
      <div
        style={{
          marginTop: 20,
          padding: 10,
          border: '2px dashed #777',
          borderRadius: 10,
          textAlign: 'center',
          color: '#777',
          fontStyle: 'italic',
        }}
      >
        Zone puce RFID - Coller puce NFC ici
      </div>
    </Card>
  );
}
