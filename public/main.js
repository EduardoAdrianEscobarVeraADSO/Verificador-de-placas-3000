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

    // Reproducir el sonido de notificación
    const sonido = document.getElementById('sonido-notificacion');
    sonido.play();

    // Mostrar el alert después de reproducir el sonido
    alert(result.message);

    // Mostrar el botón de descarga después de la consulta
    document.getElementById('download-btn').style.display = 'block';
}

function descargarExcel() {
    window.location.href = '/download-excel';
}
