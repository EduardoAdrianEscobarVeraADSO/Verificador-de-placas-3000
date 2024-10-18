Documentación del Proyecto
Tecnologías Utilizadas:

Express.js
Puppeteer
Body-parser
Nodemailer
File System (fs)
Path
Archiver
Docx-pdf (conversión de documentos)
Librerías personalizadas incluidas en utils


______________________________________________________________________________________________________________________________________________________________________________________________

Endpoints del Proyecto
GET /

Sirve el archivo index.html, que es la página principal.
POST /consultar

Funcionalidad: Realiza consultas web a la página del SIMIT utilizando Puppeteer para extraer datos de comparendos o multas de una lista de placas ingresadas.
Entrada: Las placas se envían mediante el cuerpo de la solicitud, separadas por espacios.
Proceso:
Se crea un navegador con Puppeteer y se procesan las placas una por una.
Se consulta la información de comparendos/multas y se extraen datos como propietario, conductor, ID, y detalles de multas o acuerdos.
Los datos de cada placa se almacenan en un archivo JSON (resultados_placas.json).
Salida:
JSON que incluye el mensaje de éxito y los resultados extraídos.
GET /download-excel

Funcionalidad: Genera un archivo Excel a partir de los datos del archivo resultados_placas.json.
Proceso:
Lee los datos del archivo JSON previamente generado.
Procesa los datos y genera un archivo Excel llamado resultados_placas.xlsx.
El archivo se descarga y luego se elimina del servidor.
Salida: Archivo Excel descargable.
GET /descargar-cartas

Funcionalidad: Genera y descarga un archivo ZIP con cartas de notificación de comparendos o multas en formato .docx.
Proceso:
Lee los resultados del archivo resultados_placas.json.
Para cada placa con multas, genera una carta en formato .docx.
Comprime las cartas en un archivo ZIP y lo ofrece para descarga.
Luego, elimina los archivos temporales.
Salida: Archivo ZIP descargable con cartas .docx.
POST /enviar-correos

Funcionalidad: Envía correos electrónicos con las cartas de notificación de multas adjuntas.
Proceso:
Lee los resultados del archivo resultados_placas.json.
Para cada placa con multas, genera una carta .docx y la adjunta al correo.
Envía el correo electrónico a la dirección del conductor o propietario utilizando Nodemailer.
Elimina los archivos temporales después del envío.
Salida: JSON que indica si los correos fueron enviados exitosamente.


Generación del Archivo JSON (resultados_placas.json)
Este archivo se genera después de realizar la consulta en el endpoint /consultar y contiene los datos extraídos de cada placa consultada. El formato JSON para cada entrada es el siguiente:


{
  "tipoID": "N/A", 
  "ID": "12345678", 
  "placa_u_documento": "ABC123", 
  "nombre_propietario": "Juan Pérez", 
  "conductor": "Carlos Ramírez", 
  "correo": "ejemplo@correo.com", 
  "requiere_revision_adicional": "No", 
  "resumen": {
    "comparendos": "No tiene comparendos ni multas", 
    "multas": "No tiene comparendos ni multas", 
    "acuerdos_de_pago": "No tiene comparendos ni multas", 
    "total": "No tiene comparendos ni multas"
  },
  "tabla_multa": [
    {
      "tipo": "Infracción", 
      "notificacion": "Notificado", 
      "placa": "ABC123", 
      "secretaria": "Secretaría de Tránsito", 
      "infraccion": "C23", 
      "estado": "Pendiente", 
      "valor": "$200.000", 
      "valor_a_pagar": "$180.000"
    }
  ]
}


Datos Generales:

tipoID: Tipo de identificación del propietario o conductor.
ID: Número de identificación del propietario o conductor.
placa_u_documento: Placa del vehículo consultado.
nombre_propietario: Nombre del propietario del vehículo.
conductor: Nombre del conductor si es diferente al propietario.
correo: Correo electrónico asociado.
requiere_revision_adicional: Indica si la consulta requiere revisión adicional.
Resumen de Comparendos:

comparendos: Detalle de comparendos.
multas: Detalle de multas.
acuerdos_de_pago: Información sobre acuerdos de pago.
total: Total acumulado de comparendos y multas.
Detalles de Multas:

Contiene una lista de infracciones, su notificación, placa, secretaría encargada, tipo de infracción, estado de pago y valor.




Flujo de Trabajo
Consulta de Placas (/consultar):

El usuario ingresa una o más placas. Se realiza una consulta al sistema SIMIT y se extraen datos de cada placa.
Los datos se almacenan en resultados_placas.json.
Generación de Archivos:

El endpoint /download-excel permite descargar un archivo Excel con los resultados de las consultas.
El endpoint /descargar-cartas permite descargar cartas en formato .docx comprimidas en un archivo ZIP.
Envío de Correos:

El endpoint /enviar-correos envía correos electrónicos con las cartas adjuntas a los propietarios o conductores de los vehículos con comparendos o multas.




Notas Adicionales
Gestión de Errores: Se maneja con promesas y Promise.allSettled para asegurarse de que si alguna consulta falla, el proceso no se detenga.
Eliminación de Archivos Temporales: Después de enviar correos o generar archivos descargables, los archivos temporales se eliminan automáticamente del servidor para no ocupar espacio innecesario.