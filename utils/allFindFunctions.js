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
    const token = await authApi(); // Autenticación obteniendo el token
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        }
    };

    let vehiculosActivosUnicos = []; // Acumulador para todos los códigos únicos de vehículos

    // Expresión regular para filtrar placas en formato ABC123 (3 letras seguidas de 3 números)
    const regexPlacaValida = /^[A-Za-z]{3}[0-9]{3}$/;

    // Bucle que recorre cada operación
    for (const operacion of operaciones) {
        // Construir la URL con la operación interpolada
        const url = `https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?%24filter=(OperationTypeCode%20eq%20%27${operacion}%27)%20and%20(StaName%20eq%20%27Activo%27)`;

        try {
            const respuesta = await fetch(url, options);

            if (!respuesta.ok) {
                throw new Error(`Error HTTP! estado: ${respuesta.status} para la operación ${operacion}`);
            }

            const datos = await respuesta.json();

            if (datos.value.length === 0) {
                console.log(`No se encontraron vehículos activos para la operación ${operacion}.`);
                continue; // Saltar a la siguiente operación
            }

            // Obtener todos los códigos de vehículos y filtrar solo las placas válidas
            const codigosVehiculos = datos.value
                .map(vehiculo => vehiculo.Code)
                .filter(placa => regexPlacaValida.test(placa)); // Filtrar placas con el formato correcto

            // Eliminar duplicados utilizando un Set
            const vehiculosUnicos = [...new Set(codigosVehiculos)];

            // Acumular los códigos únicos en el array principal
            vehiculosActivosUnicos = [...new Set([...vehiculosActivosUnicos, ...vehiculosUnicos])];

        } catch (error) {
            console.error(`Hubo un error en la solicitud para la operación ${operacion}:`, error);
        }
    }

    // Retornar todos los códigos únicos de vehículos activos con placas válidas
    return vehiculosActivosUnicos;
}



module.exports = {
    allPlates,
    allUsers
};
