const nodemailer = require('nodemailer');

// Configura el transporte SMTP para Hotmail/Outlook
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: 'pruebitasfrimac@hotmail.com', // Tu cuenta de Hotmail
    pass: '1234frimac'          // La contraseña de tu cuenta de Hotmail
  }
});

// Opciones del correo
const mailOptions = {
  from: 'frimaczonafranca@hotmail.com',
  to: 'eduardoadrianescobar12@gmail.com', // Dirección del destinatario
  subject: 'Asunto del correo',
  text: 'Contenido del correo en texto plano',
  html: '<b>Contenido del correo en HTML</b>' // Opcional, contenido en HTML
};

// Enviar el correo
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error al enviar el correo:', error);
  } else {
    console.log('Correo enviado:', info.response);
  }
});


// async function enviarCorreo(identificacion) {
//         const url = `https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27${identificacion}%27))%20%20or%20(contains(Ucr_Name,%27${identificacion}%27))%20or%20(contains(Identification,%27${identificacion}%27)))`;
//         const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1laWQiOiI2M2Q1ZDhiNi04ZTUwLTRlMmItYjgxYS00ZDNiMmM5OTU4OTAiLCJ1bmlxdWVfbmFtZSI6IkVESEVSTkFOREVaIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS9hY2Nlc3Njb250cm9sc2VydmljZS8yMDEwLzA3L2NsYWltcy9pZGVudGl0eXByb3ZpZGVyIjoiQVNQLk5FVCBJZGVudGl0eSIsIkFzcE5ldC5JZGVudGl0eS5TZWN1cml0eVN0YW1wIjoiYzYwODE2YmYtMTdjMy00MTA1LWFlY2MtMmNjZGY4NmY4NWMxIiwiZW1haWwiOiJhdXhpbGlhcjEuZmxvdGFwcm9waWFAZnJpbWFjLmNvbS5jbyIsImZpcnN0TmFtZSI6IkVkd2luZyIsImxhc3ROYW1lIjoiSGVybsOhbmRleiBIZXJyZXJhIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo5MDAwIiwiYXVkIjoiMDk5MTUzYzI2MjUxNDliYzhlY2IzZTg1ZTAzZjAwMjIiLCJleHAiOjE3Mjc1MzY0MjcsIm5iZiI6MTcyNzQ1MDAyN30.GthcI_sSTD8-C9Z1xM39_7PeeTXyZRnNRiLjmGCI_Iw";

//         // const respuesta = await authApi();
//         // console.log(respuesta);
        
//         // const token = respuesta;

//         const options = {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         };

//         try {

//             const response = await fetch(url, options);

//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();

//             if (data.length === 0) {
//                 return `No se encontró ningún usuario con la identificación: ${identificacion}`;
                
//             }

//             const usuario = data.value[0];

//             if (usuario.State === 2) {
//                 return `El usuario con identificación ${identificacion} está inactivo.`;

//             }

//             return usuario.MainEmailAddress;

//         } catch (error) {
//             console.error('Hubo un error en la solicitud:', error);
//         }
//     }
//     (async function() {
//         try {
//             const nombrePropietario = await enviarCorreo("1033819281");
//             console.log(nombrePropietario);
//             // return nombrePropietario;
//         } catch (error) {
//             console.error('Error al buscar el conductor:', error);
//         }
//     })();

//     // async function authApi(){
  
//     //     let user = "EDHERNANDEZ";
//     //     let pw = "uR5vlRIP$";
      
//     //     const URL ="https://tcfrimac.simplexity.com.co/Authentication/Auth/auth/token?";
      
//     //     const header = {
//     //       "Content-Type": "application/x-www-form-urlencoded",
//     //       "authorization": "Bearer "
//     //     };
      
//     //     const payload = {
//     //       'grant_type': "password",
//     //       'username': user,
//     //       'password': pw,
//     //       'client_id': "099153c2625149bc8ecb3e85e03f0022"
//     //     };
      
//     //     const options = {
//     //       'headers': header,
//     //       'method': "POST",
//     //       'payload': payload
//     //     };
      
//     //     let response = await fetch(URL, options);
//     //     let responseData = await response.json();
//     //     console.log(responseData);
        
//     //     let token = responseData.access_token;
      
//     //     return token;
        
      
//     //   }