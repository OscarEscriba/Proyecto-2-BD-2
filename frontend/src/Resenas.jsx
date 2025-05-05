import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Resenas = () => {
  // Usar un ID fijo para el restaurante único
  const restauranteId = "1"; // ID fijo para el único restaurante
  
  const [resenas, setResenas] = useState([]);
  const [ordenamiento, setOrdenamiento] = useState('recientes');
  const [nuevaResena, setNuevaResena] = useState({
    calificacion: 5,
    comentario: ''
  });
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // Nombre del restaurante fijo
  const restauranteNombre = "Ristorante Italiano";

  // Obtener reseñas
  const obtenerResenas = async () => {
    setCargando(true);
    try {
      let ordenParam = '';
      switch(ordenamiento) {
        case 'mejores': ordenParam = 'calificacion_desc'; break;
        case 'peores': ordenParam = 'calificacion_asc'; break;
        default: ordenParam = ''; // recientes
      }

      // Simulamos obtener las reseñas del servidor
      // En un caso real, esto sería un fetch a tu API
      const data = localStorage.getItem('resenas');
      let resenas = data ? JSON.parse(data) : [];
      
      // Ordenar según el parámetro
      if (ordenParam === 'calificacion_desc') {
        resenas.sort((a, b) => b.calificacion - a.calificacion);
      } else if (ordenParam === 'calificacion_asc') {
        resenas.sort((a, b) => a.calificacion - b.calificacion);
      } else {
        // Ordenar por fecha desc (más recientes primero)
        resenas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      }
      
      setResenas(resenas);
    } catch (error) {
      console.error('Error:', error);
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
    try {
      // Crear la nueva reseña
      const nuevaResenaObj = {
        _id: Date.now().toString(), // Generamos un ID único basado en timestamp
        usuario_id: currentUser.id,
        calificacion: parseInt(nuevaResena.calificacion),
        comentario: nuevaResena.comentario,
        fecha: new Date().toISOString(),
        usuario: {
          nombre: currentUser.email.split('@')[0] // Usar parte del email como nombre
        }
      };

      // Obtener las reseñas actuales
      const dataExistente = localStorage.getItem('resenas');
      const resenasExistentes = dataExistente ? JSON.parse(dataExistente) : [];
      
      // Añadir la nueva reseña
      resenasExistentes.push(nuevaResenaObj);
      
      // Guardar en localStorage
      localStorage.setItem('resenas', JSON.stringify(resenasExistentes));

      // Limpiar formulario
      setNuevaResena({ calificacion: 5, comentario: '' });
      
      // Recargar reseñas
      obtenerResenas();
      
      alert('¡Reseña publicada con éxito!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al publicar la reseña');
    } finally {
      setEnviando(false);
    }
  };

  // Eliminar reseña
  const eliminarResena = async (resenaId) => {
    if (!currentUser) return;
    if (!window.confirm('¿Estás seguro de eliminar esta reseña?')) return;

    try {
      // Obtener las reseñas actuales
      const dataExistente = localStorage.getItem('resenas');
      let resenasExistentes = dataExistente ? JSON.parse(dataExistente) : [];
      
      // Filtrar la reseña a eliminar
      resenasExistentes = resenasExistentes.filter(r => r._id !== resenaId);
      
      // Guardar en localStorage
      localStorage.setItem('resenas', JSON.stringify(resenasExistentes));
      
      // Recargar reseñas
      obtenerResenas();
      
      alert('Reseña eliminada correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la reseña');
    }
  };

  useEffect(() => {
    obtenerResenas();
  }, [ordenamiento]);

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/PaginaPrincipal" style={styles.backButton}>
          ← Volver
        </Link>
        <h1>Reseñas del Restaurante</h1>
      </div>

      <div style={styles.restauranteInfo}>
        <h2>{restauranteNombre}</h2>
        <p style={styles.restauranteDescripcion}>
          Califica tu experiencia general en nuestro restaurante. ¿Qué te pareció la atención, el ambiente y la experiencia en general?
        </p>
        <div style={styles.calificacionPromedio}>
          {renderEstrellas(promedioCalificacion)}
          <span style={styles.promedioText}>
            {resenas.length > 0 ? 
              `${promedioCalificacion.toFixed(1)} / 5 (${resenas.length} reseñas)` : 
              'Sin calificaciones'}
          </span>
        </div>
      </div>

      {/* Formulario para enviar una nueva reseña */}
      <div style={styles.formContainer}>
        <h3>Deja tu opinión sobre el restaurante</h3>
        {currentUser ? (
          <form onSubmit={enviarResena} style={styles.form}>
            <div style={styles.calificacionSelector}>
              <label>Tu calificación general: </label>
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
              placeholder="Comparte tu experiencia en el restaurante. ¿Qué te gustó? ¿Qué podríamos mejorar?"
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
          onChange={(e) => setOrdenamiento(e.target.value)}
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
            Aún no hay reseñas para este restaurante. ¡Sé el primero en dejar tu opinión!
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
              {currentUser && resena.usuario_id === currentUser.id && (
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
  restauranteInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
    padding: '30px',
    color: '#e74c3c',
    backgroundColor: '#ffe6e6',
    borderRadius: '8px'
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '30px',
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  restauranteDescripcion: {
    color: '#7f8c8d',
    marginBottom: '15px',
    fontSize: '0.95em',
    lineHeight: '1.5'
  }
};

export default Resenas; 