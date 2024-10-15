
const { authApi } = require('./findFunctions');

async function allUsers() {
    const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27*%27))%20%20or%20(contains(Ucr_Name,%27*%27))%20or%20(contains(Identification,%27*%27)))";
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
    const url = "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?$filter=(SocId%20eq%2053)%20and%20((VcnType%20eq%20%27TRUCK%27)%20%20%20%20%20%20%20%20%20or%20(VcnType%20eq%20%27HEAD%27)%20or%20(VcnType%20eq%20%27SET%27))%20and%20contains(Plate,%27*%27)%20or%20contains(DriverName,%27*%27)%20or%20contains(CarrierName,%27*%27)%20or%20contains(Trailer,%27*%27)%20or%20contains(TraPlate,%27*%27)%20or%20contains(OwnerName,%27*%27)";
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

        // Filtrar las placas activas 
        const placasActiva = data.value.filter(placas => placas.StaName !== "Inactivo");
        
        

        if (placasActiva.length === 0) {
            console.log('No se encontraron usuarios activos.');
            return [];
        }
        const placasActivas = placasActiva.map(placas => placas.Code);

        console.log('Usuarios activos:', placasActivas);
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
