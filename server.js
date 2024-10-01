const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const archiver = require('archiver');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } = require('docx');
const { readJsonFile, processJsonData, generateExcel } = require('./excelGenerator');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'eduardoadrianescobar12@gmail.com',
        pass: 'yzcx wblj gwrw pmzv'
    }
});
app.post('/consultar', async (req, res) => {
    const inputPlacas = req.body.placa;
    const placasArray = inputPlacas.split(',').map(placa => placa.trim());

    const resultados = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--window-size=1,1']
    });
    // Función para autenticar y obtener el token
    async function authApi() {
        let user = "EDHERNANDEZ";
        let pw = "uR5vlRIP$";

        const URL = "https://tcfrimac.simplexity.com.co/Authentication/Auth/auth/token?";

        const header = {
            "Content-Type": "application/x-www-form-urlencoded",
            "authorization": "Bearer "
        };

        const payload = new URLSearchParams({
            'grant_type': "password",
            'username': user,
            'password': pw,
            'client_id': "099153c2625149bc8ecb3e85e03f0022"
        });

        const options = {
            headers: header,
            method: "POST",
            body: payload
        };

        let response = await fetch(URL, options);
        let responseData = await response.json();

        if (!response.ok) {
            throw new Error(`Error al obtener el token: ${responseData.error}`);
        }

        let token = responseData.access_token;

        return token;
    }
    async function buscarConductorID(identificacion) {
        const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" + identificacion + "%27))%20or%20(contains(Ucr_Name,%27" + identificacion + "%27))%20or%20(contains(Identification,%27" + identificacion + "%27)))";
        const token = await authApi();
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            }
        };

        try {

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();


            if (data.length === 0) {
                console.log(`No se encontró ningún usuario con la identificación: ${identificacion}`);
                usuario = "No existe";
                return;
            }

            const usuario = data.value[0];

            if (usuario.State === 2) {
                console.log(`El usuario con identificación ${identificacion} está inactivo.`);
                usuario = "inactivo";
                return;
            }
            console.log(usuario.Ucr_Name)
            return usuario.Ucr_Name;

        } catch (error) {
            console.error('Hubo un error en la solicitud:', error);
        }
    }
    async function ObtenerCorreo(identificacion) {
        const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" + identificacion + "%27))%20or%20(contains(Ucr_Name,%27" + identificacion + "%27))%20or%20(contains(Identification,%27" + identificacion + "%27)))";
        const token = await authApi();
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            }
        };

        try {

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();


            if (data.length === 0) {
                console.log(`No se encontró ningún usuario con la identificación: ${identificacion}`);
                usuario = "No existe";
                return;
            }

            const usuario = data.value[0];

            if (usuario.State === 2) {
                console.log(`El usuario con identificación ${identificacion} está inactivo.`);
                usuario = "inactivo";
                return;
            }
            console.log(usuario.MainEmailAddress)
            return usuario.MainEmailAddress;

        } catch (error) {
            console.error('Hubo un error en la solicitud:', error);
        }
    }

    for (const placa of placasArray) {
        const page = await browser.newPage();

        try {

            await page.goto(`https://www.fcm.org.co/simit/#/estado-cuenta?numDocPlacaProp=${placa}`, { waitUntil: 'networkidle2', timeout: 20000 });


            await Promise.all([
                page.waitForSelector('#resumenEstadoCuenta', { timeout: 20000 }),
                page.waitForSelector('#multaTable', { timeout: 20000 })
            ]);

            const textoResumen = await page.evaluate(() => {
                const contenedor = document.querySelector('#resumenEstadoCuenta');
                return contenedor ? contenedor.innerText : 'Contenedor No disponible';
            });

            const datosTabla = await page.evaluate(() => {
                const tabla = document.querySelector('#multaTable');
                if (!tabla) return [];

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

            const resultado = {
                placa_u_documento: placa,
                nombre_propietario: nombrePropietario || "N/A",
                conductor: conductor || "N/A",
                correo: correo,
                resumen: {
                    comparendos: datosResumen.comparendos || 'No tiene comparendos ni multas',
                    multas: datosResumen.multas || 'No tiene comparendos ni multas',
                    acuerdos_de_pago: datosResumen.acuerdos_de_pago || 'No tiene comparendos ni multas',
                    total: datosResumen.total || 'No tiene comparendos ni multas comparendos'
                },
                tabla_multa: datosTablaFiltrados.length > 0 ? datosTablaFiltrados : []
            };

            resultados.push(resultado);

        } catch (error) {
            const nombrePropietario = await obtenerNombrePropietario(placa);
            const conductor = await buscarConductorID(placa);
            console.error(`Error al procesar la placa ${placa}:`, error);
            resultados.push({
                placa_u_documento: placa,
                nombre_propietario: nombrePropietario || "N/A",
                conductor: conductor || "N/A",
                mensaje: 'No tiene comparendos ni multas comparendos ni multas'
            });
        } finally {
            await page.close();
        }
    }

    fs.writeFileSync('resultados_placas.json', JSON.stringify(resultados, null, 2), 'utf-8');

    await browser.close();

    res.json({ message: 'Consulta completada y resultados guardados', resultados });
});

