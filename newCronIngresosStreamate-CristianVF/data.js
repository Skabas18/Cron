const puppeteer = require("puppeteer");
const fs = require("fs");
const csv = require("csv-parser");
const { mysqlConnection, postgresConnection } = require("./conexion");
const moment = require("moment");
const querystring = require('querystring');

(async () => {
  const fechaLlega  = process.argv[2];
  const browser = await puppeteer.launch({
    headless: 'new', //false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  const url = "https://www.streamatemodels.com/smm/login.php";
  await page.goto(url);

  try {
    let data = [];

    await page.waitForSelector("#username");
    await page.type("#username", "payments@albastudio.co");
    await page.type("#password", "MILOabril1.");
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    const fechaProvided = process.argv[2];
    const fecha = fechaProvided ? new Date(fechaProvided) : new Date();
    console.log(fecha, 'esta es la fecha que esta generando ');
    // Construir la URL con los parámetros
    const urlBase = 'https://www.streamatemodels.com/reports/earnings?range=day';
    const urlParams = {
      earnday: encodeURIComponent(formatDate(fecha, 'M D, YYYY')).replace(/%2520/g, '%20'),
      earnyear: encodeURIComponent(formatDate(fecha, 'YYYY').replace(/%2520/g, '%20')),
      earnweek: encodeURIComponent(Math.floor(fecha.getTime() / 1000)),
      studio_filter: encodeURIComponent('0'),
      format: encodeURIComponent('csv_detail'),
    };

    const url = `${urlBase}&${querystring.stringify(urlParams)}`;

    let urlFinal = url.replace(/%2520/g, '%20')
    let urlFinal2 = urlFinal.replace(/%252C/g, '%2C');

    await page.goto(urlFinal2);
    console.log(urlFinal2);
    await page.waitForTimeout(5000);

    // Obtener la ruta del archivo descargado
    const downloadPath = "C:\\Users\\desarrollador\\Downloads"; // Ajusta la ruta según sea necesario
    // const downloadPath = 'D:\\usuario\\descargas';
    const files = fs.readdirSync(downloadPath);
    const csvFileName = files.find((file) => file.endsWith(".csv"));
    const csvFilePath = `${downloadPath}/${csvFileName}`;

    // Leer el contenido del archivo CSV
    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        // console.log('Contenido del archivo CSV:', rows[0]['Performer Nickname']);
        let model = [];
        let newArray = {};

        const categorias = [
          "Premium",
          "Exclusive",
          "Tips",
          "Others",
          "GOLD Show",
          "GOLD",
          "Video Purchase",
          "cammodels_referral",
          "subscription",
          "video_purchase",
          "Messenger GOLD",
          "CamModels Referral",
          "bonds",
          "Photo Purchase",
          "Media Bundle Purchase",
          "Fan Club",
          "Exclusive Block",
          "Premium Block",
        ];

        rows.forEach((element) => {
          let nickname = element["Performer Nickname"];
          let fecha = element["End Time (GMT)"];
          // console.log(fecha, 'fecha del archivo antes del formato ');
          const fechaFormat = moment(fecha, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
          // console.log(fechaFormat, ' fecha del archivo despues del formateo ');
          // Verificar si la propiedad existe en el modelo
          if (!(nickname in model)) {
            // Si no existe, inicializarla como un array vacío
            model[nickname] = [];
            newArray[nickname] = {
              categoria: {},
              ingresoTotal: 0,
              nickname: nickname,
              fechaIng:fechaFormat
            };

            // Inicializar cada categoría con valor 0
            categorias.forEach((categoria) => {
              newArray[nickname].categoria[categoria] = 0;
            });
          }

          // Agregar el nickname al array correspondiente
          model[nickname].push(element);

          const categoria = element["Type"];

          // Convertir el valor de Studio Earned a punto flotante
          const earnedValue = parseFloat(
            element["Studio Earned"].replace("$", "")
          );

          // Sumar el ingreso por cada posición
          if (!(categoria in newArray[nickname].categoria)) {
            // Si la categoría no está en el objeto, puedes manejarlo como desees.
            // Aquí simplemente la ignoramos, pero podrías inicializarla en 0 o hacer otro manejo.
            console.warn(`Categoría desconocida: ${categoria}`);
          } else {
            newArray[nickname].categoria[categoria] += earnedValue;
            newArray[nickname].ingresoTotal += earnedValue;
          }
        });

        fs.unlink(csvFilePath, (error) => {
          if (error) {
            console.error('Error al borrar el archivo:', error);
          } else {
            console.log('El archivo fue eliminado correctamente.');
          }
        });
      await insertData(newArray);
      console.log('TERMINO 1');
      await insertAgecny(newArray);
      console.log('TERMINO 2');
      });
  } catch (e) {
    console.log("Error:", e);
  } finally {
    // await browser.close();
    // process.exit(0);
  }
})();


async function insertAgecny(dataModels) {
  return new Promise((resolve) => {
    for (const clave in dataModels){
      const elemento = dataModels[clave];
      const ingresoTotal = elemento.ingresoTotal;
      const fechaIngreso = elemento.fechaIng;

      postgresConnection.query(
        `SELECT user_id FROM usuarios_plataformas WHERE nickname = '${elemento.nickname}' 
          AND status = '1' AND plataforma_id = 1;`,
        (error, results, fields) => {
          if (error) {
            console.error("Error al realizar la consulta:", error);
            return;
          }
            if (results.rows.length > 0) {
              const idUser = results.rows[0].user_id;
              postgresConnection.query(
                `SELECT * FROM plataformas_ingresos WHERE modelo_id = '${idUser}'
                                        AND fecha_transmision = '${fechaIngreso}' AND plataforma_id = 1`,
                (error, resultsPi, fields) => {
                  if (error) {
                    console.error('Error al realizar la consulta:', error);
                    return;
                  }
                  if (resultsPi.rows.length > 0){

                    postgresConnection.query(
                      `UPDATE plataformas_ingresos
                        SET 
                            ingreso1 = ${elemento.categoria.Premium || 0}, 
                            ingreso2 =  ${elemento.categoria.Exclusive || 0},
                            ingreso5 = ${elemento.categoria["GOLD Show"] || 0},
                            ingreso6 = ${elemento.categoria.GOLD || 0},
                            ingreso7 = ${elemento.categoria["Video Purchase"] || 0},
                            ingreso9 = ${elemento.categoria.cammodels_referral || 0},
                            ingreso10 = ${elemento.categoria.subscription || 0},
                            ingreso11 = ${elemento.categoria["Messenger GOLD"] || 0},
                            ingreso13 = ${elemento.categoria["Photo Purchase"] || 0},
                            ingreso14 = ${elemento.categoria.mediaBundle_purchase || 0},
                            ingreso15 = ${elemento.categoria["Fan Club"] || 0},
                            ingreso16 = ${elemento.categoria['Exclusive Block'] || 0},
                            ingreso17 = ${elemento.categoria['Premium Block'] || 0}
                            WHERE modelo_id = ${idUser} AND fecha_transmision = '${fechaIngreso}' AND plataforma_id = 1`,
                          (error, results, fields) => {
                              if (error) {
                                  console.error("Error al realizar la actualización:", error);
                                  return;
                              }
                              console.log(" Actualización Agency");
                          }
                    );

                  }else{
                    postgresConnection.query(`INSERT INTO plataformas_ingresos
                              (plataforma_id,modelo_id, fecha_transmision, ingreso1, ingreso2, ingreso5,
                                ingreso6, ingreso7, ingreso9, ingreso10, ingreso11, ingreso13, ingreso14,
                                ingreso15, ingreso16, ingreso17,create_user_id)
                              VALUES
                              (1,${idUser},
                                  '${fechaIngreso}',
                                  ${elemento.categoria.Premium || 0},
                                  ${elemento.categoria.Exclusive || 0},
                                  ${elemento.categoria["GOLD Show"] || 0},
                                  ${elemento.categoria.GOLD || 0},
                                  ${elemento.categoria["Video Purchase"] || 0},
                                  ${elemento.categoria.cammodels_referral || 0},
                                  ${elemento.categoria.subscription || 0},
                                  ${elemento.categoria["Messenger GOLD"] || 0},
                                  ${elemento.categoria["Photo Purchase"] || 0},
                                  ${elemento.categoria.mediaBundle_purchase || 0},
                                  ${elemento.categoria["Fan Club"] || 0},
                                  ${elemento.categoria['Exclusive Block'] || 0},
                                  ${elemento.categoria['Premium Block'] || 0},
                                  9999
                              )`,
                            (error, results, fields) => {
                                if (error) {
                                  console.error("Error al realizar la inserción:", error);
                                  return;
                                }
                                console.log(" Insert EXITOSO Agency ");
                              }
                    )
                  }
                })
            }
        }
      );
      // }
    }
     // Simular un retraso para demostrar la asincronía
     setTimeout(() => {
      console.log('insertAgecny completado.');
      resolve(); // Resuelve la promesa cuando la operación está completa
    }, 1000); // Simula un segundo de procesamiento
  });

}



async function insertData(dataModels) {
  return new Promise((resolve) => {
    for (const clave in dataModels) {
      // if (dataModels.hasOwnProperty(clave)) {
      const elemento = dataModels[clave];
      
      // Accede directamente al valor total de ingreso
      const ingresoTotal = elemento.ingresoTotal;
      const fechaIngreso = elemento.fechaIng;
      // console.log(' en el insert esta es la fecha que esta sacando ', fechaIngreso);
      //   console.log(`Ingreso Total para ${elemento.nickname}: ${ingresoTotal}`);
      mysqlConnection.query(
        `SELECT id_usuario FROM datos_sesion WHERE sm_user = '${elemento.nickname}'`,
        (error, results, fields) => {
          if (error) {
            console.error("Error al realizar la consulta:", error);
            return;
          }
          if (results && results[0] && results[0].id_usuario) {
            // console.log(' Fecha consulta usuario registro ingreso ', fechaIngreso);
            mysqlConnection.query(
              `SELECT * FROM alba_jasmin_info.stm_ingresos WHERE id_usuario = '${results[0].id_usuario}'
                                      AND fecha = '${fechaIngreso}'`,
              (error, results, fields) => {
                if (error) {
                  // console.error('Error al realizar la consulta:', error);
                  return;
                }
                if (results.length > 0) {
                  if (results && results[0] && 'id_usuario' in results[0]) {
                      mysqlConnection.query(
                          `UPDATE alba_jasmin_info.stm_ingresos 
                            SET 
                                premium = ${elemento.categoria.Premium || 0}, 
                                gold = ${elemento.categoria.GOLD || 0}, 
                                gold_show = ${elemento.categoria["GOLD Show"] || 0},
                                exclusive = ${elemento.categoria.Exclusive || 0},
                                video_purchase = ${elemento.categoria["Video Purchase"] || 0},
                                CamModels_Referral = ${elemento.categoria.cammodels_referral || 0},
                                Subscription = ${elemento.categoria.subscription || 0},
                                premium_block = ${elemento.categoria['Premium Block'] || 0}, 
                                exclusive_block = ${elemento.categoria['Exclusive Block'] || 0}, 
                                messenger_gold = ${elemento.categoria["Messenger GOLD"] || 0}, 
                                activity_feed = ${elemento.categoria.activity_feed || 0}, 
                                mediaBundle_purchase = ${elemento.categoria['Media Bundle Purchase'] || 0}, 
                                photo_purchase = ${elemento.categoria["Photo Purchase"] || 0}, 
                                fan_club = ${elemento.categoria["Fan Club"] || 0}
                            WHERE id_usuario = ${results[0].id_usuario} AND fecha = '${fechaIngreso}'`,
                          (error, results, fields) => {
                              if (error) {
                                  console.error("Error al realizar la actualización:", error);
                                  return;
                              }
                              console.log(elemento.categoria.Premium, " Actualización ");
                              // console.log("Actualización exitosa");
                          }
                      );
                  } else {
                      console.log("No se encontró 'id_usuario' para", elemento.nickname);
                  }
                } else {
                  mysqlConnection.query(
                      `SELECT id_usuario FROM datos_sesion WHERE sm_user = '${elemento.nickname}'`,
                      (error, results, fields) => {
                        if (error) {
                          console.error("Error al realizar la consulta:", error);
                          return;
                        }
                    
                        // Verificar si hay resultados y si results[0] tiene la propiedad 'id_usuario'
                        if (results && results[0] && 'id_usuario' in results[0]) {
                          mysqlConnection.query(
                            `INSERT INTO alba_jasmin_info.stm_ingresos 
                              (id_usuario, fecha, premium, gold, gold_show, exclusive, video_purchase, CamModels_Referral, Subscription, 
                              premium_block, exclusive_block, messenger_gold, activity_feed, mediaBundle_purchase, 
                              photo_purchase, fan_club)
                              VALUES
                              (${results[0].id_usuario},
                              '${fechaIngreso}',
                              ${elemento.categoria.Premium || 0}, 
                              ${elemento.categoria.GOLD || 0}, 
                              ${elemento.categoria["GOLD Show"] || 0},
                              ${elemento.categoria.Exclusive || 0},
                              ${elemento.categoria["Video Purchase"] || 0},
                              ${elemento.categoria.cammodels_referral || 0},
                              ${elemento.categoria.subscription || 0},
                              ${elemento.categoria['Premium Block'] || 0}, 
                              ${elemento.categoria['Exclusive Block'] || 0}, 
                              ${elemento.categoria["Messenger GOLD"] || 0}, 
                              ${elemento.categoria.activity_feed || 0}, 
                              ${elemento.categoria.mediaBundle_purchase || 0}, 
                              ${elemento.categoria["Photo Purchase"] || 0}, 
                              ${elemento.categoria["Fan Club"] || 0})`,
                            (error, results, fields) => {
                              if (error) {
                                console.error("Error al realizar la inserción:", error);
                                return;
                              }
                              console.log(elemento.categoria.Premium," Insert ");
                              // console.log("Inserción exitosa");
                            }
                          );
                        } else {
                          console.log("No se encontró 'id_usuario' para", elemento.nickname);
                        }
                      }
                    );
                    

                  // FROM alba_jasmin_info.stm_ingresos
                  // WHERE id_usuario = '${results[0].id_usuario}'
                  //             AND fecha = '${fechaIngreso}', (error, results, fields) => {

                  //             })
                  // La consulta no tiene resultados
                  // console.log('La segunda consulta no devolvió resultados.');
                }
              }
            );
            // console.log('ID de usuario encontrado:', results[0].id_usuario);
            // Puedes hacer algo con los resultados aquí
          } else {
            // console.log('No se encontró el ID de usuario para', elemento.categoria.GOLD);
          }
        }
      );
      // }
    }
     // Simular un retraso para demostrar la asincronía
     setTimeout(() => {
      console.log('insertAgecny completado.');
      resolve(); // Resuelve la promesa cuando la operación está completa
    }, 1000); // Simula un segundo de procesamiento
  });
  // process.exit(0);
}

// Función para formatear la fecha
function formatDate(date, format) {
  const map = {
    'M': date.toLocaleString('en-us', { month: 'short' }),
    'D': date.getDate(),
    'YYYY': date.getFullYear(),
  };

  return format.replace(/M|D|YYYY/g, match => map[match]);
}
