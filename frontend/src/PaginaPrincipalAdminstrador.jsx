import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PaginaPrincipalAdministrador = () => {
  const [pedidos, setPedidos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPedidos, setSelectedPedidos] = useState(new Set());

  const fetchPedidos = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/pedidos/admin?page=${page}&limit=15`);
      const data = await response.json();
      
      if (response.ok) {
        setPedidos(data.pedidos);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalPedidos(data.totalPedidos);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const togglePedidoSelection = (pedidoId) => {
    const newSelection = new Set(selectedPedidos);
    newSelection.has(pedidoId) ? newSelection.delete(pedidoId) : newSelection.add(pedidoId);
    setSelectedPedidos(newSelection);
  };

  const handleEliminarPedidos = async () => {
    if (!selectedPedidos.size || !window.confirm(`¿Eliminar ${selectedPedidos.size} pedidos?`)) return;
    
    try {
      const response = await fetch('http://localhost:4000/pedidos/multiples', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedPedidos) })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(data.mensaje);
        fetchPedidos(currentPage);
        setSelectedPedidos(new Set());
      }
    } catch (error) {
      alert('Error eliminando pedidos');
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    if (!selectedPedidos.size || !nuevoEstado || 
        !window.confirm(`¿Cambiar estado de ${selectedPedidos.size} pedidos a "${nuevoEstado}"?`)) return;
    
    try {
      const response = await fetch('http://localhost:4000/pedidos/actualizar-estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedPedidos),
          nuevoEstado 
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(data.mensaje);
        fetchPedidos(currentPage);
        setSelectedPedidos(new Set());
      }
    } catch (error) {
      alert('Error actualizando pedidos');
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const eliminarPedidoAdmin = async (pedidoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este pedido?')) return;
    try {
      const response = await fetch(`http://localhost:4000/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.mensaje);
        fetchPedidos(currentPage); // Refresca la lista
      } else {
        alert(data.error || 'No se pudo eliminar el pedido');
      }
    } catch (error) {
      alert('Error al eliminar el pedido');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.titulo}>🍝 Ristorante Italiano 1</h1>
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>← Volver al inicio</Link>
        </nav>
      </header>

      {selectedPedidos.size > 0 && (
        <div style={styles.acciones}>
          <div style={styles.contador}>
            📌 Seleccionados: {selectedPedidos.size}
          </div>
          
          <select 
            onChange={(e) => handleCambiarEstado(e.target.value)}
            style={styles.select}
            defaultValue=""
          >
            <option value="" disabled>Cambiar estado...</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
          </select>

          <button 
            onClick={handleEliminarPedidos}
            style={styles.botonEliminar}
          >
            🗑️ Eliminar seleccionados
          </button>
        </div>
      )}

      <main style={styles.main}>
        <div style={styles.controles}>
          <div style={styles.paginacion}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={styles.botonPaginacion}
            >
              ◀
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={styles.botonPaginacion}
            >
              ▶
            </button>
          </div>
          <div style={styles.total}>Total de pedidos: {totalPedidos}</div>
        </div>

        {loading ? (
          <div style={styles.cargando}>Cargando pedidos...</div>
        ) : (
          <div style={styles.lista}>
            {pedidos.map(pedido => {
              // Compatibilidad de campos
              const productos = pedido.productos || pedido.Productos;
              const tipoEntrega = pedido.tipo_entrega || pedido.Tipo_entrega;
              const total = pedido.total !== undefined ? pedido.total : pedido.Total;
              const estado = pedido.Estado || pedido.estado;
              const usuario = pedido.Usuario_id || pedido.usuario_id;
              const fecha = pedido.Fecha || pedido.fecha;

              return (
                <div 
                  key={pedido._id} 
                  style={{
                    ...styles.pedido,
                    borderColor: selectedPedidos.has(pedido._id) ? '#3498db' : '#ddd'
                  }}
                >
                  <div style={styles.pedidoHeader}>
                    <input
                      type="checkbox"
                      checked={selectedPedidos.has(pedido._id)}
                      onChange={() => togglePedidoSelection(pedido._id)}
                      style={styles.checkbox}
                    />
                    <div style={styles.pedidoInfo}>
                      <h3>📦 Pedido #{pedido._id.toString().slice(-6).toUpperCase()}</h3>
                      <span style={{
                        ...styles.estado,
                        backgroundColor: 
                          estado === 'completado' ? '#2ecc71' :
                          estado === 'en_proceso' || estado === 'en preparación' ? '#f1c40f' :
                          estado === 'pendiente' ? '#e74c3c' :
                          '#7f8c8d'
                      }}>
                        {estado}
                      </span>
                    </div>
                  </div>

                  <div style={styles.detalles}>
                    <p>👤 Usuario: {usuario?.toString().slice(-6)}</p>
                    <p>📅 Fecha: {formatearFecha(fecha)}</p>
                    <p>💰 Total: Q{Number(total)?.toFixed(2)}</p>
                    <p>🚚 Entrega: {tipoEntrega}</p>
                  </div>

                  <div style={styles.productos}>
                    <h4>Productos:</h4>
                    {Array.isArray(productos) ? (
                      productos.length > 0 ? (
                        <ul>
                          {productos.map((producto, i) => (
                            <li key={i}>
                              {(producto.nombre || producto.Nombre) || 'Producto'} x{producto.cantidad || 1}
                              {(producto.precio !== undefined || producto.Precio !== undefined) && (
                                <span style={styles.precioProducto}>
                                  (Q{Number(producto.precio !== undefined ? producto.precio : producto.Precio).toFixed(2)})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: '#95a5a6', marginTop: '8px' }}>
                          🛒 No hay productos en este pedido
                        </p>
                      )
                    ) : (
                      <p style={{ color: '#e74c3c', marginTop: '8px' }}>
                        ⚠️ Información de productos no disponible
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarPedidoAdmin(pedido._id)}
                    style={{
                      marginTop: '10px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '8px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  titulo: {
    fontSize: '2.5rem',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  nav: {
    marginTop: '10px'
  },
  navLink: {
    color: '#ecf0f1',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  acciones: {
    position: 'sticky',
    top: '0',
    backgroundColor: '#fff',
    padding: '15px',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: '100'
  },
  contador: {
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #3498db',
    backgroundColor: '#f0f8ff'
  },
  botonEliminar: {
    padding: '8px 16px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#c0392b'
    }
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  controles: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  paginacion: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  botonPaginacion: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    ':disabled': {
      backgroundColor: '#bdc3c7',
      cursor: 'not-allowed'
    }
  },
  total: {
    color: '#7f8c8d'
  },
  lista: {
    display: 'grid',
    gap: '20px'
  },
  pedido: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '2px solid',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  pedidoHeader: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    marginBottom: '15px'
  },
  checkbox: {
    transform: 'scale(1.3)',
    accentColor: '#3498db'
  },
  pedidoInfo: {
    flexGrow: '1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  estado: {
    padding: '6px 15px',
    borderRadius: '15px',
    color: 'white',
    fontSize: '0.9em'
  },
  detalles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '15px',
    color: '#7f8c8d'
  },
  productos: {
    borderTop: '1px solid #eee',
    paddingTop: '15px'
  },
  precio: {
    color: '#27ae60',
    marginLeft: '8px'
  },
  sinProductos: {
    color: '#95a5a6',
    marginTop: '10px'
  },
  cargando: {
    textAlign: 'center',
    padding: '40px',
    color: '#7f8c8d'
  }
};

export default PaginaPrincipalAdministrador;