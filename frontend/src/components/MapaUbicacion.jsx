import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corregir el problema de los íconos en Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Componente para manejar la interacción con el mapa
function MapaClickeable({ posicion, setPosicion }) {
  useMapEvents({
    click: (e) => {
      setPosicion([e.latlng.lat, e.latlng.lng]);
    },
  });

  return posicion ? <Marker position={posicion} /> : null;
}

const MapaUbicacion = ({ posicionInicial, onChange }) => {
  // Posición por defecto: Ciudad de Guatemala
  const [posicion, setPosicion] = useState(posicionInicial || [14.6349, -90.5069]);
  const [direccion, setDireccion] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  // Actualizar dirección cuando cambia la posición
  useEffect(() => {
    const obtenerDireccion = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${posicion[0]}&lon=${posicion[1]}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        
        if (data.display_name) {
          setDireccion(data.display_name);
        }
      } catch (error) {
        console.error('Error al obtener dirección:', error);
      }
    };

    obtenerDireccion();
  }, [posicion]);

  // Confirmar ubicación
  const confirmarUbicacion = () => {
    setConfirmado(true);
    onChange({
      coordenadas: {
        latitud: posicion[0],
        longitud: posicion[1]
      },
      direccion
    });
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.titulo}>Selecciona tu ubicación de entrega</h3>
      
      <div style={styles.mapaContainer}>
        <MapContainer 
          center={posicion} 
          zoom={15} 
          style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapaClickeable posicion={posicion} setPosicion={setPosicion} />
        </MapContainer>
      </div>
      
      <div style={styles.infoContainer}>
        <p style={styles.instrucciones}>
          Haz clic en el mapa para seleccionar tu ubicación exacta.
        </p>
        
        <div style={styles.direccionContainer}>
          <strong>Dirección seleccionada:</strong>
          <p style={styles.direccion}>{direccion || 'Selecciona una ubicación en el mapa'}</p>
        </div>
        
        <button 
          onClick={confirmarUbicacion} 
          style={styles.botonConfirmar}
          disabled={!direccion || confirmado}
        >
          {confirmado ? '✓ Ubicación confirmada' : 'Confirmar ubicación'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  titulo: {
    marginTop: 0,
    marginBottom: '15px',
    color: '#2c3e50'
  },
  mapaContainer: {
    height: '300px',
    marginBottom: '15px'
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px'
  },
  instrucciones: {
    color: '#7f8c8d',
    marginBottom: '15px'
  },
  direccionContainer: {
    marginBottom: '15px'
  },
  direccion: {
    padding: '10px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
    marginTop: '5px'
  },
  botonConfirmar: {
    padding: '10px 20px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    ':disabled': {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed'
    }
  }
};

export default MapaUbicacion; 