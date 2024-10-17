function validarFor(event){let input=document.getElementById("placa-input").value.trim();if(input===""){alert("Los campos no pueden quedar vacíos");event.preventDefault();return!1}
return!0}
function mostrarNotificacion(){const notificationContainer=document.getElementById('notification-container');const notification=document.createElement('div');notification.className='notification';notification.innerHTML=`
        Puedes descargar tanto el excel como las cartas del último proceso de consulta!
    `;notificationContainer.appendChild(notification)}
function cerrarNotificacion(btn){const notification=btn.parentElement;notification.remove()}
async function consultarPlacas(event){if(!validarFor(event)){return}
const botonConsultar=document.querySelector('form button[type="submit"]');botonConsultar.disabled=!0;botonConsultar.innerText='Consultando...';document.getElementById('loader').style.display='block';const placaInput=document.getElementById('placa-input').value;const response=await fetch('/consultar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',},body:`placa=${encodeURIComponent(placaInput)}`});const result=await response.json();console.log(result);const sonido=document.getElementById('sonido-notificacion');try{await sonido.play()}catch(error){console.error('Error al reproducir el sonido:',error)}
document.getElementById('loader').style.display='none';botonConsultar.disabled=!1;botonConsultar.innerText='Consultar';alert(result.message);document.getElementById('download-btn').style.display='block';document.getElementById('download-btnWord').style.display='block'}
async function descargarCartas(){const response=await fetch('/descargar-cartas',{method:'GET',});if(response.ok){const blob=await response.blob();const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cartas.zip';document.body.appendChild(a);a.click();a.remove();window.URL.revokeObjectURL(url)}else{console.error('Error al descargar las cartas')}}
function descargarExcel(){window.location.href='/download-excel'}
async function enviarCorreo(){const response=await fetch('/enviar-correos',{method:'POST',});if(response.ok){const blob=await response.blob();const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cartas.zip';document.body.appendChild(a);a.click();a.remove();window.URL.revokeObjectURL(url)}else{console.error('Error al enviar correos:',response.statusText);alert('Error al enviar correos: '+response.statusText)}}
async function cargarTabla(){try{const response=await fetch('/api/resultados');if(!response.ok){throw new Error('Error al cargar los datos.')}
const data=await response.json();const datosFiltrados=data.filter(item=>item.resumen&&(item.resumen.comparendos>"0"||item.resumen.multas>"0"));const tablaContenedor=document.getElementById('tabla-contenedor');tablaContenedor.innerHTML='';if(datosFiltrados.length>0){const tabla=document.createElement('table');tabla.className='tabla-resultados';const thead=document.createElement('thead');const encabezado=document.createElement('tr');encabezado.innerHTML=`
                <th>Placa/Documento</th>
                <th>Propietario</th>
                <th>Tipo de Infracción</th>
                <th>Fecha Imposición</th>
                <th>Infracción</th>
                <th>Estado</th>
                <th>Valor a Pagar</th>
            `;thead.appendChild(encabezado);tabla.appendChild(thead);const tbody=document.createElement('tbody');datosFiltrados.forEach(item=>{if(item.tabla_multa){item.tabla_multa.forEach(multa=>{if(multa.tipo.includes("Comparendo")||multa.tipo.includes("Multa")){const fila=document.createElement('tr');fila.innerHTML=`
                                <td>${item.placa_u_documento}</td>
                                <td>${item.nombre_propietario}</td>
                                <td>${multa.tipo.includes("Comparendo") ? 'Comparendo' : 'Multa'}</td>
                                <td>${multa.tipo.split('Fecha imposición: ')[1]}</td>
                                <td>${multa.infraccion}</td>
                                <td>${multa.estado}</td>
                                <td>${multa.valor_a_pagar.split('Detalle Pago')[0]}</td>
                            `;tbody.appendChild(fila)}})}});tabla.appendChild(tbody);tablaContenedor.appendChild(tabla)}else{tablaContenedor.innerHTML='<p>No hay comparendos o multas pendientes.</p>'}}catch(error){console.error('Error al cargar la tabla:',error)}}
function buscarTodos(){window.location.href='/buscarTodos'}
window.onload=()=>{cargarTabla();mostrarNotificacion()}