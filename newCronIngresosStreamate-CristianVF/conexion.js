// Importa el paquete MySQL
const mysql = require('mysql');
const { Client } = require('pg');

const connectionConfigMySql = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'alba_group',
  port: 3306,
};

// Define las variables de conexión
// const connectionConfigMySql = {
//   host: '107.180.50.188',
//   user: 'AlbaGroup',
//   password: 'AlbaGroup2022*/',
//   database: 'alba_group',
//   port: 3306,
// };

// Configuración de la conexión PostgreSQL
const postgresConnectionConfig = {
  host: 'localhost',
  user: 'postgres',
  password: '1144193274Cc*',
  database: 'Hoy',
  port: 5432,
};
// const postgresConnectionConfig = {
//   host: 'agency.cerj9pjhxhqu.us-east-1.rds.amazonaws.com',
//   user: 'cronagency',
//   password: 'qJK!8kYYoV$*',
//   database: 'agency',
//   port: 5432,
// };


// Crea la conexión MySQL
const mysqlConnection = mysql.createConnection(connectionConfigMySql);
const postgresConnection = new Client(postgresConnectionConfig);

// Conéctate a PostgreSQL
postgresConnection.connect()
  .then(() => {
    console.log('Connected to PostgreSQL!');
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL: ', err);
  });


// Crea la conexión
module.exports = { mysqlConnection, postgresConnection };

