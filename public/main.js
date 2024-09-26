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
    generarTablaDinamica(data.resultados); // Llamar a la función para crear la tabla
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

// Funciones para descargar archivos
function descargarExcel() {
    window.location.href = '/download-excel';
}

function descargarCartas() {
    window.location.href = '/descargar-cartas';
}
