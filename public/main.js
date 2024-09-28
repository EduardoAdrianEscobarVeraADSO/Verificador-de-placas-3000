function validarFor(event) {
    let input = document.getElementById("placa-input").value;

    if (input === "") {
        alert("Los campos no pueden quedar vacíos");
        event.preventDefault();
        return false;
    }

    return true;
}

async function consultarPlacas(event) {
    if (!validarFor(event)) {
        return;
    }

    // Mostrar el loader
    document.getElementById('loader').style.display = 'block';

    const placaInput = document.getElementById('placa-input').value;
    const response = await fetch('/consultar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `placa=${encodeURIComponent(placaInput)}`
    });

    const result = await response.json();
    console.log(result);
    
    const sonido = document.getElementById('sonido-notificacion');
    
    try {
        await sonido.play(); // Esperar a que se reproduzca el sonido
    } catch (error) {
        console.error('Error al reproducir el sonido:', error);
    }

    // Ocultar el loader después de que se complete la consulta
    document.getElementById('loader').style.display = 'none';

    // Reproducir el sonido de notificación y esperar a que termine antes de mostrar el alert

    // Mostrar el alert después de reproducir el sonido
    alert(result.message);

    // Mostrar el botón de descarga después de la consulta
    document.getElementById('download-btn').style.display = 'block';
    document.getElementById('download-btnWord').style.display = 'block';
}

async function descargarCartas() {
    const response = await fetch('/descargar-cartas', {
        method: 'GET',
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cartas.zip'; // Nombre del archivo descargado
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } else {
        console.error('Error al descargar las cartas');
    }
}

// Funciones para descargar archivos
function descargarExcel() {
    window.location.href = '/download-excel';
}

function descargarCartas() {
    window.location.href = '/descargar-cartas';
}
function enviarCorreo() {
    fetch('/enviar-correos')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.blob(); // Si la respuesta es correcta, la convierte en un blob
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cartas.zip'; // Nombre del archivo descargado
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al enviar correos: ' + error.message); // Muestra el error en un mensaje
        });
}


// Función para cargar el JSON y generar la tabla
async function cargarTabla() {
    try {
        const response = await fetch('/api/resultados'); // Ruta del JSON o API
        if (!response.ok) {
            throw new Error('Error al cargar los datos.');
        }
        
        const data = await response.json(); // Cargar los datos del JSON
        
        // Filtrar los datos para incluir solo los que tienen comparendos o multas
        const datosFiltrados = data.filter(item => 
            item.resumen && 
            item.resumen.comparendos > "0" || 
            item.resumen.multas > "0"
        );

        const tablaContenedor = document.getElementById('tabla-contenedor');
        tablaContenedor.innerHTML = ''; // Limpiar contenido anterior

        if (datosFiltrados.length > 0) {
            const tabla = document.createElement('table');
            tabla.className = 'tabla-resultados'; // Estilos de la tabla

            // Crear el encabezado de la tabla
            const thead = document.createElement('thead');
            const encabezado = document.createElement('tr');
            encabezado.innerHTML = `
                <th>Placa/Documento</th>
                <th>Propietario</th>
                <th>Tipo de Infracción</th>
                <th>Fecha Imposición</th>
                <th>Infracción</th>
                <th>Estado</th>
                <th>Valor a Pagar</th>
            `;
            thead.appendChild(encabezado);
            tabla.appendChild(thead);

            // Crear el cuerpo de la tabla
            const tbody = document.createElement('tbody');
            datosFiltrados.forEach(item => {
                if (item.tabla_multa) { // Verificar si existe tabla_multa
                    item.tabla_multa.forEach(multa => {
                        if (multa.tipo.includes("Comparendo") || multa.tipo.includes("Multa")) {
                            const fila = document.createElement('tr');
                            fila.innerHTML = `
                                <td>${item.placa_u_documento}</td>
                                <td>${item.nombre_propietario}</td>
                                <td>${multa.tipo.includes("Comparendo") ? 'Comparendo' : 'Multa'}</td>
                                <td>${multa.tipo.split('Fecha imposición: ')[1]}</td>
                                <td>${multa.infraccion}</td>
                                <td>${multa.estado}</td>
                                <td>${multa.valor_a_pagar.split('Detalle Pago')[0]}</td>
                            `;
                            tbody.appendChild(fila);
                        }
                    });
                }
            });
            tabla.appendChild(tbody);
            tablaContenedor.appendChild(tabla);
        } else {
            tablaContenedor.innerHTML = '<p>No hay comparendos o multas pendientes.</p>';
        }
    } catch (error) {
        console.error('Error al cargar la tabla:', error);
    }
}

// Llamar a la función para cargar la tabla al cargar la página
window.onload = () => {
    cargarTabla();
};


