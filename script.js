const puppeteer = require('puppeteer');
const fs = require('fs');

// Función de espera
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Captura del formulario en el HTML
document.getElementById('placa-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Evita que el formulario se envíe de forma normal

    // Obtener el valor del input
    const inputPlacas = document.getElementById('placa-input').value;

    // Convertir la cadena de texto en un array separando por comas y eliminando espacios
    const placasArray = inputPlacas.split(',').map(placa => placa.trim());

    // Asegurarse de que cada placa tenga comillas simples
    const placas = placasArray.map(placa => placa);

    console.log("Placas ingresadas:", placas);

    const resultados = [];

    // Lanzar el navegador en modo headless
    const browser = await puppeteer.launch({ headless: true });

    for (const placa of placas) {
        const page = await browser.newPage();  // Crear una nueva página para cada iteración

        try {
            const url = `https://www.fcm.org.co/simit/#/estado-cuenta?numDocPlacaProp=${placa}`;

            // Navegar a la URL
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Esperar a que el contenedor y la tabla estén disponibles
            await page.waitForSelector('#resumenEstadoCuenta', { timeout: 10000 });
            await page.waitForSelector('#multaTable', { timeout: 10000 });

            // Obtener el texto del contenedor
            const textoResumen = await page.evaluate(() => {
                const contenedor = document.querySelector('#resumenEstadoCuenta');
                return contenedor ? contenedor.innerText : 'Contenedor no encontrado';
            });

            // Obtener los datos de la tabla
            const datosTabla = await page.evaluate(() => {
                const tabla = document.querySelector('#multaTable');
                if (!tabla) return 'Tabla no encontrada';

                const filas = Array.from(tabla.querySelectorAll('tbody tr'));
                return filas.map(fila => {
                    const celdas = Array.from(fila.querySelectorAll('td'));
                    return {
                        tipo: celdas[0] ? celdas[0].innerText.replace(/\n/g, ' ').trim() : '',
                        notificacion: celdas[1] ? celdas[1].innerText.replace(/\n/g, ' ').trim() : '',
                        placa: celdas[2] ? celdas[2].innerText.replace(/\n/g, ' ').trim() : '',
                        secretaria: celdas[3] ? celdas[3].innerText.replace(/\n/g, ' ').trim() : '',
                        infraccion: celdas[4] ? celdas[4].innerText.replace(/\n/g, ' ').trim() : '',
                        estado: celdas[5] ? celdas[5].innerText.replace(/\n/g, ' ').trim() : '',
                        valor: celdas[6] ? celdas[6].innerText.replace(/\n/g, ' ').trim() : '',
                        valor_a_pagar: celdas[7] ? celdas[7].innerText.replace(/\n/g, ' ').trim() : ''
                    };
                });
            });

            // Filtrar datos de la tabla para eliminar objetos vacíos
            const datosTablaFiltrados = datosTabla.filter(dato => {
                // Filtrar las filas donde todos los campos están vacíos
                return Object.values(dato).some(valor => valor !== '');
            });

            // Procesar el texto del resumen para extraer los datos
            const datosResumen = textoResumen.split('\n').reduce((acc, linea) => {
                const [clave, valor] = linea.split(':').map(str => str.trim());
                if (clave && valor) {
                    acc[clave.replace(/\s+/g, '_').toLowerCase()] = valor;
                }
                return acc;
            }, {});

            // Crear el objeto JSON con los datos organizados para esta placa
            const resultado = {
                placa: placa,
                resumen: {
                    comparendos: datosResumen.comparendos || 'No disponible',
                    multas: datosResumen.multas || 'No disponible',
                    acuerdos_de_pago: datosResumen.acuerdos_de_pago || 'No disponible',
                    total: datosResumen.total || 'No disponible'
                },
                tabla_multa: datosTablaFiltrados.length > 0 ? datosTablaFiltrados : 'No hay multas registradas'
            };

            // Agregar el resultado al array de resultados
            resultados.push(resultado);

            console.log(`Datos procesados para la placa: ${placa}`);

            // Espera 5 segundos antes de cargar la siguiente placa
            await delay(5000);

        } catch (error) {
            console.error(`Error al procesar la placa ${placa}:`, error);
            // En caso de error, agregar el mensaje correspondiente
            resultados.push({
                placa: placa,
                mensaje: 'No tiene comparendos ni multas'
            });
        } finally {
            await page.close(); // Cerrar la página al finalizar cada iteración
        }
    }

    // Guardar el JSON en un archivo
    fs.writeFileSync('resultados_placas.json', JSON.stringify(resultados, null, 2), 'utf-8');

    // Cerrar el navegador
    await browser.close();

    console.log('Datos de todas las placas organizados y guardados en resultados_placas.json');
});