async function obtenerNombrePropietario(placa) {
    const endPoint = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?";

    const consultaSQL = "$filter=(SocId%20eq%2053)%20and%20((VcnType%20eq%20%27TRUCK%27)%20%20%20%20%20%20%20%20%20or%20(VcnType%20eq%20%27HEAD%27)%20or%20(VcnType%20eq%20%27SET%27))%20and%20contains(Plate,%27" +
        placa +
        "%27)%20or%20contains(DriverName,%27" +
        placa +
        "%27)%20or%20contains(CarrierName,%27" +
        placa +
        "%27)%20or%20contains(Trailer,%27" +
        placa +
        "%27)%20or%20contains(TraPlate,%27" +
        placa +
        "%27)%20or%20contains(OwnerName,%27" +
        placa +
        "%27)";

    const URL = endPoint + consultaSQL;

    try {
        let response = await fetch(URL, { method: "GET" });

        if (!response.ok) {
            throw new Error("Error en la petición: " + response.statusText);
        }

        let responseData = await response.json();


        return responseData.value[0].OwnerName;
    } catch (error) {
        console.error("Error:", error);
    }
}

app.get('/download-excel', (req, res) => {
    const jsonData = readJsonFile('resultados_placas.json');
    const processedData = processJsonData(jsonData);
    const excelFilePath = generateExcel(processedData, 'resultados_placas.xlsx');

    res.download(excelFilePath, 'resultados_placas.xlsx', (err) => {
        if (err) {
            console.error(err);
        }
        fs.unlinkSync(excelFilePath);
    });
});

const crearCarta = async (item) => {
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();
    const conductorOPropietario = (item.conductor === "N/A") ? item.nombre_propietario : item.conductor;

    const doc = new Document({
        creator: "Buscador de placas",
        title: `Resultados de ${item.placa_u_documento}`,
        description: `Carta con la información de las multas de ${item.placa_u_documento}`,
        sections: [],
    });

    const createParagraph = (text, isBold = false) => {
        return new Paragraph({
            alignment: 'left',
            spacing: {
                after: 200,
            },
            children: [
                new TextRun({
                    text,
                    size: 22,
                    font: "Arial",
                    color: "000000",
                    bold: isBold,
                }),
            ],
        });
    };

    const texto = [];
    texto.push(createParagraph(`Floridablanca, ${dia}/${mes}/${anio}`));
    texto.push(createParagraph(""));
    texto.push(createParagraph(`Señor:`));
    texto.push(createParagraph(`${conductorOPropietario} `, true));
    texto.push(createParagraph(""));
    texto.push(createParagraph("E.S.M"));
    texto.push(createParagraph(""));
    texto.push(createParagraph("ASUNTO: Notificacion de comparendo", true));
    texto.push(createParagraph(""));
    texto.push(createParagraph("Cordial Saludo."));
    texto.push(createParagraph(`En la revisión realizada en la plataforma del SIMIT y del RUNT, se detectó que el señor u organización  ${conductorOPropietario} presenta el (los) siguiente (s) comparendos o multas sobre el criterio de búsqueda ${item.placa_u_documento}:`));

    const descriptions = require('./description.json');

    const table = new Table({
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [createParagraph("Tipo", true)] }),
                    new TableCell({ children: [createParagraph("Infracción", true)] }),
                    new TableCell({ children: [createParagraph("Descripción", true)] }),
                    new TableCell({ children: [createParagraph("Valor", true)] }),
                ],
            }),
            ...item.tabla_multa.map(multa => {
                let descripcion = "Descripción no disponible";
                for (const key in descriptions) {
                    if (multa.infraccion.includes(key)) {
                        descripcion = descriptions[key];
                        break;
                    }
                }

                return new TableRow({
                    children: [
                        new TableCell({ children: [createParagraph(multa.tipo)] }),
                        new TableCell({ children: [createParagraph(multa.infraccion.substring(0, 5))] }),
                        new TableCell({ children: [createParagraph(descripcion)] }),
                        new TableCell({ children: [createParagraph(multa.valor.toString())] }),
                    ],
                });
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [createParagraph("Total")], columnSpan: 3 }),
                    new TableCell({ children: [createParagraph(item.resumen.total.toString())] })
                ],
            }),
        ],
    });

    // Agregar la tabla al documento
    doc.addSection({
        children: [
            ...texto,
            table,
            createParagraph(""),
            createParagraph("Es importante que tenga en cuenta que para Frimac S.A., es indispensable estar a paz y salvo con los requerimientos exigidos por el Ministerio de Transporte, Secretaría de Tránsito, entre otros Organismos de Tránsito. Por tanto, solicitamos su colaboración en la gestión correspondiente para el pago inmediato de los comparendos y/o multas y pendientes hacernos llegar el respectivo paz y salvo o realizar acuerdos de pago y enviar soporte de la evidencia del trámite realizado."),
            createParagraph(""),
            createParagraph("Atentamente, "),
            createParagraph("GISVELL BERNAL", true),
            createParagraph("Jefe Operación de Distribución Urbana Centro", true),
            createParagraph("Recibido: "),
            createParagraph(""),
            createParagraph("Nombre: _______________________________"),
            createParagraph("Firma: _______________________________"),
        ],
    });

    return Packer.toBuffer(doc);
};

