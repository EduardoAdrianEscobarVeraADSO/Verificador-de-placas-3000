const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const utils = require('./utils');
const convertDocx = require('docx-pdf');
const { timeout } = require('puppeteer');
const { log } = require('console');
const { readJsonFile, processJsonData, generateExcel, generateExcelForUsersAndPlates, crearCarta, buscarConductorID, ObtenerCorreo, obtenerNombrePropietario, ObtenerIdentificacion, ObtenerTipoId, allPlates, allUsers } = utils;


const app = express();
const port = process.env.PORT || 3002;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint GET para servir el archivo index.html
app.get('/', (req, res) => {
    // Envía el archivo index.html como respuesta
    res.sendFile(path.join(__dirname, 'index.html'));
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "eduardoadrianescobar12@gmail.com", 
        pass: "yzcx wblj gwrw pmzv"
    }
});

// Endpoint POST para consultar información de multas basado en placas de vehículos
app.post('/consultar', async (req, res) => {
    const inputPlacas = req.body.placa;
    const placasArray = inputPlacas.split(' ').map(placa => placa.trim());
    const resultados = [];

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--window-size=1900,1900']
    });

    async function procesarPlaca(placa) {
        let requiereRevision = false;
        const page = await browser.newPage();  // Se abre una nueva página en el navegador
        try {
            // Navegamos a la página de estado de cuenta del SIMIT con la placa actual
            await page.goto(`https://www.fcm.org.co/simit/#/estado-cuenta?numDocPlacaProp=${placa}`, { waitUntil: 'networkidle2', timeout: 20000 });
    
            // Verificamos la clase del modal para determinar si está activo o inactivo
            const modalClase = await page.evaluate(() => {
                const modal = document.querySelector('#modal-multiples-personas');
                return modal ? modal.className : '';
            });
    
            const requiereRevision = modalClase.includes('show');  // Si la clase incluye 'show', requiere revisión adicional
    
            // Esperamos a que las tablas de resumen y multa estén disponibles en la página
            await Promise.all([
                page.waitForSelector('#resumenEstadoCuenta', { timeout: 20000 }),  // Espera a que el resumen esté disponible
                page.waitForSelector('#multaTable', { timeout: 20000 })  // Espera a que la tabla de multas esté disponible
            ]);
    
            // Extraemos el texto del resumen de estado de cuenta
            const textoResumen = await page.evaluate(() => {
                const contenedor = document.querySelector('#resumenEstadoCuenta');
                return contenedor ? contenedor.innerText : 'Contenedor No disponible';
            });
    
            // Extraemos los datos de la tabla de multas
            const datosTabla = await page.evaluate(() => {
                const tabla = document.querySelector('#multaTable');
                if (!tabla) return [];  // Si no existe la tabla, retornamos un array vacío
    
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
    
            const nombrePropietario = await obtenerNombrePropietario(placa);
            const conductor = await buscarConductorID(placa);
            const correo = await ObtenerCorreo(placa);
            const tipoId = await ObtenerTipoId(placa);
            const iD = await ObtenerIdentificacion(placa);
    
            return {
                tipoID: tipoId || "N/A",
                ID: iD || "N/A",
                placa_u_documento: placa,
                nombre_propietario: nombrePropietario || "N/A",
                conductor: conductor || "N/A",
                correo: correo || "N/A",
                requiere_revision_adicional: requiereRevision ? 'Sí' : 'No',  // Agregamos el campo de revisión
                resumen: {
                    comparendos: datosResumen.comparendos || 'No tiene comparendos ni multas',
                    multas: datosResumen.multas || 'No tiene comparendos ni multas',
                    acuerdos_de_pago: datosResumen.acuerdos_de_pago || 'No tiene comparendos ni multas',
                    total: datosResumen.total || 'No tiene comparendos ni multas comparendos'
                },
                tabla_multa: datosTablaFiltrados.length > 0 ? datosTablaFiltrados : []
            };
    
        } catch (error) {
            const nombrePropietario = await obtenerNombrePropietario(placa);
            const conductor = await buscarConductorID(placa);
            const tipoId = await ObtenerTipoId(placa);
            const iD = await ObtenerIdentificacion(placa);
            
            console.error(`Error al procesar la placa ${placa}:`, error);
            return {
                tipoID: tipoId || "N/A",
                ID: iD || "N/A",
                placa_u_documento: placa,
                nombre_propietario: nombrePropietario || "N/A",
                conductor: conductor || "N/A",
                mensaje: 'No tiene comparendos ni multas comparendos ni multas',
                requiere_revision_adicional: requiereRevision ? 'Sí' : 'No'  // Agregamos el campo de revisión

            };
        } finally {
            await page.close();  
        }
    }
    

    const chunkSize = 15;
    for (let i = 0; i < placasArray.length; i += chunkSize) {
        const chunk = placasArray.slice(i, i + chunkSize);
        const resultadosChunk = await Promise.allSettled(chunk.map(procesarPlaca));

        resultadosChunk.forEach((resultado) => {
            if (resultado.status === 'fulfilled') {
                resultados.push(resultado.value);
            } else {
                console.error('Error en una de las consultas:', resultado.reason);
            }
        });
    }

    fs.writeFileSync('resultados_placas.json', JSON.stringify(resultados, null, 2), 'utf-8');

    await browser.close();

    res.json({ message: 'Consulta completada y resultados guardados', resultados });
});




