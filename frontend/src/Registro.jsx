import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Registro = () => {
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    contraseña: '',
    telefono: '',
    tipo: 'cliente'
  });

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:4000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      alert('Usuario registrado!');
      navigate('/Login');
    } catch (error) {
      alert('Error al registrar');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Registro</h2>
      <form onSubmit={handleRegister} style={styles.form}>
        <input
          placeholder="Nombre"
          value={userData.nombre}
          onChange={(e) => setUserData({...userData, nombre: e.target.value})}
          style={styles.input}
          required
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={userData.email}
          onChange={(e) => setUserData({...userData, email: e.target.value})}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={userData.contraseña}
          onChange={(e) => setUserData({...userData, contraseña: e.target.value})}
          style={styles.input}
          required
        />
        <input
          placeholder="Teléfono"
          value={userData.telefono}
          onChange={(e) => setUserData({...userData, telefono: e.target.value})}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>
          Registrarse
        </button>
      </form>
      <div style={styles.signInContainer}>
        <label>¿Ya tienes cuenta? </label>
        <Link to="/Login" style={styles.link}>
          <button style={styles.signInButton}>Iniciar Sesión</button>
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '400px',
    margin: '2rem auto',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem'
  },
  button: {
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    ':hover': {
      backgroundColor: '#2980b9'
    }
  },
  signInContainer: {
    marginTop: '1rem',
    textAlign: 'center'
  },
  link: {
    textDecoration: 'none'
  },
  signInButton: {
    padding: '8px 16px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '0.5rem',
    ':hover': {
      backgroundColor: '#27ae60'
    }
  }
};

export default Registro;
