const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path'); // Asegúrate de requerir 'path' para resolver rutas
const XLSX = require('xlsx');  // Añadimos el paquete 'xlsx' para manejar Excel

const app = express();
const port = 3000;

// Middleware para servir archivos estáticos (HTML, CSS, JS)
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para servir el archivo index.html en la raíz "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para manejar la petición POST del formulario
app.post('/consultar', async (req, res) => {
    const inputPlacas = req.body.placa;
    const placasArray = inputPlacas.split(',').map(placa => placa.trim());

    const resultados = [];
    
    const browser = await puppeteer.launch({
        headless: true,  // Para asegurarte de que esté en modo "sin cabeza"
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--window-size=1,1']
    });
    
    for (const placa of placasArray) {
        const page = await browser.newPage();
        try {
            const url = `https://www.fcm.org.co/simit/#/estado-cuenta?numDocPlacaProp=${placa}`;
            await page.goto(url, { waitUntil: 'networkidle2' });

            await page.waitForSelector('#resumenEstadoCuenta', { timeout: 10000 });
            await page.waitForSelector('#multaTable', { timeout: 10000 });

            const textoResumen = await page.evaluate(() => {
                const contenedor = document.querySelector('#resumenEstadoCuenta');
                return contenedor ? contenedor.innerText : 'Contenedor no encontrado';
            });

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
                        infraccion: celdas[4] ? celdas[4].innerText.replace(/\n/g, ' '). trim() : '',
                        estado: celdas[5] ? celdas[5].innerText.replace(/\n/g, ' ').trim() : '',
                        valor: celdas[6] ? celdas[6].innerText.replace(/\n/g, ' ').trim() : '',
                        valor_a_pagar: celdas[7] ? celdas[7].innerText.replace(/\n/g, ' ').trim() : ''
                    };
                });
            });

            const datosTablaFiltrados = datosTabla.filter(dato => {
                return Object.values(dato).some(valor => valor !== '');
            });

            const datosResumen = textoResumen.split('\n').reduce((acc, linea) => {
                const [clave, valor] = linea.split(':').map(str => str.trim());
                if (clave && valor) {
                    acc[clave.replace(/\s+/g, '_').toLowerCase()] = valor;
                }
                return acc;
            }, {});

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

            resultados.push(resultado);

        } catch (error) {
            console.error(`Error al procesar la placa ${placa}:`, error);
            resultados.push({
                placa: placa,
                mensaje: 'No tiene comparendos ni multas'
            });
        } finally {
            await page.close();
        }
    }

    fs.writeFileSync('resultados_placas.json', JSON.stringify(resultados, null, 2), 'utf-8');

    await browser.close();

    res.json({ message: 'Consulta completada y resultados guardados', resultados });
});

// Nueva ruta para generar y descargar el archivo Excel
app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'resultados_placas.json');
    
    // Leer el archivo JSON con los resultados
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Convertir el JSON a una hoja de Excel
    const workBook = XLSX.utils.book_new();
    const workSheet = XLSX.utils.json_to_sheet(jsonData);
    XLSX.utils.book_append_sheet(workBook, workSheet, 'Resultados');
    
    // Guardar el archivo Excel en el servidor
    const excelFilePath = path.join(__dirname, 'resultados.xlsx');
    XLSX.writeFile(workBook, excelFilePath);
    
    // Enviar el archivo Excel como respuesta para descarga
    res.download(excelFilePath, 'resultados.xlsx', (err) => {
        if (err) {
            console.error('Error al enviar el archivo:', err);
        }
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

function validarFor(event) {
    let input = document.getElementById("placa-input").value;

    if (input === "") {
        alert("Los campos no pueden quedar vacíos");
        event.preventDefault(); // Esto previene que se envíe el formulario si está vacío
        return false;
    }

    return true; // Permite el envío si el campo no está vacío
}

async function consultarPlacas(event) {
    // Llamamos a validarFor para evitar el envío si es necesario
    if (!validarFor(event)) {
        return;
    }

    const placaInput = document.getElementById('placa-input').value;
    const response = await fetch('/consultar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `placa=${encodeURIComponent(placaInput)}`
    });
    const result = await response.json();
    console.log(result);
    alert(result.message);
}