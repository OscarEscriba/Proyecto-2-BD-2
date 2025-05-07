// CLIENTE CREAR PEDIDOS MULTIPLES
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapaUbicacion from './components/MapaUbicacion';

// Datos de ejemplo - reemplazar con tus productos reales
const productosEjemplo = [
  { _id: '1', Nombre: 'Pizza Margherita', Precio: 12.50 },
  { _id: '2', Nombre: 'Pizza Pepperoni', Precio: 14 },
  { _id: '3', Nombre: 'Pizza', Precio: 12.50 },
  { _id: '4', Nombre: 'Pasta Carbonara', Precio: 11 },
  { _id: '5', Nombre: 'Pasta al Pesto', Precio: 10.50 },
  { _id: '6', Nombre: 'Espresso', Precio: 3 },
  { _id: '7', Nombre: 'Ensalada Caprese', Precio: 8 },
  { _id: '8', Nombre: 'Tiramisú', Precio: 6.5 },
  { _id: '9', Nombre: 'Lasaña Tradicional', Precio: 13 },
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
    
    // Obtener los IDs de los productos ya seleccionados
    const productosExistentesIds = nuevosTickets[index].productos.map(p => p._id);
    
    // Filtrar los productos seleccionados para mantener solo los nuevos
    const productosNuevos = productosSeleccionados.filter(
      producto => !productosExistentesIds.includes(producto._id)
    );
    
    // Combinar productos existentes con los nuevos seleccionados
    nuevosTickets[index].productos = [...nuevosTickets[index].productos, ...productosNuevos];
    
    // Calcular total
    nuevosTickets[index].total = nuevosTickets[index].productos.reduce(
      (sum, producto) => sum + producto.Precio, 0
    );
    
    setTickets(nuevosTickets);
  };

  const handleEliminarProducto = (ticketIndex, productoId) => {
    const nuevosTickets = [...tickets];
    nuevosTickets[ticketIndex].productos = nuevosTickets[ticketIndex].productos.filter(
      p => p._id !== productoId
    );
    
    // Recalcular el total
    nuevosTickets[ticketIndex].total = nuevosTickets[ticketIndex].productos.reduce(
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
    
    if (!currentUser || !currentUser.id) {
      alert('Debes iniciar sesión para crear pedidos');
      return;
    }
    
    // Preparar los datos para enviar
    const pedidosFormateados = tickets.map(ticket => {
      // Formatear los productos para asegurar que solo enviamos los datos necesarios
      const productosFormateados = ticket.productos.map(producto => {
        // Solo incluir propiedades relevantes del producto y asegurar nombres de propiedades consistentes
        return {
          _id: producto._id,
          nombre: producto.Nombre,
          precio: producto.Precio,
          cantidad: 1 // Valor por defecto
        };
      });
      
      // Crear una copia del ticket con los datos formateados
      return {
        productos: productosFormateados,
        total: ticket.total,
        tipo_entrega: ticket.tipo_entrega,
        ubicacion: ticket.ubicacion
      };
    });
    
    const datosEnvio = {
      usuarioId: currentUser.id,
      tickets: pedidosFormateados
    };
    
    try {
      const response = await fetch('http://localhost:4000/pedidos/multiples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnvio)
      });

      const responseText = await response.text();
      
      // Procesar la respuesta
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Respuesta no válida del servidor: ' + responseText);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear pedidos');
      }
      
      alert(`${data.mensaje}\nIDs: ${data.ids.join(', ')}\nGuardados en colección: ${data.coleccion || 'Pedidos'}`);
      navigate('/EstadoPedidos'); // Redirigir a la página de estado de pedidos
      
    } catch (error) {
      console.error('Error al crear pedidos:', error);
      alert('Error al crear pedidos: ' + error.message);
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
                value={[]} // No mantenemos selección visual en el select
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
              
              {/* Lista de productos seleccionados */}
              {ticket.productos.length > 0 && (
                <div style={{ 
                  marginTop: '10px', 
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  padding: '10px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h4 style={{ marginTop: '0', marginBottom: '10px' }}>Productos seleccionados:</h4>
                  <ul style={{ 
                    listStyleType: 'none', 
                    padding: '0', 
                    margin: '0' 
                  }}>
                    {ticket.productos.map((producto, prodIndex) => (
                      <li key={prodIndex} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 0',
                        borderBottom: prodIndex < ticket.productos.length - 1 ? '1px solid #eee' : 'none'
                      }}>
                        <span>{producto.Nombre} - Q{producto.Precio.toFixed(2)}</span>
                        <button 
                          type="button"
                          onClick={() => handleEliminarProducto(index, producto._id)}
                          style={{
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            fontSize: '0.8em'
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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