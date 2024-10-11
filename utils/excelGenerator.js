const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function readJsonFile(filePath) {
    const fullPath = path.join("./", filePath);
    const jsonData = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(jsonData);
}

function processJsonData(jsonData) {
    const summaryData = [];

    jsonData.forEach(item => {
        let acuerdos = "NO";

        if (item.resumen) {
            if (item.resumen.acuerdos_de_pago > 0) {
                acuerdos = "SI";
            } else {
                acuerdos = "NO";
            }
        }

        

            const baseRow = {
                Tipo_Documento: item.tipoID,
                Documento: item.ID,
                conductor: item.conductor || "N/A",
                Nombre_Propietario: item.nombre_propietario || 'N/A',
                Correo: item.correo,
                Total: item.resumen?.total || 'No tiene comparendos ni multas',
            };

            if (item.tabla_multa && item.tabla_multa.length > 0) {
                item.tabla_multa.forEach(mult => {
                    const descriptions = require('../description.json');
                    let tipoMulta = mult.tipo;
                    let fechaMult = tipoMulta.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
                    let typeMult = tipoMulta.match(/multa|comparendo/i);
                    let descripcion = "Descripción no disponible";
                    for (const key in descriptions) {
                        if (mult.infraccion.includes(key)) {
                            descripcion = descriptions[key];
                            break;
                        }
                    }
                        summaryData.push({
                        ...baseRow,
                        Fecha_multa: fechaMult[0],
                        Acuerdos_de_pago: acuerdos,
                        Valor: mult.valor,
                        tipo: typeMult[0],
                        Placa: mult.placa,
                        Infraccion: mult.infraccion,
                        Ciudad_de_la_infraccion: mult.secretaria,
                        Organismo_de_transito: mult.secretaria,
                        Estado: mult.estado,
                        Descripcion: descripcion,
                    });
                });
            } else {

                summaryData.push({
                    ...baseRow,
                    Tipo: 'N/A',
                    Notificacion: 'N/A',
                    Infraccion: 'N/A',
                    Placa: 'N/A',
                    Valor: 'N/A',
                    Ciudad_de_la_infraccion: 'N/A',
                    Organismo_de_transito: 'N/A',
                    Estado: 'N/A',
                    Valor_a_pagar: 'N/A'
                });
            }
        });

    return summaryData;
}


function generateExcel(data, fileName) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

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
    const filePath = path.join(__dirname, fileName);
    XLSX.writeFile(wb, filePath);

    return filePath;
}

module.exports = {
    readJsonFile,
    processJsonData,
    generateExcel
};
