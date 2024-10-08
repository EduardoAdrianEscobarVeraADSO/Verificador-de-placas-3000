const { readJsonFile, processJsonData, generateExcel } = require('./excelGenerator');
const { crearCarta } = require('./cartasGenerator');
const { buscarConductorID, ObtenerCorreo, obtenerNombrePropietario, ObtenerIdentificacion, ObtenerTipoId } = require('./findFunctions');

module.exports = {
    readJsonFile,
    processJsonData,
    generateExcel,
    crearCarta,
    buscarConductorID,
    ObtenerCorreo,
    obtenerNombrePropietario, 
    ObtenerIdentificacion,
    ObtenerTipoId
};
