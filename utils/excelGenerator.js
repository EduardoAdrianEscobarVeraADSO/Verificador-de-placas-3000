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
        };

        if (item.tabla_multa && item.tabla_multa.length > 0) {
            item.tabla_multa.forEach(mult => {
                const descriptions = require('../description.json');
                let tipoMulta = mult.tipo;
                let infra = mult.infraccion;
                let valor = mult.valor;
                let resultado = valor.match(/\b(20\.000\.000|[1-9]([0-9]{0,2}(?:\.[0-9]{3})*)?)\b/);
                let fechaMult = tipoMulta.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
                let infraccion = infra.match(/^(A0[1-9]|A1[0-2]|B0[1-9]|B1[0-9]|B2[0-3]|C0[1-9]|C1[0-9]|C2[0-9]|C3[0-9]|C[0-9][0-9]|D0[1-9]|D1[0-5]|E0[1-4]|F(0[1-9]|1[0-2])?|F\.0\.[23]|F\.[1-3]\.[1-3]|G0[1-2]|H0[1-9]|H1[0-3]|I0[1-2]|J0[1-6]|500|944)/);
                let typeMult = tipoMulta.match(/multa|comparendo/i);
                let descripcion = "Descripción no disponible";
                console.log(infraccion)
                for (const key in descriptions) {
                    if (mult.infraccion.includes(key)) {
                        descripcion = descriptions[key];
                        break;
                    }
                }
                let fechaMultaFinal = fechaMult ? fechaMult[0] : "Fecha no disponible";
                let resultadoFinal = resultado ? "$ " + resultado[0] : "Valor no disponible";
                let infraccionFinal = infraccion ? infraccion[0] : "Infracción no disponible";
                let typeMultFinal = typeMult ? typeMult[0] : "Tipo no disponible";

                summaryData.push({
                    ...baseRow,
                    Fecha_multa: fechaMultaFinal,
                    Acuerdos_de_pago: acuerdos,
                    Valor: resultadoFinal,
                    tipo: typeMultFinal,
                    Placa: mult.placa,
                    Infraccion: infraccionFinal,
                    Ciudad_de_la_infraccion: mult.secretaria,
                    Organismo_de_transito: mult.secretaria,
                    Estado: mult.estado,
                    Descripcion: descripcion,
                });
            });
        } else {

            summaryData.push({
                ...baseRow,
                Fecha_multa: "N/A",
                Acuerdos_de_pago: "N/A",
                Valor: "N/A",
                tipo: "N/A",
                Placa: "N/A",
                Infraccion: "N/A",
                Ciudad_de_la_infraccion: "N/A",
                Organismo_de_transito: "N/A",
                Estado:"N/A",
                Descripcion: "N/A",
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

function generateExcelForUsersAndPlates(data, fileName) {
    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Transformar los datos de usuarios activos y placas activas a un formato adecuado
    const usuariosActivos = data.usuariosActivos.map(usuario => [usuario]); // Cada usuario en una celda completa
    const placasActivas = data.placasActivas.map(placa => [placa]);         // Cada placa en una celda completa

    // Crear la hoja de trabajo para los usuarios
    const usuariosSheet = XLSX.utils.aoa_to_sheet([['Usuarios Activos'], ...usuariosActivos]); // Título y datos
    XLSX.utils.book_append_sheet(workbook, usuariosSheet, 'Usuarios Activos');

    // Crear la hoja de trabajo para las placas
    const placasSheet = XLSX.utils.aoa_to_sheet([['Placas Activas'], ...placasActivas]); // Título y datos
    XLSX.utils.book_append_sheet(workbook, placasSheet, 'Placas Activas');

    // Definir la ruta del archivo
    const filePath = path.join(__dirname, fileName);

    // Escribir el archivo Excel en el sistema
    XLSX.writeFile(workbook, filePath);

    // Retornar la ruta del archivo
    return filePath;
}

module.exports = {
    readJsonFile,
    processJsonData,
    generateExcel,
    generateExcelForUsersAndPlates
};
