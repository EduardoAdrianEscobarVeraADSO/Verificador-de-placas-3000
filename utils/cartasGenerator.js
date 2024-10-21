const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} = require("docx");
const crearCarta = async (item) => {
  const hoy = new Date();
  const dia = hoy.getDate();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();
  const conductorOPropietario =
    item.conductor === "N/A" ? item.nombre_propietario : item.conductor;
  const doc = new Document({
    creator: "Buscador de placas",
    title: `Resultados de ${item.placa_u_documento}`,
    description: `Carta con la información de las multas de ${item.placa_u_documento}`,
    sections: [],
  });
  const createParagraph = (text, isBold = !1) => {
    return new Paragraph({
      alignment: "left",
      spacing: { after: 200 },
      children: [
        new TextRun({
          text,
          size: 22,
          font: "Arial",
          color: "000000",
          bold: isBold,
        }),
      ],
    });
  };
  const texto = [];
  texto.push(createParagraph(`Floridablanca, ${dia}/${mes}/${anio}`));
  texto.push(createParagraph(`Señor:`));
  texto.push(createParagraph(`${conductorOPropietario} `, !0));
  texto.push(createParagraph("E.S.M"));
  texto.push(createParagraph("ASUNTO: Notificacion de comparendo", !0));
  texto.push(createParagraph(""));
  texto.push(createParagraph("Cordial Saludo."));
  texto.push(
    createParagraph(
      `En la revisión realizada en la plataforma del SIMIT y del RUNT, se detectó que el señor u organización  ${conductorOPropietario} presenta el (los) siguiente (s) comparendos o multas sobre el criterio de búsqueda ${item.placa_u_documento}:`
    )
  );
  const descriptions = require("../description.json");
  const table = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [createParagraph("Tipo", !0)] }),
          new TableCell({ children: [createParagraph("Infracción", !0)] }),
          new TableCell({ children: [createParagraph("Descripción", !0)] }),
          new TableCell({ children: [createParagraph("Valor", !0)] }),
        ],
      }),
      ...item.tabla_multa.map((multa) => {
        let descripcion = "Descripción no disponible";
        for (const key in descriptions) {
          if (multa.infraccion.includes(key)) {
            descripcion = descriptions[key];
            break;
          }
        }
        return new TableRow({
          children: [
            new TableCell({ children: [createParagraph(multa.tipo)] }),
            new TableCell({
              children: [createParagraph(multa.infraccion.substring(0, 5))],
            }),
            new TableCell({ children: [createParagraph(descripcion)] }),
            new TableCell({
              children: [createParagraph(multa.valor.toString())],
            }),
          ],
        });
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [createParagraph("Total")],
            columnSpan: 3,
          }),
          new TableCell({
            children: [createParagraph(item.resumen.total.toString())],
          }),
        ],
      }),
    ],
  });
  doc.addSection({
    children: [
      ...texto,
      table,
      createParagraph(""),
      createParagraph(
        "Es importante que tenga en cuenta que para Frimac S.A., es indispensable estar a paz y salvo con los requerimientos exigidos por el Ministerio de Transporte, Secretaría de Tránsito, entre otros Organismos de Tránsito. Por tanto, solicitamos su colaboración en la gestión correspondiente para el pago inmediato de los comparendos y/o multas y pendientes hacernos llegar el respectivo paz y salvo o realizar acuerdos de pago y enviar soporte de la evidencia del trámite realizado."
      ),
      createParagraph(""),
      createParagraph("Atentamente, "),
      createParagraph("Comite de seguridad Vial Frimac", !0),
      createParagraph("Recibido: "),
      createParagraph("Firma: _______________________________"),
      createParagraph(
        "Al firmar este documento, usted acepta y confirma que ha leído y comprendido todo su contenido.",
        !0
      ),
    ],
  });
  return Packer.toBuffer(doc);
};
module.exports = { crearCarta };