app.get('/descargar-cartas', async (req, res) => {
    const resultados = JSON.parse(fs.readFileSync('resultados_placas.json', 'utf-8'));
    const placasConMultas = resultados.filter(item => item.tabla_multa && item.tabla_multa.length > 0);
    const zipFilePath = path.join(__dirname, 'cartas.zip');
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        res.download(zipFilePath, 'cartas.zip', (err) => {
            if (err) {
                console.error(err);
            }
            fs.unlinkSync(zipFilePath); // Eliminar el archivo ZIP después de enviarlo
        });
    });

    archive.pipe(output);

    for (const item of placasConMultas) {
        const buffer = await crearCarta(item);
        archive.append(buffer, { name: `Carta_${item.placa_u_documento}.docx` });
    }

    await archive.finalize();
});


app.post('/enviar-correos', async (req, res) => {
    const resultados = JSON.parse(fs.readFileSync('resultados_placas.json', 'utf-8'));
    const placasConMultas = resultados.filter(item => item.tabla_multa && item.tabla_multa.length > 0);
    
    for (const item of placasConMultas) {
        const conductorOPropietario = (item.conductor === "N/A") ? item.nombre_propietario : item.conductor;
        const buffer = await crearCarta(item);
        const filePath = path.join(__dirname, `Carta_${item.placa_u_documento}.docx`);
        fs.writeFileSync(filePath, buffer); // Guardar temporalmente el archivo

        // HTML con header, footer, estilos y redes sociales
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
                    <a href="https://www.instagram.com/tuempresa" style="margin: 0 10px;">
                        <img src="https://img.icons8.com/color/512/linkedin.png" alt="Linkedin" style="width: 24px;" />
                    </a>
                </div>
            </div>
        </div>`;

        // Envío del correo electrónico con HTML y adjunto
        await transporter.sendMail({
            from: 'eduardoadrianescobar12@gmail.com',
            to: "eduardoadrianescobar12@gmail.com",
            subject: `Notificación de comparendo/s o multa/s para ${conductorOPropietario}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `Carta_${item.placa_u_documento}.docx`,
                    path: filePath,
                },
            ],
        });

        fs.unlinkSync(filePath); // Eliminar el archivo después de enviarlo
    }

    res.json({ message: 'Correos enviados exitosamente.' });
});


app.get('/api/resultados', (req, res) => {
    const jsonPath = path.join(__dirname, 'resultados_placas.json'); 
    fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer el archivo JSON' });
        }
        res.json(JSON.parse(data));
    });
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
