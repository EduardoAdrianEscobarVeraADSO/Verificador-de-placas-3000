const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, TextRun } = require('docx');


const app = express();
const port = 3000;

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
                return contenedor ? contenedor.innerText : 'Contenedor no encontrado';
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
                    comparendos: datosResumen.comparendos || 'No disponible',
                    multas: datosResumen.multas || 'No disponible',
                    acuerdos_de_pago: datosResumen.acuerdos_de_pago || 'No disponible',
                    total: datosResumen.total || 'No disponible'
                },
                tabla_multa: datosTablaFiltrados.length > 0 ? datosTablaFiltrados : []
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

app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'resultados_placas.json');
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const wb = XLSX.utils.book_new();

    const summaryData = [];

    jsonData.forEach(item => {
        const baseRow = {
            Placa: item.placa,
            Comparendos: item.resumen?.comparendos || 'No disponible',
            Multas: item.resumen?.multas || 'No disponible',
            Acuerdos_de_pago: item.resumen?.acuerdos_de_pago || 'No disponible',
            Total: item.resumen?.total || 'No disponible'
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

    // Ajustar el ancho de las columnas
    ws['!cols'] = [
        { wch: 15 }, // Ancho para la columna "Placa"
        { wch: 20 }, // Ancho para "Comparendos"
        { wch: 15 }, // Ancho para "Multas"
        { wch: 20 }, // Ancho para "Acuerdos de pago"
        { wch: 15 }, // Ancho para "Total"
        { wch: 25 }, // Ancho para "Tipo"
        { wch: 25 }, // Ancho para "Notificacion"
        { wch: 25 }, // Ancho para "Secretaria"
        { wch: 20 }, // Ancho para "Infraccion"
        { wch: 15 }, // Ancho para "Estado"
        { wch: 15 }, // Ancho para "Valor"
        { wch: 20 }  // Ancho para "Valor a pagar"
    ];

    // Agregar el autofiltro a la primera fila
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
            fs.unlinkSync(zipFilePath); // Elimina el archivo ZIP después de enviarlo
        });
    });

    archive.pipe(output);

    for (const item of placasConMultas) {
        const doc = new Document({
            creator: "Buscador de placas",
            title: `Resultados de ${item.placa}`,
            description: `Carta con la información de las multas de ${item.placa}`,
            sections: [],
        });

        const texto = [];

        const paragraphStyle = {
            alignment: 'left',
            spacing: {
                after: 200, // Espaciado después del párrafo
            },
        };
        
        // Función para crear un nuevo párrafo con estilo
        const createParagraph = (text, isBold = false) => {
            return new Paragraph({
                ...paragraphStyle,
                children: [
                    new TextRun({
                        text,
                        size: 28, // Tamaño de letra en puntos
                        font: "Arial", // Tipo de letra
                        color: "000000", // Color del texto
                        bold: isBold,
                    }),
                ],
            });
        };

        // Añadir los párrafos usando el estilo base
        texto.push(createParagraph(`La placa ${item.placa} tiene ${item.tabla_multa.length} multas o comparendos.`));
        texto.push(createParagraph(""));
        texto.push(createParagraph(""));
        
        // Resumen
        texto.push(createParagraph("Resumen:", true));
        texto.push(createParagraph(""));
        texto.push(createParagraph(""));
        
        // Datos del resumen
        texto.push(createParagraph(`Comparendos: ${item.resumen.comparendos}`));
        texto.push(createParagraph(`Multas: ${item.resumen.multas}`));
        texto.push(createParagraph(`Acuerdos de pago: ${item.resumen.acuerdos_de_pago}`));
        texto.push(createParagraph(`Total: ${item.resumen.total}`));
        
        // Más párrafos vacíos
        texto.push(createParagraph(""));
        texto.push(createParagraph(""));
        
        // Detalles de las multas
        texto.push(createParagraph("Detalles de las multas:", true));
        texto.push(createParagraph(""));
        texto.push(createParagraph(""));
        
        item.tabla_multa.forEach(multa => {
            texto.push(createParagraph(`Tipo: ${multa.tipo}`));
            texto.push(createParagraph(`Notificación: ${multa.notificacion}`));
            texto.push(createParagraph(`Infracción: ${multa.infraccion}`));
            texto.push(createParagraph(`Estado: ${multa.estado}`));
            texto.push(createParagraph(`Valor: $${multa.valor}`));
            texto.push(createParagraph(`Valor a pagar: $${multa.valor_a_pagar}`));
            texto.push(createParagraph("\n-----------------------------------"));
        });

        doc.addSection({
            children: texto
        });

        const buffer = await Packer.toBuffer(doc);
        archive.append(buffer, { name: `Carta_${item.placa}.docx` });
    }

    await archive.finalize();
});




app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
