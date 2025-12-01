/**
 * Tests para utilidades geoespaciales
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

describe('Utilidades Geoespaciales', () => {
    describe('calcularDistanciaHaversine', () => {
        test('debe calcular distancia correcta entre dos puntos', () => {
            // Buenos Aires a Córdoba (aprox 650km)
            const distance = calcularDistanciaHaversine(-34.6037, -58.3816, -31.4201, -64.1888);
            expect(distance).toBeGreaterThan(600);
            expect(distance).toBeLessThan(700);
        });

        test('distancia cero para mismo punto', () => {
            const distance = calcularDistanciaHaversine(0, 0, 0, 0);
            expect(distance).toBe(0);
        });
    });

    describe('toRadians y toDegrees', () => {
        test('conversión correcta', () => {
            expect(toRadians(180)).toBe(Math.PI);
            expect(toDegrees(Math.PI)).toBe(180);
            expect(toDegrees(toRadians(45))).toBe(45);
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
    });

    describe('prepararConsultaFullText', () => {
        test('prepara consulta correctamente', () => {
            const query = prepararConsultaFullText('plomero urgente');
            expect(query).toContain('plomero');
            expect(query).toContain('urgente');
        });

        test('maneja consultas vacías', () => {
            expect(prepararConsultaFullText('')).toBe('');
            expect(prepararConsultaFullText('   ')).toBe('');
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
    });

    describe('calcularBoundingBox', () => {
        test('calcula bounding box correcto', () => {
            const bbox = calcularBoundingBox(0, 0, 100);
            expect(bbox.minLat).toBeLessThan(bbox.maxLat);
            expect(bbox.minLng).toBeLessThan(bbox.maxLng);
        });
    });
});
