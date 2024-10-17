const { authApi } = require('./findFunctions');

// Lista de operaciones
const operaciones = [
    "COMER", "ALIM", "REFRI", "POLPIE", "SUBPRO", "CANAS", "COMTRA", "CARSEC", "POLLI", "INSUM", "DSECS", "HARI", "HFERT", "MATPRI"
];

async function allUsers() {
    const token = await authApi(); // Autenticación obteniendo el token
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        }
    };

    let todosCodigosUnicos = []; // Acumulador para todos los códigos de usuarios

    // Bucle que recorre cada operación
    for (const operacion of operaciones) {
        // Construir la URL con la operación interpolada
        const url = `https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?%24filter=(UtyCode%20eq%20%27CON%27)%20and%20(State%20eq%20%271%27)%20and%20(UcrBusinessOperationTypeBopCode%20eq%20%27${operacion}%27)`;

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} para la operación ${operacion}`);
            }

            const data = await response.json();

            if (data.value.length === 0) {
                console.log(`No se encontraron usuarios para la operación ${operacion}.`);
                continue; // Saltar a la siguiente operación
            }

            // Obtener todos los Ucr_Code de los usuarios
            const codigosUsuarios = data.value.map(usuario => usuario.Ucr_Code);

            // Eliminar duplicados utilizando un Set
            const codigosUnicos = [...new Set(codigosUsuarios)];

            // Acumular los códigos únicos en el array principal
            todosCodigosUnicos = [...new Set([...todosCodigosUnicos, ...codigosUnicos])];

        } catch (error) {
            console.error(`Hubo un error en la solicitud para la operación ${operacion}:`, error);
        }
    }

    // Retornar todos los códigos únicos de usuarios
    return todosCodigosUnicos;
}

module.exports = { allUsers };


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

        // Filtrar las placas activas y de tipo TRUCK
        const placasActiva = data.value.filter(placas => 
            placas.StaName !== "Inactivo"  
        );

        if (placasActiva.length === 0) {
            console.log('No se encontraron vehículos activos de tipo TRUCK.');
            return [];
        }
        
        const placasActivas = data.value.map(placas => placas.Code);

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
