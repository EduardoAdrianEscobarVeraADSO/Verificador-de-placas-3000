async function authApi() {
  let user = "EDHERNANDEZ";
  let pw = "uR5vlRIP$";
  const URL =
    "https://tcfrimac.simplexity.com.co/Authentication/Auth/auth/token?";
  const header = {
    "Content-Type": "application/x-www-form-urlencoded",
    authorization: "Bearer ",
  };
  const payload = new URLSearchParams({
    grant_type: "password",
    username: user,
    password: pw,
    client_id: "099153c2625149bc8ecb3e85e03f0022",
  });
  const options = { headers: header, method: "POST", body: payload };
  let response = await fetch(URL, options);
  let responseData = await response.json();
  if (!response.ok) {
    throw new Error(`Error al obtener el token: ${responseData.error}`);
  }
  let token = responseData.access_token;
  return token;
}
async function buscarConductorID(identificacion) {
  const url =
    "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" +
    identificacion +
    "%27))%20or%20(contains(Ucr_Name,%27" +
    identificacion +
    "%27))%20or%20(contains(Identification,%27" +
    identificacion +
    "%27)))";
  const token = await authApi();
  const options = {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
      console.log(
        `No se encontró ningún usuario con la identificación: ${identificacion}`
      );
      usuario = "No existe";
      return;
    }
    const usuario = data.value[0];
    console.log(usuario.Ucr_Name);
    return usuario.Ucr_Name;
  } catch (error) {
    console.error("Hubo un error en la solicitud:", error);
  }
}
async function ObtenerCorreo(identificacion) {
  const url =
    "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" +
    identificacion +
    "%27))%20or%20(contains(Ucr_Name,%27" +
    identificacion +
    "%27))%20or%20(contains(Identification,%27" +
    identificacion +
    "%27)))";
  const token = await authApi();
  const options = {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
      console.log(
        `No se encontró ningún usuario con la identificación: ${identificacion}`
      );
      usuario = "No existe";
      return;
    }
    const usuario = data.value[0];
    console.log(usuario);
    console.log(usuario.MainEmailAddress);
    return usuario.MainEmailAddress;
  } catch (error) {
    console.error("Hubo un error en la solicitud:", error);
  }
}
async function obtenerNombrePropietario(placa) {
  const endPoint =
    "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?";
  const consultaSQL =
    "$filter=(SocId%20eq%2053)%20and%20((VcnType%20eq%20%27TRUCK%27)%20%20%20%20%20%20%20%20%20or%20(VcnType%20eq%20%27HEAD%27)%20or%20(VcnType%20eq%20%27SET%27))%20and%20contains(Plate,%27" +
    placa +
    "%27)%20or%20contains(DriverName,%27" +
    placa +
    "%27)%20or%20contains(CarrierName,%27" +
    placa +
    "%27)%20or%20contains(Trailer,%27" +
    placa +
    "%27)%20or%20contains(TraPlate,%27" +
    placa +
    "%27)%20or%20contains(OwnerName,%27" +
    placa +
    "%27)";
  const URL = endPoint + consultaSQL;
  try {
    let response = await fetch(URL, { method: "GET" });
    if (!response.ok) {
      throw new Error("Error en la petición: " + response.statusText);
    }
    let responseData = await response.json();
    return responseData.value[0].OwnerName;
  } catch (error) {
    console.error("Error:", error);
  }
}
async function ObtenerTipoId(identificacion) {
  const url =
    "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" +
    identificacion +
    "%27))%20or%20(contains(Ucr_Name,%27" +
    identificacion +
    "%27))%20or%20(contains(Identification,%27" +
    identificacion +
    "%27)))";
  const token = await authApi();
  const options = {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
      console.log(
        `No se encontró ningún usuario con la identificación: ${identificacion}`
      );
      usuario = "No existe";
      return;
    }
    const usuario = data.value[0];
    console.log(usuario.IdentificationType);
    return usuario.IdentificationType;
  } catch (error) {
    console.error("Hubo un error en la solicitud:", error);
  }
}
async function ObtenerIdentificacion(identificacion) {
  const url =
    `https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?$filter=(SocId%20eq%2053)%20and%20((VcnType%20eq%20%27TRUCK%27)%20%20%20%20%20%20%20%20%20or%20(VcnType%20eq%20%27HEAD%27)%20or%20(VcnType%20eq%20%27SET%27))%20and%20contains(Plate,%27${identificacion}%27)%20or%20contains(DriverName,%27${identificacion}%27)%20or%20contains(CarrierName,%27${identificacion}%27)%20or%20contains(Trailer,%27${identificacion}%27)%20or%20contains(TraPlate,%27${identificacion}%27)%20or%20contains(OwnerName,%27${identificacion}%27)`;

  const token = await authApi();
  const options = {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
      console.log(
        `No se encontró ningún usuario con la identificación: ${identificacion}`
      );
      usuario = "No existe";
      return;
    }
    const usuario = data.value[0];
    console.log(usuario.OwnerCode);
    return usuario.OwnerCode;
  } catch (error) {
    console.error("Hubo un error en la solicitud:", error);
  }
}
async function ObtenerOperacionPersona(identificacion) {
    const url =
      "https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewUcrTercero?$filter=UcrSocId%20eq%2053%20and%20((contains(Ucr_Code,%27" +
      identificacion +
      "%27))%20or%20(contains(Ucr_Name,%27" +
      identificacion +
      "%27))%20or%20(contains(Identification,%27" +
      identificacion +
      "%27)))";
    const token = await authApi();
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.length === 0) {
        console.log(
          `No se encontró ningún usuario con la identificación: ${identificacion}`
        );
        usuario = "No existe";
        return;
      }
      const usuario = data.value[0];
      console.log(usuario.UcrBusinessOperationTypeBopCode);
      return usuario.UcrBusinessOperationTypeBopCode;
    } catch (error) {
      console.error("Hubo un error en la solicitud:", error);
    }
  }
