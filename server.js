const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun} = require('docx');


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

            const resultado = {
                placa: placa,
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
            console.error(`Error al procesar la placa ${placa}:`, error);
            resultados.push({
                placa: placa,
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

app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'resultados_placas.json');
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const wb = XLSX.utils.book_new();

    const summaryData = [];

    jsonData.forEach(item => {
        const baseRow = {
            Placa: item.placa,
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

        const doc = new Document({
            creator: "Buscador de placas",
            title: `Resultados de ${item.placa}`,
            description: `Carta con la información de las multas de ${item.placa}`,
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
        texto.push(createParagraph(`Señor: propietario del vehiculo con placas ${item.placa}`));
        texto.push(createParagraph(`Propietario del vehiculo con placas ${item.placa}`));
        
        texto.push(createParagraph(""));
        texto.push(createParagraph("E.S.M"));
        
        texto.push(createParagraph(""));
        texto.push(createParagraph("ASUNTO: Notificacion de comparendo", true));
        texto.push(createParagraph(""));
        
        texto.push(createParagraph("Cordial Saludo."));
        texto.push(createParagraph(`En la revisión realizada en la plataforma del SIMIT y del RUNT, se identificó y detectó que el conductor del vehiculo identificado con placas ${item.placa} presenta el (los) siguiente (s) comparendos:`));

    
        // Crear tabla para las multas
        const table = new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [createParagraph("Tipo", true)] }),
                        new TableCell({ children: [createParagraph("Notificación", true)] }),
                        new TableCell({ children: [createParagraph("Infracción", true)] }),
                        new TableCell({ children: [createParagraph("Estado", true)] }),
                        new TableCell({ children: [createParagraph("Valor", true)] }),
                        
                    ],
                }),
                ...item.tabla_multa.map(multa => new TableRow({
                    children: [
                        new TableCell({ children: [createParagraph(multa.tipo)] }),
                        new TableCell({ children: [createParagraph(multa.notificacion)] }),
                        new TableCell({ children: [createParagraph(multa.infraccion.substring(0, 5))] }),
                        new TableCell({ children: [createParagraph(multa.estado)] }),
                        new TableCell({ children: [createParagraph(multa.valor.toString())] }),
                        
                    ],
                })),
                new TableRow({
                    children: [
                        new TableCell({ children: [createParagraph("Total")], columnSpan: 4 }), 
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
        archive.append(buffer, { name: `Carta_${item.placa}.docx` });
    }

    await archive.finalize();
});


app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
