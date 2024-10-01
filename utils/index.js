const { readJsonFile, processJsonData, generateExcel } = require('./excelGenerator');
const { crearCarta } = require('./cartasGenerator');
const { buscarConductorID, ObtenerCorreo, obtenerNombrePropietario } = require('./findFunctions');

module.exports = {
    readJsonFile,
    processJsonData,
    generateExcel,
    crearCarta,
    buscarConductorID,
    ObtenerCorreo,
    obtenerNombrePropietario
};
