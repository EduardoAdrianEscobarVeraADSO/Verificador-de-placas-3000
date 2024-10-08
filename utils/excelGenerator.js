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
        const baseRow = {
            Tipo_Documento: item.tipoId,
            Documento: item.iD,
            Criterio_busqueda: item.placa_u_documento,
            Nombre_Propietario: item.nombre_propietario || 'N/A',
            conductor: item.conductor || "N/A",
            Correo: item.correo,
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
                    Placa: mult.placa,
                    Infraccion: mult.infraccion,
                    Estado: mult.estado,
                    Valor: mult.valor,
                    Valor_a_pagar: mult.valor_a_pagar
                });
            });
        } else {
            summaryData.push({ 
                ...baseRow, 
                Tipo: 'N/A', 
                Notificacion: 'N/A', 
                Secretaria: 'N/A', 
                Infraccion: 'N/A', 
                Estado: 'N/A', 
                Valor: 'N/A', 
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
