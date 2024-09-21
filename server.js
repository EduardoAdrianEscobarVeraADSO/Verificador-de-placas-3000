const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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

    // Estilo para el encabezado
    const headerCellStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0070C0" } },
        alignment: { horizontal: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
        }
    };

    // Estilo para el contenido
    const cellStyle = {
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
        }
    };

    // Aplicar estilos a las celdas del contenido
    for (let row = 2; row <= summaryData.length + 1; row++) {
        for (let col = 0; col < Object.keys(summaryData[0]).length; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (ws[cellAddress]) {
                ws[cellAddress].s = cellStyle; // Aplicar estilo a la celda
            }
        }
    }

    // Establecer estilos en las celdas de la cabecera
    for (let col in ws) {
        if (col[0] === '!') continue; // Ignorar metadatos
        if (ws[col].v === 'Placa' || ws[col].v === 'Comparendos' || ws[col].v === 'Multas' || 
            ws[col].v === 'Acuerdos_de_pago' || ws[col].v === 'Total' || ws[col].v === 'Tipo' ||
            ws[col].v === 'Notificacion' || ws[col].v === 'Secretaria' || ws[col].v === 'Infraccion' ||
            ws[col].v === 'Estado' || ws[col].v === 'Valor' || ws[col].v === 'Valor_a_pagar') {
            ws[col].s = headerCellStyle; // Aplicar estilo a la cabecera
        }
    }

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

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
