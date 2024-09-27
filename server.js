const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } = require('docx');


const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/consultar', async (req, res) => {
    const inputPlacas = req.body.placa;
    const placasArray = inputPlacas.split(',').map(placa => placa.trim());

    const resultados = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--window-size=1,1']
    });

    async function buscarConductorID(identificacion) {
        const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27+%27))%20or%20(contains(Ucr_Name,%27+%27))%20or%20(contains(Identification,%27+%27)))";
        const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1laWQiOiI2M2Q1ZDhiNi04ZTUwLTRlMmItYjgxYS00ZDNiMmM5OTU4OTAiLCJ1bmlxdWVfbmFtZSI6IkVESEVSTkFOREVaIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS9hY2Nlc3Njb250cm9sc2VydmljZS8yMDEwLzA3L2NsYWltcy9pZGVudGl0eXByb3ZpZGVyIjoiQVNQLk5FVCBJZGVudGl0eSIsIkFzcE5ldC5JZGVudGl0eS5TZWN1cml0eVN0YW1wIjoiYzYwODE2YmYtMTdjMy00MTA1LWFlY2MtMmNjZGY4NmY4NWMxIiwiZW1haWwiOiJhdXhpbGlhcjEuZmxvdGFwcm9waWFAZnJpbWFjLmNvbS5jbyIsImZpcnN0TmFtZSI6IkVkd2luZyIsImxhc3ROYW1lIjoiSGVybsOhbmRleiBIZXJyZXJhIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo5MDAwIiwiYXVkIjoiMDk5MTUzYzI2MjUxNDliYzhlY2IzZTg1ZTAzZjAwMjIiLCJleHAiOjE3Mjc1MzY0MjcsIm5iZiI6MTcyNzQ1MDAyN30.GthcI_sSTD8-C9Z1xM39_7PeeTXyZRnNRiLjmGCI_Iw";

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

            const filteredData = data.value.filter(item => item.Identification === identificacion);

            if (filteredData.length === 0) {
                console.log(`No se encontró ningún usuario con la identificación: ${identificacion}`);
                usuario = "No existe";
                return;
            }

            const usuario = filteredData[0];

            if (usuario.State === 2) {
                console.log(`El usuario con identificación ${identificacion} está inactivo.`);
                usuario = "inactivo";
                return;
            }

            return usuario.Ucr_Name;

        } catch (error) {
            console.error('Hubo un error en la solicitud:', error);
        }
    }


    for (const placa of placasArray) {
        const page = await browser.newPage();

        try {
            const url = `https://www.fcm.org.co/simit/#/estado-cuenta?numDocPlacaProp=${placa}`;
            await page.goto(url, { waitUntil: 'networkidle2' });

            await page.waitForSelector('#resumenEstadoCuenta', { timeout: 10000 });
            await page.waitForSelector('#multaTable', { timeout: 10000 });

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

            const resultado = {
                placa_u_documento: placa,
                nombre_propietario: nombrePropietario || "N/A",
                conductor: conductor || "N/A",
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
    const filePath = path.join(__dirname, 'resultados_placas.json');
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const wb = XLSX.utils.book_new();

    const summaryData = [];

    jsonData.forEach(item => {
        const baseRow = {
            Placa_u_documento: item.placa_u_documento,
            Nombre_Propietario: item.nombre_propietario || 'N/A',
            conductor: item.conductor || "N/A",
            Comparendos: item.resumen?.comparendos || 'No tiene comparendos ni multas',
            Multas: item.resumen?.multas || 'No tiene comparendos ni multas',
            Acuerdos_de_pago: item.resumen?.acuerdos_de_pago || 'No tiene comparendos ni multas',
            Total: item.resumen?.total || 'No tiene comparendos ni multas'
        };

        if (item.tabla_multa && item.tabla_multa.length > 0) {
            item.tabla_multa.forEach(mult => {
                summaryData.push({
                    ...baseRow,
                    Tipo: mult.tipo,
                    Notificacion: mult.notificacion,
                    Secretaria: mult.secretaria,
                    Infraccion: mult.infraccion,
                    Estado: mult.estado,
                    Valor: mult.valor,
                    Valor_a_pagar: mult.valor_a_pagar
                });
            });
        } else {
            summaryData.push({ ...baseRow, Tipo: 'N/A', Notificacion: 'N/A', Secretaria: 'N/A', Infraccion: 'N/A', Estado: 'N/A', Valor: 'N/A', Valor_a_pagar: 'N/A' });
        }
    });

    const ws = XLSX.utils.json_to_sheet(summaryData);


    ws['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 }
    ];


    ws['!autofilter'] = { ref: "A1:L1" };

    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

    const excelFilePath = path.join(__dirname, 'resultados_placas.xlsx');
    XLSX.writeFile(wb, excelFilePath);

    res.download(excelFilePath, 'resultados_placas.xlsx', (err) => {
        if (err) {
            console.error(err);
        }
        fs.unlinkSync(excelFilePath);
    });
});

const archiver = require('archiver');

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
        texto.push(createParagraph(`En la revisión realizada en la plataforma del SIMIT y del RUNT, se detectó que el señor u organizacion  ${conductorOPropietario} presenta el (los) siguiente (s) comparendos o multas sobre el criterio de busqueda ${item.placa_u_documento}:`));


        
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

        const buffer = await Packer.toBuffer(doc);
        archive.append(buffer, { name: `Carta_${item.placa_u_documento}.docx` });
    }

    await archive.finalize();
});

app.get('/api/resultados', (req, res) => {
    const jsonPath = path.join(__dirname, 'resultados_placas.json'); // Ruta al JSON
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
