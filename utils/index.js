const {
  readJsonFile,
  processJsonData,
  generateExcel,
  generateExcelForUsersAndPlates,
} = require("./excelGenerator");
const { crearCarta } = require("./cartasGenerator");
const {
  buscarConductorID,
  ObtenerCorreo,
  obtenerNombrePropietario,
  ObtenerIdentificacion,
  ObtenerTipoId,
  ObtenerOperacion,
  obtenerNumeroTelefonico
} = require("./findFunctions");
const { allPlates, allUsers } = require("./allFindFunctions");
module.exports = {
  readJsonFile,
  processJsonData,
  generateExcel,
  generateExcelForUsersAndPlates,
  crearCarta,
  buscarConductorID,
  ObtenerCorreo,
  obtenerNombrePropietario,
  ObtenerIdentificacion,
  ObtenerTipoId,
  allPlates,
  allUsers,
  ObtenerOperacion,
  obtenerNumeroTelefonico
};
