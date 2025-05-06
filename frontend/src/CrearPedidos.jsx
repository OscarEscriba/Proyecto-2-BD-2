// CLIENTE CREAR PEDIDOS MULTIPLES
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapaUbicacion from './components/MapaUbicacion';

// Datos de ejemplo - reemplazar con tus productos reales
const productosEjemplo = [
  { _id: '1', Nombre: 'Hamburguesa Clásica', Precio: 45 },
  { _id: '2', Nombre: 'Pizza Mediana', Precio: 80 },
  { _id: '3', Nombre: 'Ensalada César', Precio: 35 },
];

const CrearPedidos = () => {
  const [tickets, setTickets] = useState([{ 
    productos: [], 
    tipo_entrega: 'domicilio', 
    total: 0,
    ubicacion: null 
  }]);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const handleAgregarTicket = () => {
    setTickets([...tickets, {
      productos: [],
      tipo_entrega: 'domicilio',
      total: 0,
      ubicacion: null
    }]);
  };

  const handleEliminarTicket = (index) => {
    const nuevosTickets = tickets.filter((_, i) => i !== index);
    setTickets(nuevosTickets);
  };

  const handleProductosChange = (index, productosSeleccionados) => {
    const nuevosTickets = [...tickets];
    nuevosTickets[index].productos = productosSeleccionados;
    
    // Calcular total
    nuevosTickets[index].total = productosSeleccionados.reduce(
      (sum, producto) => sum + producto.Precio, 0
    );
    
    setTickets(nuevosTickets);
  };

  const handleUbicacionChange = (index, ubicacion) => {
    const nuevosTickets = [...tickets];
    nuevosTickets[index].ubicacion = ubicacion;
    setTickets(nuevosTickets);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que todos los tickets con entrega a domicilio tengan ubicación
    const ticketSinUbicacion = tickets.findIndex(ticket => 
      ticket.tipo_entrega === 'domicilio' && !ticket.ubicacion
    );
    
    if (ticketSinUbicacion !== -1) {
      alert(`Por favor, selecciona una ubicación para el Ticket #${ticketSinUbicacion + 1}`);
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Preparar los datos a enviar
    const datosEnvio = {
      usuarioId: currentUser.id,
      tickets: tickets
    };
    
    // Depuración: Imprimir los datos que vamos a enviar
    console.log('📦 Datos de pedidos a enviar:', JSON.stringify(datosEnvio, null, 2));

    try {
      const response = await fetch('http://localhost:4000/pedidos/multiples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnvio)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`${data.mensaje}\nIDs: ${data.ids.join(', ')}`);
        navigate('/EstadoPedidos'); // Redirigir a la página de estado de pedidos
      } else {
        throw new Error(data.error || 'Error al crear pedidos');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>🍔 Crear Tickets de Pedido</h2>
      
      <form onSubmit={handleSubmit}>
        {tickets.map((ticket, index) => (
          <div 
            key={index}
            style={{
              border: '2px solid #eee',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              backgroundColor: '#f8f9fa'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3>Ticket #{index + 1}</h3>
              {tickets.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleEliminarTicket(index)}
                  style={{
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 10px',
                    cursor: 'pointer'
                  }}
                >
                  Eliminar
                </button>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Productos: </label>
              <select
                multiple
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  marginTop: '5px',
                  height: '150px'
                }}
                value={ticket.productos.map(p => p._id)}
                onChange={(e) => handleProductosChange(
                  index,
                  Array.from(e.target.selectedOptions)
                    .map(opt => productosEjemplo.find(p => p._id === opt.value))
                )}
              >
                {productosEjemplo.map(producto => (
                  <option key={producto._id} value={producto._id}>
                    {producto.Nombre} - Q{producto.Precio}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Tipo de entrega: </label>
              <select
                value={ticket.tipo_entrega}
                onChange={(e) => {
                  const nuevosTickets = [...tickets];
                  nuevosTickets[index].tipo_entrega = e.target.value;
                  setTickets(nuevosTickets);
                }}
                style={{ padding: '5px', marginLeft: '10px' }}
              >
                <option value="domicilio">Domicilio</option>
                <option value="recoger">Recoger en local</option>
              </select>
            </div>

            {/* Componente de Geolocalización */}
            {ticket.tipo_entrega === 'domicilio' && (
              <div style={{ marginBottom: '15px' }}>
                <MapaUbicacion 
                  onChange={(ubicacion) => handleUbicacionChange(index, ubicacion)}
                />
                {ticket.ubicacion && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    backgroundColor: '#e1f5fe', 
                    borderRadius: '5px' 
                  }}>
                    <p><strong>📍 Dirección de entrega:</strong> {ticket.ubicacion.direccion}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <strong>Total: </strong> Q{ticket.total.toFixed(2)}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleAgregarTicket}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ➕ Agregar otro ticket
          </button>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🚀 Crear {tickets.length} tickets
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearPedidos;