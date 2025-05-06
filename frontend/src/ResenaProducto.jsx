import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';

const ResenaProducto = () => {
  const { productoId } = useParams();
  const location = useLocation();
  const productoInfo = location.state?.producto; // Datos pasados desde la página principal
  
  const [producto, setProducto] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [ordenamiento, setOrdenamiento] = useState('recientes');
  const [nuevaResena, setNuevaResena] = useState({
    calificacion: 5,
    comentario: ''
  });
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // Obtener datos del producto
  useEffect(() => {
    // Si recibimos info del producto a través del state, la usamos
    if (productoInfo) {
      setProducto(productoInfo);
      setCargando(false);
    } else {
      // Datos de respaldo en caso de que no recibamos info (ej. si el usuario recarga la página)
      const productosEjemplo = [
        { id: '1', nombre: 'Pizza Margherita', precio: 85, imagen: 'pizza.jpg' },
        { id: '2', nombre: 'Pasta Carbonara', precio: 95, imagen: 'pasta.jpg' },
        { id: '3', nombre: 'Lasagna', precio: 110, imagen: 'lasagna.jpg' },
        { id: '4', nombre: 'Tiramisu', precio: 65, imagen: 'tiramisu.jpg' },
      ];
      
      // Encontrar el producto por ID o usar datos genéricos
      const encontrado = productosEjemplo.find(p => p.id === productoId) || {
        id: productoId,
        nombre: 'Producto ' + productoId,
        precio: 99
      };
      
      setProducto(encontrado);
      setCargando(false);
    }
    
    // Cargar reseñas almacenadas
    obtenerResenas();
  }, [productoId, productoInfo]);

  // Obtener reseñas
  const obtenerResenas = async () => {
    setCargando(true);
    setError(null);
    
    try {
      let ordenParam = '';
      switch(ordenamiento) {
        case 'mejores': ordenParam = 'calificacion_desc'; break;
        case 'peores': ordenParam = 'calificacion_asc'; break;
        default: ordenParam = ''; // recientes
      }
      
      // Petición a la API para obtener reseñas del producto
      const response = await fetch(`http://localhost:4000/resenas/producto/${productoId}?orden=${ordenParam}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResenas(data);
      
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
      setError('No se pudieron cargar las reseñas. Por favor, intenta de nuevo más tarde.');
      
      // Como respaldo, cargar desde localStorage
      try {
        // Obtener todas las reseñas del localStorage
        const todasLasResenas = localStorage.getItem('resenasProductos') 
          ? JSON.parse(localStorage.getItem('resenasProductos')) 
          : {};
        
        // Obtener reseñas específicas para este producto
        const resenasProducto = todasLasResenas[productoId] || [];
        
        // Ordenar según el criterio seleccionado
        let resenasOrdenadas = [...resenasProducto];
        
        if (ordenamiento === 'mejores') {
          resenasOrdenadas.sort((a, b) => b.calificacion - a.calificacion);
        } else if (ordenamiento === 'peores') {
          resenasOrdenadas.sort((a, b) => a.calificacion - b.calificacion);
        } else {
          // Por defecto, ordenar por fecha (más recientes primero)
          resenasOrdenadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        
        setResenas(resenasOrdenadas);
        setError('Usando datos locales (no sincronizados con el servidor)');
      } catch (e) {
        setResenas([]);
      }
    } finally {
      setCargando(false);
    }
  };

  // Enviar una nueva reseña
  const enviarResena = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Debes iniciar sesión para dejar una reseña');
      return;
    }

    setEnviando(true);
    setError(null);
    
    try {
      // Enviar reseña a la API
      const response = await fetch('http://localhost:4000/resenas/producto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario_id: currentUser.id,
          producto_id: productoId,
          calificacion: parseInt(nuevaResena.calificacion),
          comentario: nuevaResena.comentario
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Limpiar formulario
      setNuevaResena({ calificacion: 5, comentario: '' });
      
      // Recargar reseñas
      obtenerResenas();
      
      alert('¡Reseña publicada con éxito!');
    } catch (error) {
      console.error('Error al publicar reseña:', error);
      setError(`Error al publicar la reseña: ${error.message}`);
      
      // Como respaldo, guardar en localStorage
      try {
        // Crear la nueva reseña localmente
        const nuevaResenaObj = {
          _id: Date.now().toString(),
          usuario_id: currentUser.id,
          producto_id: productoId,
          calificacion: parseInt(nuevaResena.calificacion),
          comentario: nuevaResena.comentario,
          fecha: new Date().toISOString(),
          usuario: {
            nombre: currentUser.email.split('@')[0]
          }
        };

        // Obtener las reseñas existentes
        const todasLasResenas = localStorage.getItem('resenasProductos') 
          ? JSON.parse(localStorage.getItem('resenasProductos')) 
          : {};
        
        // Verificar si ya existen reseñas para este producto
        if (!todasLasResenas[productoId]) {
          todasLasResenas[productoId] = [];
        }
        
        // Añadir la nueva reseña
        todasLasResenas[productoId].push(nuevaResenaObj);
        
        // Guardar en localStorage
        localStorage.setItem('resenasProductos', JSON.stringify(todasLasResenas));

        // Recargar reseñas desde localStorage
        obtenerResenas();
        
        alert('Reseña guardada localmente (no sincronizada con el servidor)');
      } catch (localError) {
        alert('No se pudo guardar la reseña. Por favor, intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  // Eliminar reseña
  const eliminarResena = async (resenaId) => {
    if (!currentUser) return;
    if (!window.confirm('¿Estás seguro de eliminar esta reseña?')) return;

    setCargando(true);
    setError(null);
    
    try {
      // Eliminar reseña mediante la API
      const response = await fetch(`http://localhost:4000/resenas/${resenaId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario_id: currentUser.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      // Recargar reseñas
      obtenerResenas();
      
      alert('Reseña eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar reseña:', error);
      setError(`Error al eliminar la reseña: ${error.message}`);
      
      // Como respaldo, intentar eliminar de localStorage
      try {
        // Obtener todas las reseñas
        const todasLasResenas = localStorage.getItem('resenasProductos') 
          ? JSON.parse(localStorage.getItem('resenasProductos')) 
          : {};
        
        // Filtrar la reseña a eliminar
        if (todasLasResenas[productoId]) {
          todasLasResenas[productoId] = todasLasResenas[productoId].filter(
            r => r._id !== resenaId
          );
          
          // Guardar en localStorage
          localStorage.setItem('resenasProductos', JSON.stringify(todasLasResenas));
        }
        
        // Recargar reseñas desde localStorage
        obtenerResenas();
        
        alert('Reseña eliminada de almacenamiento local');
      } catch (localError) {
        alert('No se pudo eliminar la reseña. Por favor, intenta de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  // Renderizar estrellas según la calificación
  const renderEstrellas = (calificacion) => {
    const estrellas = [];
    for (let i = 1; i <= 5; i++) {
      estrellas.push(
        <span key={i} style={{ color: i <= calificacion ? '#f1c40f' : '#bdc3c7' }}>
          ★
        </span>
      );
    }
    return estrellas;
  };

  // Formatear fecha
  const formatearFecha = (fechaISO) => {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fechaISO).toLocaleDateString('es-ES', opciones);
  };

  // Calcular calificación promedio
  const calcularPromedio = () => {
    if (resenas.length === 0) return 0;
    const suma = resenas.reduce((total, resena) => total + resena.calificacion, 0);
    return suma / resenas.length;
  };

  const promedioCalificacion = calcularPromedio();

  if (cargando && !producto) {
    return <div style={styles.loadingMessage}>Cargando información del producto...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/PaginaPrincipal" style={styles.backButton}>
          ← Volver al menú
        </Link>
        <h1>Reseñas del Producto</h1>
      </div>

      {/* Información del producto */}
      <div style={styles.productoInfo}>
        <h2>{producto.nombre}</h2>
        <p style={styles.precio}>Q{producto.precio.toFixed(2)}</p>
        <div style={styles.calificacionPromedio}>
          {renderEstrellas(promedioCalificacion)}
          <span style={styles.promedioText}>
            {resenas.length > 0 ? 
              `${promedioCalificacion.toFixed(1)} / 5 (${resenas.length} reseñas)` : 
              'Sin calificaciones'}
          </span>
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Formulario para enviar una nueva reseña */}
      <div style={styles.formContainer}>
        <h3>Deja tu opinión sobre este producto</h3>
        {currentUser ? (
          <form onSubmit={enviarResena} style={styles.form}>
            <div style={styles.calificacionSelector}>
              <label>Tu calificación: </label>
              <select 
                value={nuevaResena.calificacion}
                onChange={(e) => setNuevaResena({...nuevaResena, calificacion: e.target.value})}
                style={styles.select}
              >
                <option value="5">5 - Excelente</option>
                <option value="4">4 - Muy bueno</option>
                <option value="3">3 - Bueno</option>
                <option value="2">2 - Regular</option>
                <option value="1">1 - Malo</option>
              </select>
            </div>
            
            <textarea
              placeholder="¿Qué te pareció este producto? ¿Cómo fue su sabor, presentación, calidad, etc?"
              value={nuevaResena.comentario}
              onChange={(e) => setNuevaResena({...nuevaResena, comentario: e.target.value})}
              style={styles.textarea}
              required
            />
            
            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={enviando}
            >
              {enviando ? 'Enviando...' : 'Publicar Reseña'}
            </button>
          </form>
        ) : (
          <p style={styles.loginMessage}>
            Para dejar una reseña, necesitas <Link to="/Login">iniciar sesión</Link>
          </p>
        )}
      </div>

      {/* Selector de ordenamiento */}
      <div style={styles.filterContainer}>
        <label>Ordenar por: </label>
        <select 
          value={ordenamiento}
          onChange={(e) => {
            setOrdenamiento(e.target.value);
          }}
          style={styles.filterSelect}
        >
          <option value="recientes">Más recientes</option>
          <option value="mejores">Mejor calificados</option>
          <option value="peores">Peor calificados</option>
        </select>
      </div>

      {/* Lista de reseñas */}
      <div style={styles.resenasList}>
        {cargando ? (
          <div style={styles.loadingMessage}>Cargando reseñas...</div>
        ) : resenas.length === 0 ? (
          <div style={styles.emptyMessage}>
            Aún no hay reseñas para este producto. ¡Sé el primero en dejar tu opinión!
          </div>
        ) : (
          resenas.map((resena) => (
            <div key={resena._id} style={styles.resenaCard}>
              <div style={styles.resenaHeader}>
                <div>
                  <div style={styles.calificacion}>
                    {renderEstrellas(resena.calificacion)}
                  </div>
                  <div style={styles.usuario}>
                    Por: {resena.usuario?.nombre || 'Usuario'}
                  </div>
                </div>
                
                <div style={styles.fecha}>
                  {formatearFecha(resena.fecha)}
                </div>
              </div>
              
              <div style={styles.comentario}>
                {resena.comentario}
              </div>
              
              {/* Botón eliminar (solo visible para el autor) */}
              {currentUser && resena.usuario_id.toString() === currentUser.id && (
                <button 
                  onClick={() => eliminarResena(resena._id)}
                  style={styles.deleteButton}
                >
                  Eliminar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px'
  },
  backButton: {
    textDecoration: 'none',
    color: '#3498db',
    marginRight: '20px',
    fontSize: '16px'
  },
  productoInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  precio: {
    color: '#27ae60',
    fontSize: '1.2em',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  calificacionPromedio: {
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center'
  },
  promedioText: {
    marginLeft: '10px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  calificacionSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd'
  },
  textarea: {
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    minHeight: '100px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  submitButton: {
    padding: '10px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  loginMessage: {
    color: '#7f8c8d',
    textAlign: 'center'
  },
  filterContainer: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  filterSelect: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd'
  },
  resenasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  resenaCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  resenaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  calificacion: {
    fontSize: '20px',
    marginBottom: '5px'
  },
  usuario: {
    color: '#34495e',
    fontWeight: 'bold'
  },
  fecha: {
    color: '#7f8c8d',
    fontSize: '0.9em'
  },
  comentario: {
    lineHeight: '1.6',
    marginTop: '10px',
    color: '#2c3e50'
  },
  deleteButton: {
    marginTop: '15px',
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8em'
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '30px',
    color: '#7f8c8d'
  },
  errorMessage: {
    textAlign: 'center',
    padding: '15px',
    color: '#e74c3c',
    backgroundColor: '#fff4f4',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e74c3c'
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '30px',
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  }
};

export default ResenaProducto; 