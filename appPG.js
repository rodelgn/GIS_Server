const { Client } = require('pg');
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const app = express();


app.set('view engine', ejs);
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));


const pool = new Client ({
    user: 'postgres',
    host: 'localhost',
    database: 'gis_db',
    password: 'admin123',
    port: 5432,
});

pool.connect ((err, client, done) => {
    if (err) {
        console.error('Error connecting to PostgreSQL: ', err);
    } else {
        console.log('Connected to PostgreSQL');
    }
});

// pool.query (`Select * from users`, (err, res) => {
//     if(!err) {
//         console.log(res.rows);
//     } else {
//         console.log(err.message);
//     }
//     pool.end;
// });

// pool.query (`Select * from gis_information`, (err, res) => {
//   if(!err) {
//       console.log(res.rows);
//   } else {
//       console.log(err.message);
//   }
//   pool.end;
// });


app.get('/userDetail', (req, res) => {
    pool.query('SELECT * FROM users', (err, result) => {
      if (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ status: 'error' });
      } else {
        res.json(result.rows);
      }
    });
  });
  


app.post('/userDetail', (req, res) => {
    const { email, password } = req.body;
    const insertQuery = 'INSERT INTO users (email, password) VALUES ($1, $2)';
    const values = [email, password];
  
    pool.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ status: 'error' });
      } else {
        console.log('User saved');
        res.json({ status: 'ok' });
      }
    });
  });


  app.post('/userLogin', (req, res) => {
    const { email, password } = req.body;
    const selectQuery = 'SELECT * FROM users WHERE email = $1 AND password = $2';
    const values = [email, password];

    pool.query(selectQuery, values, (err, result) => {
      if (err) {
        console.error('Error during login:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      } else {
        if (result.rowCount === 1) {
          res.json({ status: 'ok', message: 'Login successful' });
        } else {
          res.json({ status: 'error', message: 'Invalid email or password' });
        }
      }
    });
  });


app.get("/GisDetail", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM gis_information');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching GIS details:', error);
      res.status(500).json({ status: "error" });
  }
});


app.post("/GisDetail", async function(req, res) {
  try {
    console.log('Received request body:', req.body);

    const {
      title,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      ownerName,
      plusCode,
      geojson,
    } = req.body;

    await pool.query(
      'INSERT INTO gis_information (title, surveynumber, lotnumber, blknumber, area, ownername, pluscode, geojson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [title, surveyNumber, lotNumber, blkNumber, area, ownerName, plusCode, geojson]
    );

    console.log('GIS Details Saved');
    res.json({ status: "ok" });
  } catch (error) {
    console.error('Error saving GIS details:', error);
    res.status(500).json({ status: "error" });
  }
});

//KML File Table
// app.get("/kmlDetails", async function(req, res){
//   try {
//       const { rows } = await pool.query('SELECT * FROM kml_data');
//       res.json(rows);
//   } catch (error) {
//       console.error('Error fetching KML details:', error);
//       res.status(500).json({ status: "error" });
//   }
// });

// app.post("/kmlDetails", async function(req, res) {
//   try {
//     console.log('Received request body:', req.body);

//     const {
//       id,
//       applicant,
//       area,
//       blk_no,
//       date_enact,
//       date_pass,
//       lot_no,
//       map_no,
//       ord_no,
//       owner,
//       plot_edit,
//       plotted_ba,
//       projtype,
//       purpose,
//       res_no,
//       surv_no,
//       t_date,
//       title_no,
//       zone_class,
//       plotted_by,
//       pgplot_by,
//       date_time,
//       coordinate,
//       centroid,
//       pluscode,
//     } = req.body;

//     await pool.query(
//       'INSERT INTO kml_data (id, applicant, area, blk_no, date_enact, date_pass, lot_no, map_no, ord_no, owner, plot_edit, plotted_ba, projtype, purpose, res_no, surv_no, t_date, title_no, zone_class, plotted_by, pgplot_by, date_time, coordinate, centroid, pluscode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)',
//       [id,
//         applicant,
//         area,
//         blk_no,
//         date_enact,
//         date_pass,
//         lot_no,
//         map_no,
//         ord_no,
//         owner,
//         plot_edit,
//         plotted_ba,
//         projtype,
//         purpose,
//         res_no,
//         surv_no,
//         t_date,
//         title_no,
//         zone_class,
//         plotted_by,
//         pgplot_by,
//         date_time,
//         coordinate,
//         centroid,
//         pluscode,]
//     );

//     console.log('KML Details Saved');
//     res.json({ status: "ok" });
//   } catch (error) {
//     console.error('Error saving KML details:', error);
//     res.status(500).json({ status: "error" });
//   }
// });


app.listen(5000, function() {
    console.log("Server started on port 5000");
  });
  
  