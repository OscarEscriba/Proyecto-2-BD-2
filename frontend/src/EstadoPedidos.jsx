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
      
      let url = `http://localhost:4000/pedidos?usuarioId=${currentUser?.id}`;
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
              const productos = pedido.productos || pedido.Productos;
              const tipoEntrega = pedido.tipo_entrega || pedido.Tipo_entrega;
              const total = pedido.total !== undefined ? pedido.total : pedido.Total;
              const estado = pedido.Estado || pedido.estado;
              const fecha = pedido.Fecha || pedido.fecha;

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
                  </div>

                  <div className="productos-lista">
                    <h4>Productos:</h4>
                    <ul>
                      {Array.isArray(productos) && productos.length > 0 ? (
                        productos.map((producto, i) => (
                          <li key={i}>
                            {(producto.nombre || producto.Nombre) || 'Producto'} x{producto.cantidad || 1}
                            {(producto.precio !== undefined || producto.Precio !== undefined) && (
                              <span>
                                (Q{Number(producto.precio !== undefined ? producto.precio : producto.Precio).toFixed(2)})
                              </span>
                            )}
                          </li>
                        ))
                      ) : (
                        <li style={{ color: '#95a5a6' }}>No hay productos en este pedido</li>
                      )}
                    </ul>
                  </div>
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