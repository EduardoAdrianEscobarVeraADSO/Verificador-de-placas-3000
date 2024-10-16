
const { authApi } = require('./findFunctions');

async function allUsers() {
    const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?";
    const token = await authApi();
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

        if (data.value.length === 0) {
            console.log('No se encontraron usuarios.');
            return [];
        }

        // Filtrar los usuarios activos 
        const usuariosActivos = data.value.filter(usuario => usuario.State !== 2);

        if (usuariosActivos.length === 0) {
            console.log('No se encontraron usuarios activos.');
            return [];
        }

        // Obtener todos los Ucr_Code de los usuarios activos
        const codigosActivos = usuariosActivos.map(usuario => usuario.Ucr_Code);

        // Eliminar duplicados utilizando un Set
        const codigosUnicos = [...new Set(codigosActivos)];

        console.log('Códigos únicos de usuarios activos:', codigosUnicos);
        return codigosUnicos; // Retorna la lista de códigos únicos

    } catch (error) {
        console.error('Hubo un error en la solicitud:', error);
        return [];
    }
}



async function allPlates() {
    const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?";
    const token = await authApi();
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

        if (data.value.length === 0) {
            console.log('No se encontraron placas.');
            return [];
        }

        // Filtrar las placas activas y de tipo TRUCK
        const placasActiva = data.value.filter(placas => 
            placas.StaName !== "Inactivo" && placas.VcnType === "TRUCK" || placas.VcnType === "TRUCK" 
        );

        if (placasActiva.length === 0) {
            console.log('No se encontraron vehículos activos de tipo TRUCK.');
            return [];
        }
        
        const placasActivas = placasActiva.map(placas => placas.Code);

        return placasActivas;

    } catch (error) {
        console.error('Hubo un error en la solicitud:', error);
        return [];
    }
}


module.exports = {
    allPlates,
    allUsers
};
