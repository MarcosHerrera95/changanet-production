/**
 * Utilidades geoespaciales para el Sistema de Búsqueda y Filtros
 * Incluye cálculos de distancia Haversine como fallback y funciones de búsqueda
 */

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lng1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lng2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function calcularDistanciaHaversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convierte grados a radianes
 * @param {number} degrees - Grados
 * @returns {number} Radianes
 */
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Convierte radianes a grados
 * @param {number} radians - Radianes
 * @returns {number} Grados
 */
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Calcula el punto destino dado un punto de origen, distancia y rumbo
 * @param {number} lat - Latitud origen
 * @param {number} lng - Longitud origen
 * @param {number} distance - Distancia en km
 * @param {number} bearing - Rumbo en grados
 * @returns {Object} {lat, lng}
 */
function calcularPuntoDestino(lat, lng, distance, bearing) {
    const R = 6371; // Radio de la Tierra en km
    const d = distance / R; // Distancia angular en radianes
    const bearingRad = toRadians(bearing);

    const lat1 = toRadians(lat);
    const lng1 = toRadians(lng);

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) +
                           Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad));

    const lng2 = lng1 + Math.atan2(Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
                                   Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

    return {
        lat: toDegrees(lat2),
        lng: toDegrees(lng2)
    };
}

/**
 * Verifica si un punto está dentro de un radio dado
 * @param {number} centerLat - Latitud centro
 * @param {number} centerLng - Longitud centro
 * @param {number} pointLat - Latitud punto
 * @param {number} pointLng - Longitud punto
 * @param {number} radiusKm - Radio en km
 * @returns {boolean}
 */
function estaDentroDelRadio(centerLat, centerLng, pointLat, pointLng, radiusKm) {
    const distance = calcularDistanciaHaversine(centerLat, centerLng, pointLat, pointLng);
    return distance <= radiusKm;
}

/**
 * Genera un bounding box para una búsqueda geoespacial aproximada
 * @param {number} lat - Latitud centro
 * @param {number} lng - Longitud centro
 * @param {number} radiusKm - Radio en km
 * @returns {Object} {minLat, maxLat, minLng, maxLng}
 */
function calcularBoundingBox(lat, lng, radiusKm) {
    const R = 6371;
    const d = radiusKm / R; // Distancia angular

    const latRad = toRadians(lat);
    const lngRad = toRadians(lng);

    const minLat = latRad - d;
    const maxLat = latRad + d;

    const deltaLng = Math.asin(Math.sin(d) / Math.cos(latRad));
    const minLng = lngRad - deltaLng;
    const maxLng = lngRad + deltaLng;

    return {
        minLat: toDegrees(minLat),
        maxLat: toDegrees(maxLat),
        minLng: toDegrees(minLng),
        maxLng: toDegrees(maxLng)
    };
}

/**
 * Prepara consulta de búsqueda full-text para PostgreSQL
 * @param {string} query - Término de búsqueda
 * @param {string} language - Idioma (default: 'spanish')
 * @returns {string} Consulta preparada
 */
function prepararConsultaFullText(query, language = 'spanish') {
    if (!query || query.trim() === '') return '';

    // Normalizar y preparar la consulta
    const normalized = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();

    if (normalized === '') return '';

    // Crear consulta tsquery
    return normalized.split(' ')
        .filter(word => word.length > 2) // Filtrar palabras cortas
        .map(word => `${word}:*`) // Prefijo para búsqueda parcial
        .join(' & ');
}

/**
 * Calcula el score de relevancia para resultados de búsqueda
 * @param {Object} professional - Perfil del profesional
 * @param {Object} filters - Filtros aplicados
 * @param {Object} userLocation - Ubicación del usuario {lat, lng}
 * @returns {number} Score de relevancia (0-1)
 */
function calcularRelevancia(professional, filters, userLocation) {
    let score = 0;
    let totalWeight = 0;

    // Factor 1: Coincidencia de especialidad (peso: 0.4)
    if (filters.especialidad) {
        const specialtyMatch = professional.especialidad?.toLowerCase().includes(filters.especialidad.toLowerCase()) ? 1 : 0;
        score += specialtyMatch * 0.4;
        totalWeight += 0.4;
    }

    // Factor 2: Proximidad geográfica (peso: 0.25)
    if (userLocation && professional.latitud && professional.longitud && filters.radio) {
        const distance = calcularDistanciaHaversine(
            userLocation.lat, userLocation.lng,
            professional.latitud, professional.longitud
        );
        const proximityScore = Math.max(0, 1 - (distance / filters.radio) / 10);
        score += proximityScore * 0.25;
        totalWeight += 0.25;
    }

    // Factor 3: Calificación (peso: 0.2)
    if (professional.calificacion_promedio) {
        const ratingScore = professional.calificacion_promedio / 5.0;
        score += ratingScore * 0.2;
        totalWeight += 0.2;
    }

    // Factor 4: Estado de verificación (peso: 0.1)
    const verificationScore = professional.estado_verificacion === 'verificado' ? 1 : 0.5;
    score += verificationScore * 0.1;
    totalWeight += 0.1;

    // Factor 5: Disponibilidad (peso: 0.05)
    const availabilityScore = professional.esta_disponible ? 1 : 0;
    score += availabilityScore * 0.05;
    totalWeight += 0.05;

    return totalWeight > 0 ? score / totalWeight : 0;
}

module.exports = {
    calcularDistanciaHaversine,
    toRadians,
    toDegrees,
    calcularPuntoDestino,
    estaDentroDelRadio,
    calcularBoundingBox,
    prepararConsultaFullText,
    calcularRelevancia
};
