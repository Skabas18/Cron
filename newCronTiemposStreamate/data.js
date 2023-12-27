const puppeteer = require("puppeteer");
const fs = require("fs");
const csv = require("csv-parser");
const dbConnection = require("./conexion");
const moment = require("moment");
const querystring = require('querystring');
const { log } = require("console");

(async () => {
  // const fechaLlega  = process.argv[2];
  const browser = await puppeteer.launch({
    headless: false, //'new'
    defaultViewport: null,
    timeout: 50000,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  const url = "https://www.streamatemodels.com/smm/login.php";
  await page.goto(url);

  try {
    // let data = [];
    await page.waitForSelector("#username");
    await page.type("#username", "payments@albastudio.co");
    await page.type("#password", "MILOabril1.");
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    // console.log(' va por este lado ');
    const fechaProvided = process.argv[2];
    // const fecha = fechaProvided ? new Date(fechaProvided) : new Date();
    // console.log(fechaProvided, 'esta es la fecha que esta generando ');
    // Construir la URL con los parámetros
    const urlBase = 'https://www.streamatemodels.com/reports/timesheet?earnweek=';
    const resultado = await getPreviousSunday(fechaProvided);
    const urlTiempos = `${urlBase}${resultado}&studio_filter=0`;

    // // await page.goto(urlTiempos);
    // await page.goto('https://www.streamatemodels.com/reports/timesheet?earnweek=1702771200&studio_filter=0');
    // // await page.reload();
    // console.log("Recarga la pagina");
    // await page.waitForSelector('#percent');
    // await page.evaluate(() => {
    //   console.log(' entra al evaluate ');
    //   document.getElementById('percent').click();
    // });
    await page.goto('https://legacy.streamatemodels.com/reports/timesheet/?earnweek=1702771200&studio_filter=0&lang=en&disableNavigation=true');
    // await page.reload();
    await page.waitForFunction(() => {
      return document.readyState === 'complete';
    }, { timeout: 30000 });
    const html = await page.content();
    console.log(html); // Esto imprimirá el HTML en la consola
    await page.waitForSelector('#percent');
    await page.click('#percent');
    await page.waitForSelector('#paid');
    await page.click('#paid');
    console.log("Paso");


  } catch (e) {
    console.log("Error:", e);
  } finally {
    //await browser.close();
  }
})();

async function getPreviousSunday(fechaActual) {
  // console.log(' esta es la fecha ');
  let fechaInput = fechaActual ? new Date(fechaActual) : new Date();
  let diaSemana = fechaInput.getDay();
  if (diaSemana === 0) { // día de la semana es 0 haciendo referencia al arreglo de días 0 = domingo, 1 = lunes....
    let domingoAnterior = new Date(fechaInput);
    domingoAnterior.setUTCHours(0, 0, 0, 0);
    return domingoAnterior.getTime() / 1000;
  } else {
    // Calcular el tiempo (no la fecha) de cuándo fue el inicio de semana
    let tiempoDeInicioDeSemana = new Date(fechaInput.setUTCHours(0, 0, 0, 0) - diaSemana * 24 * 60 * 60 * 1000);
    // Y formateamos ese tiempo
    let dia = tiempoDeInicioDeSemana.getUTCDate();
    let mes = tiempoDeInicioDeSemana.getUTCMonth() + 1; // Mes en JavaScript es 0-indexed
    let año = tiempoDeInicioDeSemana.getUTCFullYear();

    let domingoAnterior = new Date();
    domingoAnterior.setUTCFullYear(año);
    domingoAnterior.setUTCMonth(mes - 1); // Restamos 1 porque el mes está 0-indexed
    domingoAnterior.setUTCDate(dia);
    domingoAnterior.setUTCHours(0, 0, 0, 0);

    return domingoAnterior.getTime() / 1000;
  }
}

function insertData(dataModels) {
  // console.log(dataModels);
  for (const clave in dataModels) {
    // if (dataModels.hasOwnProperty(clave)) {
    const elemento = dataModels[clave];

    // Accede directamente al valor total de ingreso
    const ingresoTotal = elemento.ingresoTotal;
    const fechaIngreso = elemento.fechaIng;

    dbConnection.query(
      `SELECT id_usuario FROM datos_sesion WHERE sm_user = '${elemento.nickname}'`,
      (error, results, fields) => {
        if (error) {
          console.error("Error al realizar la consulta:", error);
          return;
        }
        if (results && results[0] && results[0].id_usuario) {
          // console.log(' Fecha consulta usuario registro ingreso ', fechaIngreso);
          dbConnection.query(
            `SELECT * FROM alba_jasmin_info.stm_ingresos WHERE id_usuario = '${results[0].id_usuario}'
                                    AND fecha = '${fechaIngreso}'`,
            (error, results, fields) => {
              if (error) {
                // console.error('Error al realizar la consulta:', error);
                return;
              }
              if (results.length > 0) {
                if (results && results[0] && 'id_usuario' in results[0]) {
                  dbConnection.query(
                    `UPDATE alba_jasmin_info.stm_ingresos 
                          SET 
                              premium = ${elemento.categoria.Premium || 0}, 
                              gold = ${elemento.categoria.GOLD || 0}, 
                              gold_show = ${elemento.categoria["GOLD Show"] || 0},
                              exclusive = ${elemento.categoria.Exclusive || 0},
                              video_purchase = ${elemento.categoria["Video Purchase"] || 0},
                              CamModels_Referral = ${elemento.categoria.cammodels_referral || 0},
                              Subscription = ${elemento.categoria.subscription || 0},
                              premium_block = ${elemento.categoria.premium_block || 0}, 
                              exclusive_block = ${elemento.categoria.exclusive_block || 0}, 
                              messenger_gold = ${elemento.categoria["Messenger GOLD"] || 0}, 
                              activity_feed = ${elemento.categoria.activity_feed || 0}, 
                              mediaBundle_purchase = ${elemento.categoria.mediaBundle_purchase || 0}, 
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
                dbConnection.query(
                  `SELECT id_usuario FROM datos_sesion WHERE sm_user = '${elemento.nickname}'`,
                  (error, results, fields) => {
                    if (error) {
                      console.error("Error al realizar la consulta:", error);
                      return;
                    }

                    // Verificar si hay resultados y si results[0] tiene la propiedad 'id_usuario'
                    if (results && results[0] && 'id_usuario' in results[0]) {
                      dbConnection.query(
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
                            ${elemento.categoria.premium_block || 0}, 
                            ${elemento.categoria.exclusive_block || 0}, 
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
                          console.log(elemento.categoria.Premium, " Insert ");
                        }
                      );
                    } else {
                      console.log("No se encontró 'id_usuario' para", elemento.nickname);
                    }
                  }
                );
              }
            }
          );
        } else {
        }

      }
    );
    // }
  }
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
