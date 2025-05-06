import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Principal = () => {
  const [productos, setProductos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [orden, setOrden] = useState('asc');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductos = async () => {
    try {
      setCargando(true);
      setError(null);
      
      let url = 'http://localhost:4000/productos';
      const params = new URLSearchParams();
      
      if (tipoFiltro) params.append('Categoría', tipoFiltro);
      if (orden) params.append('ordenar', orden);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Sanitizar datos: asegurar que Ingredientes sea siempre un array
      const productosSanitizados = data.map(producto => ({
        ...producto,
        Ingredientes: Array.isArray(producto.Ingredientes) ? producto.Ingredientes : []
      }));
      
      setProductos(productosSanitizados);
      
    } catch (err) {
      console.error('Error fetching productos:', err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [tipoFiltro, orden]);

  if (cargando) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh'
      }}>
        <div className="spinner"></div>
        <style>{`
          .spinner {
            border: 4px solid #f3f3f3;
            border-radius: 50%;
            border-top: 4px solid #3498db;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffe6e6', 
        border: '1px solid #ff9999',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h3 style={{ color: '#cc0000' }}>⚠️ Error al cargar productos</h3>
        <p>{error}</p>
        <button 
          onClick={fetchProductos}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#2c3e50', 
        marginBottom: '30px',
        fontSize: '2em'
      }}>
        🍽️ Nuestro Menú
      </h2>

            <div style={{ 
            marginBottom: '30px',
            borderBottom: '2px solid #eee',
            paddingBottom: '20px'
            }}>
            <nav>
                <Link 
                to="/EstadoPedidos"
                style={{
                    textDecoration: 'none',
                    color: '#3498db',
                    padding: '8px 15px',
                    borderRadius: '5px',
                    backgroundColor: '#f8f9fa',
                    marginRight: '10px',
                    display: 'inline-block'
                }}
                >
                📦 Ver mis pedidos
                </Link>
                <Link 
                    to="/CrearPedidos"
                    style={{
                        textDecoration: 'none',
                        color: '#2ecc71',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        backgroundColor: '#f8f9fa',
                        marginRight: '10px'
                    }}
                    >
                    🛒 Crear nuevos tickets
                </Link>
                <Link 
                    to="/Resenas"
                    style={{
                        textDecoration: 'none',
                        color: '#f39c12',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        backgroundColor: '#f8f9fa',
                    }}
                    >
                    ⭐ Ver reseñas
                </Link>
            </nav>
            </div>
      {/* Controles de Filtrado */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <div>
            <label style={{ 
              fontWeight: '500', 
              marginRight: '10px',
              color: '#34495e'
            }}>
              Filtrar por tipo:
            </label>
            <select
              onChange={(e) => setTipoFiltro(e.target.value)}
              value={tipoFiltro}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                minWidth: '200px'
              }}
            >
              <option value="">Todos los productos</option>     
              <option value="Plato">Platos principales</option>
              <option value="Entrante">Entrantes</option>
              <option value="Postre">Postres</option>
              <option value="Bebida">Bebidas</option>
            </select>
          </div>

          <div>
            <label style={{ 
              fontWeight: '500', 
              marginRight: '10px',
              color: '#34495e'
            }}>
              Ordenar por precio:
            </label>
            <select
              onChange={(e) => setOrden(e.target.value)}
              value={orden}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                minWidth: '200px'
              }}
            >
              <option value="asc">De menor a mayor</option>
              <option value="desc">De mayor a menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listado de Productos */}
      {productos.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <p style={{ color: '#7f8c8d' }}>No se encontraron productos con estos filtros</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '25px',
          padding: '10px'
        }}>
          {productos.map((p, idx) => (
            <div 
              key={idx}
              style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                ':hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <h3 style={{ 
                marginTop: '0', 
                color: '#2c3e50',
                fontSize: '1.4em',
                marginBottom: '10px'
              }}>
                {p.Nombre}
              </h3>
              
              <p style={{ 
                fontSize: '1.3em', 
                color: '#27ae60',
                fontWeight: 'bold',
                marginBottom: '15px'
              }}>
                Q{p.Precio.toFixed(2)}
              </p>
              
              <p style={{ 
                color: '#7f8c8d',
                lineHeight: '1.6',
                marginBottom: '15px'
              }}>
                {p.Descripcion}
              </p>
              
              {p.Ingredientes.length > 0 && (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '6px',
                  padding: '15px',
                  marginTop: '15px'
                }}>
                  <strong style={{ 
                    display: 'block',
                    color: '#34495e',
                    marginBottom: '10px'
                  }}>
                    🧄 Ingredientes principales:
                  </strong>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {p.Ingredientes.map((ingrediente, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#e8f4f8',
                          color: '#2c3e50',
                          padding: '4px 10px',
                          borderRadius: '15px',
                          fontSize: '0.9em'
                        }}
                      >
                        {ingrediente}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Botón para ver reseñas del producto */}
              <div style={{
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Link
                  to={`/ResenaProducto/${idx + 1}`}
                  state={{ producto: {
                    id: idx + 1,
                    nombre: p.Nombre,
                    precio: p.Precio,
                    descripcion: p.Descripcion || '',
                    categoria: p.Categoría || ''
                  }}}
                  style={{
                    display: 'inline-block',
                    padding: '8px 15px',
                    backgroundColor: '#f39c12',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    textAlign: 'center'
                  }}
                >
                  ⭐ Ver opiniones de este producto
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Principal;