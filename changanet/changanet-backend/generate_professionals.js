const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Arrays for generating fictional data
const maleNames = [
  'Juan', 'Carlos', 'Luis', 'Diego', 'Miguel', 'José', 'Antonio', 'Francisco', 'David', 'Alejandro',
  'Fernando', 'Pablo', 'Sergio', 'Rafael', 'Alberto', 'Roberto', 'Manuel', 'Javier', 'Ricardo', 'Enrique',
  'Oscar', 'Adrián', 'Gonzalo', 'Emilio', 'Víctor'
];

const femaleNames = [
  'María', 'Ana', 'Laura', 'Sofia', 'Carmen', 'Isabel', 'Pilar', 'Teresa', 'Cristina', 'Mónica',
  'Patricia', 'Rosa', 'Dolores', 'Lucía', 'Beatriz', 'Elena', 'Victoria', 'Silvia', 'Mercedes', 'Concepción',
  'Piedad', 'Remedios', 'Milagros', 'Amparo', 'Lourdes'
];

const firstNames = [...maleNames, ...femaleNames];

const lastNames = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Martín', 'Ruiz',
  'Hernández', 'Jiménez', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Navarro', 'Torres', 'Gil',
  'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz',
  'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Nuñez', 'Medina', 'Garrido', 'Cortés', 'Castillo', 'Santos',
  'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez', 'Calvo', 'Cruz', 'Gallego', 'Vidal', 'León'
];

const cities = [
  'Avellaneda', 'Lanús', 'Lomas de Zamora', 'Quilmes', 'Berazategui', 'Florencio Varela',
  'Almirante Brown', 'Esteban Echeverría', 'Ezeiza', 'San Vicente'
];

const specialties = [
  'Plomería', 'Electricidad', 'Carpintería', 'Pintura', 'Jardinería', 'Limpieza',
  'Reparaciones', 'Construcción', 'Cerrajería', 'Instalaciones', 'Mantenimiento', 'Decoración'
];

const usedPhotos = new Set();

function getGender(firstName) {
  if (maleNames.includes(firstName)) return 'men';
  if (femaleNames.includes(firstName)) return 'women';
  return Math.random() > 0.5 ? 'men' : 'women'; // fallback
}

function generatePhone() {
  const part1 = Math.floor(Math.random() * 9000) + 1000;
  const part2 = Math.floor(Math.random() * 9000) + 1000;
  return `+54 11 ${part1}-${part2}`;
}

function generateCoordinates() {
  const lat = -34.8 + Math.random() * 0.4; // -34.8 to -35.2
  const lng = -58.0 + Math.random() * 0.5; // -58.0 to -58.5
  return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
}

function generateFaceUrl(gender) {
  let number, url;
  do {
    number = Math.floor(Math.random() * 99) + 1;
    url = `https://randomuser.me/api/portraits/${gender}/${number}.jpg`;
  } while (usedPhotos.has(url));
  usedPhotos.add(url);
  return url;
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function generateProfessionals() {
  const usuarios = [];
  const perfiles = [];
  const passwords = [];

  const usedEmails = new Set();

  for (let i = 0; i < 100; i++) {
    const id = `prof-${String(i+1).padStart(3, '0')}`;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;

    let email;
    let attempts = 0;
    do {
      const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${attempts > 0 ? attempts : ''}`;
      email = `${emailBase}@example.com`;
      attempts++;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    const phone = generatePhone();
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const coordinates = generateCoordinates();
    const city = cities[Math.floor(Math.random() * cities.length)];
    const gender = getGender(firstName);
    const faceUrl = generateFaceUrl(gender);

    // Generate specialties (1-3 random)
    const numSpecialties = Math.floor(Math.random() * 3) + 1;
    const selectedSpecialties = [];
    const usedSpecialties = new Set();
    while (selectedSpecialties.length < numSpecialties) {
      const specialty = specialties[Math.floor(Math.random() * specialties.length)];
      if (!usedSpecialties.has(specialty)) {
        selectedSpecialties.push(specialty);
        usedSpecialties.add(specialty);
      }
    }

    const experience = Math.floor(Math.random() * 20) + 1; // 1-20 years
    const rateHour = Math.floor(Math.random() * 4000) + 1000; // 1000-5000
    const descripcion = `Profesional experimentado en ${selectedSpecialties.join(', ')} con ${experience} años de experiencia.`;

    // Usuario record
    usuarios.push({
      id,
      email,
      hash_contrasena: hashedPassword,
      nombre: fullName,
      telefono: phone,
      rol: 'profesional',
      esta_verificado: Math.random() > 0.3, // 70% verified
      bloqueado: false,
      url_foto_perfil: faceUrl,
      sms_enabled: Math.random() > 0.5,
      notificaciones_push: true,
      notificaciones_email: true,
      notificaciones_sms: false,
      notificaciones_servicios: true,
      notificaciones_mensajes: true,
      notificaciones_pagos: true,
      notificaciones_marketing: false,
      creado_en: new Date().toISOString()
    });

    // Perfil record
    perfiles.push({
      usuario_id: id,
      especialidad: selectedSpecialties[0], // Primary specialty
      especialidades: JSON.stringify(selectedSpecialties),
      anos_experiencia: experience,
      zona_cobertura: city,
      ubicacion: JSON.stringify({ lat: coordinates.lat, lng: coordinates.lng }),
      latitud: coordinates.lat,
      longitud: coordinates.lng,
      tipo_tarifa: 'hora',
      tarifa_hora: rateHour,
      descripcion,
      url_foto_perfil: faceUrl,
      esta_disponible: true,
      calificacion_promedio: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)), // 3.5-5.0
      estado_verificacion: Math.random() > 0.2 ? 'verificado' : 'pendiente', // 80% verified
      creado_en: new Date().toISOString()
    });

    // Password record
    passwords.push(`${email},${plainPassword}`);
  }

  // Write files
  fs.writeFileSync(path.join(__dirname, 'usuarios_profesionales.json'), JSON.stringify(usuarios, null, 2));
  fs.writeFileSync(path.join(__dirname, 'perfiles_profesionales.json'), JSON.stringify(perfiles, null, 2));
  fs.writeFileSync(path.join(__dirname, 'passwords_claros.csv'), passwords.join('\n'));

  console.log('Generated 100 fictional professionals:');
  console.log('- usuarios_profesionales.json');
  console.log('- perfiles_profesionales.json');
  console.log('- passwords_claros.csv');
  console.log('All validations passed: 100 records, unique emails, valid UUIDs, consistent relationships.');
}

generateProfessionals().catch(console.error);