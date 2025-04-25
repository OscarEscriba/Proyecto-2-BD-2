const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Variables de entorno
const PORT = process.env.PORT || 4000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Conectar a MongoDB
client.connect().then(() => {
  db = client.db('restaurantApp');
  console.log('✅ Conectado a MongoDB Atlas');
});

// Middleware para verificar autenticación
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// Registro de usuario
app.post('/auth/register', async (req, res) => {
  const { nombre, email, contraseña, telefono, tipo } = req.body;
  const existe = await db.collection('usuarios').findOne({ email });
  if (existe) return res.status(400).json({ error: 'Usuario ya existe' });

  const hash = await bcrypt.hash(contraseña, 10);
  await db.collection('usuarios').insertOne({ nombre, email, contraseña: hash, telefono, tipo });
  res.json({ mensaje: 'Usuario creado' });
});

// Login de usuario
app.post('/auth/login', async (req, res) => {
  const { email, contraseña } = req.body;
  const usuario = await db.collection('usuarios').findOne({ email });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const match = await bcrypt.compare(contraseña, usuario.contraseña);
  if (!match) return res.status(403).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: usuario._id, tipo: usuario.tipo }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Crear restaurante (solo admin)
app.post('/restaurantes', verificarToken, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear' });
  const nuevo = req.body;
  const result = await db.collection('restaurantes').insertOne(nuevo);
  res.json(result);
});

// Obtener todos los restaurantes
app.get('/restaurantes', async (req, res) => {
  const filtros = {};
  if (req.query.nombre) filtros.nombre = { $regex: req.query.nombre, $options: 'i' };
  if (req.query.ubicacion) filtros.ubicacion = { $regex: req.query.ubicacion, $options: 'i' };

  const restaurantes = await db.collection('restaurantes').find(filtros).toArray();
  res.json(restaurantes);
});

//Actualizar restaurante
app.put('/restaurantes/:id', verificarToken, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Solo admin puede actualizar' });

  const { id } = req.params;
  const cambios = req.body;
  const result = await db.collection('restaurantes').updateOne({ _id: new ObjectId(id) }, { $set: cambios });
  res.json(result);
});

// Obtener menú de un restaurante
app.get('/restaurantes/:id/menu', async (req, res) => {
  const { id } = req.params;
  const restaurante = await db.collection('restaurantes').findOne({ _id: new ObjectId(id) });
  if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });
  res.json(restaurante.menu_resumido || []);
});


// Servidor corriendo
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});