app.get('/download-excel', (req, res) => {
    // Leemos el archivo JSON que contiene los resultados de las placas
    const jsonData = readJsonFile('resultados_placas.json');

    // Procesamos los datos JSON para prepararlos para la generación del archivo Excel
    const processedData = processJsonData(jsonData);

    // Generamos el archivo Excel a partir de los datos procesados
    const excelFilePath = generateExcel(processedData, 'resultados_placas.xlsx');

    // Iniciamos la descarga del archivo Excel
    res.download(excelFilePath, 'resultados_placas.xlsx', (err) => {
        if (err) {
            // Si ocurre un error durante la descarga, lo registramos en la consola
            console.error(err);
        }

        // Eliminamos el archivo Excel del sistema después de que se haya descargado
        fs.unlinkSync(excelFilePath);
    });
});

// Endpoint GET para descargar cartas generadas en formato ZIP
app.get('/descargar-cartas', async (req, res) => {
    // Leemos el archivo JSON que contiene los resultados de las placas
    const resultados = JSON.parse(fs.readFileSync('resultados_placas.json', 'utf-8'));

    // Filtramos los resultados para obtener solo las placas que tienen multas
    const placasConMultas = resultados.filter(item => item.tabla_multa && item.tabla_multa.length > 0);

    // Definimos la ruta del archivo ZIP donde se guardarán las cartas generadas
    const zipFilePath = path.join(__dirname, 'cartas.zip');
    const output = fs.createWriteStream(zipFilePath);  // Creamos un flujo de escritura para el archivo ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });  // Creamos un objeto archiver para manejar la compresión

    // Cuando el flujo de salida se cierra, iniciamos la descarga del archivo ZIP
    output.on('close', () => {
        res.download(zipFilePath, 'cartas.zip', (err) => {
            if (err) {
                // Si ocurre un error durante la descarga, lo registramos en la consola
                console.error(err);
            }
            // Eliminamos el archivo ZIP del sistema después de que se haya descargado
            fs.unlinkSync(zipFilePath);
        });
    });

    // Conectamos el archivo ZIP al flujo de salida
    archive.pipe(output);

    // Iteramos sobre cada placa con multas para generar su carta
    for (const item of placasConMultas) {
        // 1. Crear la carta en formato .docx
        const docxBuffer = await crearCarta(item);  // Función que genera el .docx y devuelve un buffer
        const docxFileName = `Carta_${item.placa_u_documento}.docx`;
        const tempDocxPath = path.join(__dirname, docxFileName);
        
        // Escribimos el archivo .docx temporalmente
        fs.writeFileSync(tempDocxPath, docxBuffer);
        archive.append(docxBuffer, { name: docxFileName });  // Agregamos el .docx al archivo ZIP
        // Eliminar los archivos temporales
        fs.unlinkSync(tempDocxPath);
    }

    // Finalizamos el archivo ZIP para que se pueda descargar
    await archive.finalize();
});


