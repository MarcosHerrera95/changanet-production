/**
 * Tests unitarios exhaustivos para utilidades geoespaciales del Sistema de Búsqueda y Filtros
 * Cobertura: >95% de las funciones geoespaciales críticas
 */

const {
    calcularDistanciaHaversine,
    toRadians,
    toDegrees,
    calcularPuntoDestino,
    estaDentroDelRadio,
    calcularBoundingBox,
    prepararConsultaFullText,
    calcularRelevancia
} = require('../utils/geospatial');

describe('Utilidades Geoespaciales - Cobertura Completa', () => {
    describe('calcularDistanciaHaversine', () => {
        test('debe calcular distancia correcta entre Buenos Aires y Córdoba', () => {
            // Buenos Aires: -34.6037, -58.3816
            // Córdoba: -31.4201, -64.1888
            // Distancia aproximada: 650km
            const distance = calcularDistanciaHaversine(-34.6037, -58.3816, -31.4201, -64.1888);
            expect(distance).toBeGreaterThan(640);
            expect(distance).toBeLessThan(660);
        });

        test('distancia cero para mismo punto', () => {
            const distance = calcularDistanciaHaversine(0, 0, 0, 0);
            expect(distance).toBe(0);
        });

        test('distancia entre puntos cercanos', () => {
            // Dos puntos separados por ~1km
            const distance = calcularDistanciaHaversine(-34.6037, -58.3816, -34.5947, -58.3816);
            expect(distance).toBeGreaterThan(0.9);
            expect(distance).toBeLessThan(1.1);
        });

        test('distancia entre polos norte y sur', () => {
            const distance = calcularDistanciaHaversine(90, 0, -90, 0);
            expect(distance).toBeGreaterThan(20000); // ~20,000km
            expect(distance).toBeLessThan(21000);
        });

        test('maneja coordenadas inválidas', () => {
            expect(() => calcularDistanciaHaversine('invalid', 0, 0, 0)).toThrow();
            expect(() => calcularDistanciaHaversine(0, 'invalid', 0, 0)).toThrow();
        });
    });

    describe('toRadians y toDegrees', () => {
        test('conversión correcta entre grados y radianes', () => {
            expect(toRadians(180)).toBe(Math.PI);
            expect(toRadians(90)).toBe(Math.PI / 2);
            expect(toRadians(0)).toBe(0);
            expect(toRadians(360)).toBe(2 * Math.PI);

            expect(toDegrees(Math.PI)).toBe(180);
            expect(toDegrees(Math.PI / 2)).toBe(90);
            expect(toDegrees(0)).toBe(0);
            expect(toDegrees(2 * Math.PI)).toBe(360);
        });

        test('conversión redonda-trip', () => {
            expect(toDegrees(toRadians(45))).toBeCloseTo(45, 10);
            expect(toRadians(toDegrees(Math.PI / 4))).toBeCloseTo(Math.PI / 4, 10);
        });
    });

    describe('calcularPuntoDestino', () => {
        test('calcula punto destino correcto hacia el norte', () => {
            const result = calcularPuntoDestino(0, 0, 111.32, 0); // 1 grado norte
            expect(result.lat).toBeCloseTo(1, 1);
            expect(result.lng).toBeCloseTo(0, 1);
        });

        test('calcula punto destino correcto hacia el este', () => {
            const result = calcularPuntoDestino(0, 0, 111.32, 90); // 1 grado este
            expect(result.lat).toBeCloseTo(0, 1);
            expect(result.lng).toBeCloseTo(1, 1);
        });

        test('maneja distancia cero', () => {
            const result = calcularPuntoDestino(45, 90, 0, 45);
            expect(result.lat).toBe(45);
            expect(result.lng).toBe(90);
        });
    });

    describe('estaDentroDelRadio', () => {
        test('punto dentro del radio', () => {
            const dentro = estaDentroDelRadio(0, 0, 0.1, 0.1, 20);
            expect(dentro).toBe(true);
        });

        test('punto fuera del radio', () => {
            const fuera = estaDentroDelRadio(0, 0, 10, 10, 1);
            expect(fuera).toBe(false);
        });

        test('punto en el borde del radio', () => {
            // Punto exactamente al límite del radio
            const distance = calcularDistanciaHaversine(0, 0, 0.0898, 0); // ~10km
            const borde = estaDentroDelRadio(0, 0, 0.0898, 0, 10);
            expect(borde).toBe(true);
        });

        test('radio cero', () => {
            const dentro = estaDentroDelRadio(0, 0, 0, 0, 0);
            expect(dentro).toBe(true);
            const fuera = estaDentroDelRadio(0, 0, 0.001, 0, 0);
            expect(fuera).toBe(false);
        });
    });

    describe('calcularBoundingBox', () => {
        test('calcula bounding box correcto', () => {
            const bbox = calcularBoundingBox(0, 0, 100);
            expect(bbox.minLat).toBeLessThan(bbox.maxLat);
            expect(bbox.minLng).toBeLessThan(bbox.maxLng);
            expect(bbox.minLat).toBeLessThan(0);
            expect(bbox.maxLat).toBeGreaterThan(0);
        });

        test('bounding box simétrico en ecuador', () => {
            const bbox = calcularBoundingBox(0, 0, 50);
            expect(bbox.minLat).toBeCloseTo(-bbox.maxLat, 5);
            expect(bbox.minLng).toBeCloseTo(-bbox.maxLng, 5);
        });

        test('radio cero', () => {
            const bbox = calcularBoundingBox(45, 90, 0);
            expect(bbox.minLat).toBe(45);
            expect(bbox.maxLat).toBe(45);
            expect(bbox.minLng).toBe(90);
            expect(bbox.maxLng).toBe(90);
        });
    });

    describe('prepararConsultaFullText', () => {
        test('prepara consulta correctamente', () => {
            const query = prepararConsultaFullText('plomero urgente');
            expect(query).toContain('plomero');
            expect(query).toContain('urgente');
            expect(query).toContain('&'); // Operador AND
            expect(query).toContain(':*'); // Prefijo para búsqueda parcial
        });

        test('maneja consultas vacías', () => {
            expect(prepararConsultaFullText('')).toBe('');
            expect(prepararConsultaFullText('   ')).toBe('');
            expect(prepararConsultaFullText(null)).toBe('');
            expect(prepararConsultaFullText(undefined)).toBe('');
        });

        test('filtra palabras cortas', () => {
            const query = prepararConsultaFullText('a el de');
            expect(query).toBe(''); // Todas las palabras son cortas
        });

        test('normaliza caracteres especiales', () => {
            const query = prepararConsultaFullText('plomero-urgente!@#$%');
            expect(query).toContain('plomero');
            expect(query).toContain('urgente');
            expect(query).not.toContain('-');
            expect(query).not.toContain('!');
        });

        test('maneja mayúsculas y espacios múltiples', () => {
            const query = prepararConsultaFullText('  PLOMERO   URGENTE  ');
            expect(query).toContain('plomero');
            expect(query).toContain('urgente');
        });
    });

    describe('calcularRelevancia', () => {
        const professional = {
            especialidad: 'plomero',
            latitud: -34.6037,
            longitud: -58.3816,
            calificacion_promedio: 4.5,
            estado_verificacion: 'verificado',
            esta_disponible: true
        };

        test('calcula relevancia perfecta', () => {
            const filters = {
                especialidad: 'plomero',
                radio: 10
            };
            const userLocation = { lat: -34.6037, lng: -58.3816 };
            const score = calcularRelevancia(professional, filters, userLocation);
            expect(score).toBeGreaterThan(0.8);
            expect(score).toBeLessThanOrEqual(1.0);
        });

        test('calcula relevancia baja sin coincidencias', () => {
            const filters = {
                especialidad: 'electricista',
                radio: 1
            };
            const userLocation = { lat: -35.0, lng: -59.0 };
            const score = calcularRelevancia(professional, filters, userLocation);
            expect(score).toBeLessThan(0.5);
        });

        test('maneja profesional sin calificación', () => {
            const profSinRating = { ...professional, calificacion_promedio: null };
            const filters = { especialidad: 'plomero' };
            const score = calcularRelevancia(profSinRating, filters, null);
            expect(score).toBeGreaterThan(0);
        });

        test('maneja profesional no verificado', () => {
            const profNoVerificado = { ...professional, estado_verificacion: 'pendiente' };
            const filters = { especialidad: 'plomero' };
            const score = calcularRelevancia(profNoVerificado, filters, null);
            expect(score).toBeLessThan(0.8); // Debe ser menor que uno verificado
        });

        test('maneja profesional no disponible', () => {
            const profNoDisponible = { ...professional, esta_disponible: false };
            const filters = { especialidad: 'plomero' };
            const score = calcularRelevancia(profNoDisponible, filters, null);
            expect(score).toBeLessThan(0.8); // Debe ser menor que uno disponible
        });

        test('sin filtros devuelve score base', () => {
            const score = calcularRelevancia(professional, {}, null);
            expect(score).toBeGreaterThan(0.4); // Solo verificación y disponibilidad
        });

        test('sin ubicación pero con radio', () => {
            const filters = { radio: 10 };
            const score = calcularRelevancia(professional, filters, null);
            expect(score).toBeGreaterThan(0.2); // No incluye factor de proximidad
        });
    });

    // Tests de edge cases y errores
    describe('Edge Cases y Validación', () => {
        test('maneja coordenadas en polos', () => {
            const distance = calcularDistanciaHaversine(90, 0, -90, 180);
            expect(distance).toBeGreaterThan(0);
            expect(distance).toBeFinite();
        });

        test('maneja coordenadas con valores extremos', () => {
            expect(() => calcularDistanciaHaversine(91, 0, 0, 0)).not.toThrow();
            expect(() => calcularDistanciaHaversine(0, 181, 0, 0)).not.toThrow();
            expect(() => calcularDistanciaHaversine(-91, 0, 0, 0)).not.toThrow();
            expect(() => calcularDistanciaHaversine(0, -181, 0, 0)).not.toThrow();
        });

        test('relevancia con datos incompletos', () => {
            const incompleteProf = {
                especialidad: null,
                latitud: null,
                longitud: null,
                calificacion_promedio: null,
                estado_verificacion: null,
                esta_disponible: null
            };
            const score = calcularRelevancia(incompleteProf, {}, null);
            expect(score).toBe(0);
        });
    });
});
