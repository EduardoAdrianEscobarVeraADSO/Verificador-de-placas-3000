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


function descargarExcel() {
    window.location.href = '/download-excel';
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

// Función para consultar placas
async function consultarPlacas(event) {
    const placaInput = document.getElementById('placa-input').value;
    const loader = document.getElementById('loader');
    const tablaContenedor = document.getElementById('tabla-contenedor');
    
    loader.style.display = 'block'; // Mostrar loader

    try {
        const response = await fetch('/consultar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `placa=${encodeURIComponent(placaInput)}`
        });

        const data = await response.json();
        loader.style.display = 'none'; // Ocultar loader
        generarTablaDinamica(data.resultados); // Llamar a la función para crear la tabla
    } catch (error) {
        console.error('Error al consultar las placas:', error);
        loader.style.display = 'none'; // Ocultar loader
    }
}

// Función para generar la tabla dinámica
function generarTablaDinamica(resultados) {
    const tablaContenedor = document.getElementById('tabla-contenedor');
    tablaContenedor.innerHTML = ''; // Limpiar cualquier contenido previo

    if (resultados.length === 0) {
        tablaContenedor.innerHTML = '<p>No hay resultados disponibles</p>';
        return;
    }

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    // Crear el encabezado de la tabla
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Placa', 'Propietario', 'Tipo', 'Notificación', 'Secretaría', 'Infracción', 'Estado', 'Valor', 'Valor a Pagar'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.border = '1px solid #000';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Crear el cuerpo de la tabla
    const tbody = document.createElement('tbody');

    resultados.forEach(resultado => {
        resultado.tabla_multa.forEach(multa => {
            const row = document.createElement('tr');
            const cells = [
                resultado.placa,
                resultado.nombre_propietario || 'No disponible',
                multa.tipo,
                multa.notificacion,
                multa.secretaria,
                multa.infraccion,
                multa.estado,
                multa.valor,
                multa.valor_a_pagar
            ];

            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                td.style.border = '1px solid #000';
                td.style.padding = '8px';
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });
    });

    table.appendChild(tbody);
    tablaContenedor.appendChild(table);
}

// Funciones para descargar archivos
function descargarExcel() {
    window.location.href = '/download-excel';
}

function descargarCartas() {
    window.location.href = '/descargar-cartas';
}