// Endpoint POST para enviar correos con cartas de notificación de comparendos o multas
app.post('/enviar-correos', async (req, res) => {
    // Leemos el archivo JSON que contiene los resultados de las placas
    const resultados = JSON.parse(fs.readFileSync('resultados_placas.json', 'utf-8'));

    // Filtramos los resultados para obtener solo las placas que tienen multas
    const placasConMultas = resultados.filter(item => item.tabla_multa && item.tabla_multa.length > 0);

    // Iteramos sobre cada placa con multas para enviar correos
    for (const item of placasConMultas) {
        // Determinamos el nombre del conductor o propietario
        const conductorOPropietario = (item.conductor === "N/A") ? item.nombre_propietario : item.conductor;

        // Creamos la carta y guardamos su contenido en un buffer
        const buffer = await crearCarta(item);
        const filePath = path.join(__dirname, `Carta_${item.placa_u_documento}.docx`);
        fs.writeFileSync(filePath, buffer); // Guardamos el buffer en un archivo .docx

        // Contenido HTML del correo electrónico
        const htmlContent = `
        <div style="font-family: 'Poppins', sans-serif; color: #333; line-height: 1.6;">
            <!-- Header -->
            <div style="text-align: center; padding: 20px; background-color: #f4f4f4;">
                <img src="https://www.grupofrimac.com.co/images/main/logo-header.png" alt="Logo de la empresa" style="width: 150px;" />
            </div>

            <!-- Contenido -->
            <div style="padding: 20px;">
                <h1 style="color: #ff7f50; font-size: 26px; text-align: center;">Notificación de comparendo o multa</h1>
                <p style="text-align: justify;">
                    Estimado/a <strong>${conductorOPropietario}</strong>,
                </p>
                <p style="text-align: justify;">
                    Le informamos que se ha registrado uno o más comparendos o multas en su contra en el sistema SIMIT.
                    Por favor, revise el documento adjunto para más detalles sobre los comparendos o multas correspondientes.
                </p>
                <p style="text-align: justify;">
                    Si tiene alguna duda o necesita asistencia, no dude en ponerse en contacto con nuestro equipo de soporte.
                </p>
                <p style="margin-top: 30px; text-align: justify;">
                    Atentamente,
                </p>
                <p style="text-align: justify;">
                    <strong>Su equipo de gestión de multas</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777;">
                <p style="margin: 0;">&copy; 2024 Frimac zona franca. Todos los derechos reservados.</p>
                <div style="margin-top: 10px;">
                    <!-- Iconos de redes sociales -->
                    <a href="https://www.facebook.com/profile.php?id=61561661547362&mibextid=LQQJ4d" style="margin: 0 10px;">
                        <img src="https://img.icons8.com/?size=100&id=yGcWL8copNNQ&format=png&color=000000" alt="Facebook" style="width: 24px;" />
                    </a>
                    <a href="https://www.linkedin.com/company/frimac/" style="margin: 0 10px;">
                        <img src="https://img.icons8.com/color/512/linkedin.png" alt="Linkedin" style="width: 24px;" />
                    </a>
                </div>
            </div>
        </div>`;

        // Enviamos el correo utilizando Nodemailer
        await transporter.sendMail({
            from: "eduardoadrianescobar12@gmail.com", // Remitente
            to: "eduardoadrianescobar12@gmail.com", // Destinatario
            subject: `Notificación de comparendo/s o multa/s para ${conductorOPropietario}`, // Asunto del correo
            html: htmlContent, // Contenido HTML del correo
            attachments: [
                {
                    filename: `Carta_${item.placa_u_documento}.docx`, // Nombre del archivo adjunto
                    path: filePath, // Ruta del archivo adjunto
                },
            ],
        });

        // Eliminamos el archivo .docx temporal después de enviar el correo
        fs.unlinkSync(filePath);
    }

    // Enviamos una respuesta al cliente confirmando que los correos se han enviado
    res.json({ message: 'Correos enviados exitosamente.' });
});


// Endpoint GET para obtener los resultados desde un archivo JSON
app.get('/api/resultados', (req, res) => {
    // Ruta del archivo JSON que contiene los resultados de las placas
    const jsonPath = path.join(__dirname, 'resultados_placas.json');
    
    // Leemos el archivo JSON de manera asíncrona
    fs.readFile(jsonPath, 'utf8', (err, data) => {
        // Manejo de errores en caso de que la lectura falle
        if (err) {
            return res.status(500).json({ error: 'Error al leer el archivo JSON' }); // Devuelve un error 500
        }
        
        // Enviamos los datos leídos como respuesta en formato JSON
        res.json(JSON.parse(data));
    });
});

app.get('/buscarTodos', async (req, res) => {
    try {
        // Llamamos a las funciones que obtienen los usuarios y placas
        const usuarios = await allUsers();
        const placas = await allPlates();

        console.log('Usuarios activos:', usuarios);
        console.log('Placas activas:', placas);

        // Combinamos los datos en un solo JSON
        const resultado = {
            usuariosActivos: usuarios,
            placasActivas: placas
        };

        // Generamos el archivo Excel con los datos de usuarios y placas
        const excelFilePath = generateExcelForUsersAndPlates(resultado, 'datos.xlsx');

        // Inicia la descarga del archivo Excel directamente
        res.download(excelFilePath, 'datos.xlsx', (err) => {
            if (err) {
                console.error('Error al descargar el archivo:', err);
                return res.status(500).json({ message: 'Error al descargar el archivo Excel' });
            }

            // Eliminamos el archivo Excel después de que se haya descargado
            fs.unlinkSync(excelFilePath);
        });

    } catch (error) {
        console.error('Error al generar los datos:', error);
        res.status(500).json({ message: 'Error al generar los datos' });
    }
});

// Inicia el servidor en el puerto especificado
app.listen(port, () => {
    // Mensaje en la consola indicando que el servidor está en funcionamiento
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

