import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const EstadoPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const obtenerPedidos = async () => {
    try {
      setCargando(true);
      
      if (!currentUser?.id) {
        console.error('No hay usuario logueado o falta ID');
        return;
      }
      
      let url = `http://localhost:4000/pedidos?usuarioId=${currentUser.id}`;
      if(estadoFiltro) url += `&estado=${estadoFiltro}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if(response.ok) {
        setPedidos(data);
      } else {
        throw new Error(data.error || 'Error al obtener pedidos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarPedido = async (pedidoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este pedido?')) return;
    try {
      const response = await fetch(`http://localhost:4000/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: currentUser.id })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.mensaje);
        obtenerPedidos(); // Refresca la lista
      } else {
        alert(data.error || 'No se pudo eliminar el pedido');
      }
    } catch (error) {
      alert('Error al eliminar el pedido');
    }
  };

  const eliminarTodosPedidos = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar TODOS tus pedidos?')) return;
    try {
      const response = await fetch(`http://localhost:4000/pedidos/usuario/${currentUser.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.mensaje);
        obtenerPedidos(); // Refresca la lista
      } else {
        alert(data.error || 'No se pudieron eliminar los pedidos');
      }
    } catch (error) {
      alert('Error al eliminar los pedidos');
    }
  };

  useEffect(() => {
    if(currentUser?.id) obtenerPedidos();
  }, [estadoFiltro]);

  const formatearFecha = (fechaISO) => {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(fechaISO).toLocaleDateString('es-ES', opciones);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📦 Mis Pedidos</h1>
        <Link to="/PaginaPrincipal" className="btn-volver">
          ← Volver al Menú
        </Link>
      </div>

      <div className="filtros">
        <select 
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="select-filtro"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="en_proceso">En Proceso</option>
          <option value="completado">Completados</option>
        </select>
      </div>

      {pedidos.length > 0 && (
        <button
          onClick={eliminarTodosPedidos}
          style={{
            marginBottom: '20px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          🗑️ Eliminar todos mis pedidos
        </button>
      )}

      {cargando ? (
        <div className="cargando">Cargando pedidos...</div>
      ) : (
        <div className="lista-pedidos">
          {pedidos.length === 0 ? (
            <div className="sin-pedidos">
              No se encontraron pedidos con estos filtros
            </div>
          ) : (
            pedidos.map((pedido, index) => {
              // Compatibilidad de campos
              
              // Verificar formato de Productos y convertir si es necesario
              let productos = [];
              
              if (pedido.productos || pedido.Productos) {
                const productosRaw = pedido.productos || pedido.Productos;
                
                // Verificar si los productos son strings (IDs) o objetos
                if (Array.isArray(productosRaw)) {
                  if (productosRaw.length > 0) {
                    // Si el primer elemento es un string, son IDs
                    if (typeof productosRaw[0] === 'string') {
                      productos = productosRaw.map((id, idx) => ({
                        _id: id,
                        Nombre: `Producto #${idx + 1}`,
                        Precio: 0,
                        cantidad: 1
                      }));
                    } else {
                      // Son objetos normales
                      productos = productosRaw;
                    }
                  } else {
                    productos = [];
                  }
                } else {
                  // No es un array
                  productos = [];
                }
              } else {
                productos = [];
              }
              
              const tipoEntrega = pedido.tipo_entrega || pedido.Tipo_entrega;
              const total = pedido.total !== undefined ? pedido.total : (pedido.Total !== undefined ? pedido.Total : 0);
              const estado = pedido.Estado || pedido.estado || 'desconocido';
              const fecha = pedido.Fecha || pedido.fecha || new Date().toISOString();

              return (
                <div key={pedido._id} className="pedido-card">
                  <div className="pedido-header">
                    <h3>Pedido #{index + 1}</h3>
                    <span className={`estado ${estado}`}>
                      {estado}
                    </span>
                  </div>

                  <div className="pedido-info">
                    <p className="fecha">🗓️ {formatearFecha(fecha)}</p>
                    <p className="total">💰 Total: Q{Number(total)?.toFixed(2)}</p>
                    <p className="entrega">🚚 Entrega: {tipoEntrega}</p>
                    <p className="id">🔑 ID: {pedido._id.toString().substring(0, 8)}...</p>
                  </div>
                  
                  {/* Mostrar ubicación si es pedido a domicilio - Compatible con diferentes formatos */}
                  {(tipoEntrega === 'domicilio' || tipoEntrega === 'Domicilio') && (
                    <div className="ubicacion-entrega" style={{ 
                      marginTop: '5px', 
                      marginBottom: '15px',
                      padding: '10px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '5px'
                    }}>
                      {pedido.ubicacion_entrega ? (
                        <p style={{ margin: '0' }}>
                          <strong>📍 Dirección de entrega:</strong> {pedido.ubicacion_entrega.direccion}
                        </p>
                      ) : pedido.ubicacion ? (
                        <p style={{ margin: '0' }}>
                          <strong>📍 Dirección de entrega:</strong> {pedido.ubicacion.direccion}
                        </p>
                      ) : (
                        <p style={{ margin: '0', color: '#95a5a6' }}>
                          <strong>📍 Dirección:</strong> No disponible
                        </p>
                      )}
                    </div>
                  )}

                  <div className="productos-lista">
                    <h4>Productos:</h4>
                    <ul>
                      {Array.isArray(productos) && productos.length > 0 ? (
                        productos.map((producto, i) => (
                          <li key={i}>
                            {(producto.nombre || producto.Nombre) || `Producto ID: ${producto._id?.substring(0, 8) || i}`}
                            {producto.cantidad ? ` x${producto.cantidad}` : ''}
                            {(producto.precio !== undefined || producto.Precio !== undefined) && (
                              <span>
                                (Q{Number(producto.precio !== undefined ? producto.precio : producto.Precio).toFixed(2)})
                              </span>
                            )}
                          </li>
                        ))
                      ) : (
                        <li style={{ color: '#95a5a6' }}>No hay productos en este pedido o formato no reconocido</li>
                      )}
                    </ul>
                  </div>
                  <button
                    onClick={() => eliminarPedido(pedido._id)}
                    className="btn-eliminar"
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
            })
          )}
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .btn-volver {
          text-decoration: none;
          color: #3498db;
          padding: 10px 20px;
          border: 1px solid #3498db;
          border-radius: 5px;
        }
        .filtros {
          margin-bottom: 25px;
        }
        .select-filtro {
          padding: 8px 15px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        .lista-pedidos {
          display: grid;
          gap: 20px;
        }
        .pedido-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .pedido-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .estado {
          padding: 5px 15px;
          border-radius: 15px;
          font-size: 0.9em;
        }
        .estado.pendiente { background: #f39c12; color: white; }
        .estado.en_proceso { background: #3498db; color: white; }
        .estado.completado { background: #2ecc71; color: white; }
        .pedido-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }
        .productos-lista ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .productos-lista li {
          margin: 5px 0;
        }
        .cargando, .sin-pedidos {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
      `}</style>
    </div>
  );
};

export default EstadoPedidos;