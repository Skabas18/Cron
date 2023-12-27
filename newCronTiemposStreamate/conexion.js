// Importa el paquete MySQL
const mysql = require('mysql');

// Define las variables de conexión
const connectionConfig = {
  host: '107.180.50.188',
  user: 'AlbaGroup',
  password: 'AlbaGroup2022*/',
  database: 'alba_group',
  port: 3306,
};
/*const connectionConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'alba_group',
  port: 3306,
};*/

// Crea la conexión
const connection = mysql.createConnection(connectionConfig);

// Exporta la conexión para que pueda ser utilizada en otros archivos
module.exports = connection;