async function ObtenerOperacionVehiculo(placa) {
    const url = `https://tcfrimac.simplexity.com.co/OData/api/Tc4ViewVehicle?$filter=(SocId%20eq%2053)%20and%20((VcnType%20eq%20%27TRUCK%27)%20%20%20%20%20%20%20%20%20or%20(VcnType%20eq%20%27HEAD%27)%20or%20(VcnType%20eq%20%27SET%27))%20and%20contains(Plate,%27${placa}%27)%20or%20contains(DriverName,%27${placa}%27)%20or%20contains(CarrierName,%27${placa}%27)%20or%20contains(Trailer,%27${placa}%27)%20or%20contains(TraPlate,%27s${placa}%27)%20or%20contains(OwnerName,%27${placa}%27)`

    const token = await authApi();
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.length === 0) {
        console.log(
          `No se encontró ningún usuario con la identificación: ${identificacion}`
        );
        usuario = "No existe";
        return;
      }
      const usuario = data.value[0];
      console.log(usuario.OperationTypeCode);
      return usuario.OperationTypeCode;
    } catch (error) {
      console.error("Hubo un error en la solicitud:", error);
    }
  }
async function obtenerNumeroTelefonico(identificacion){
  const url =
      `https://tcfrimac.simplexity.com.co/OData/api/UcLocation/GetLocation?$filter=UloUCRUcr%20eq%20%27${identificacion}%27`;
    const token = await authApi();
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.length === 0) {
        console.log(
          `No se encontró ningún usuario con la identificación: ${identificacion}`
        );
        usuario = "No existe";
        return;
      }
      const usuario = data.value[0];
      console.log(usuario.MobilePhone);
      return usuario.MobilePhone;
    } catch (error) {
      console.error("Hubo un error en la solicitud:", error);
    }
}
module.exports = {
  authApi,
  buscarConductorID,
  ObtenerCorreo,
  obtenerNombrePropietario,
  ObtenerTipoId,
  ObtenerIdentificacion,
  ObtenerOperacionPersona,
  ObtenerOperacionVehiculo,
  obtenerNumeroTelefonico
};
