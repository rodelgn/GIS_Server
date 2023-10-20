require('dotenv').config();
const { Client } = require('pg');
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const app = express();
const bcrypt = require("bcryptjs");

app.set('view engine', ejs);
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Client ({
    user: 'postgres',
    host: 'localhost',
    database: 'gis_db',
    password: 'dinesdayrit',
    port: 5432,
});

pool.connect ((err, client, done) => {
    if (err) {
        console.error('Error connecting to PostgreSQL: ', err);
    } else {
        console.log('Connected to PostgreSQL');
    }
   
});

// Function to create tables
async function createTables() {
  try {
      // Create the 'users' table if it doesn't exist
      await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              password VARCHAR(255) NOT NULL,
              role VARCHAR(255)
          );
      `);

      // Create the 'title_table' table if it doesn't exist
      await pool.query(`
          CREATE TABLE IF NOT EXISTS title_table (
              id SERIAL PRIMARY KEY,
              title VARCHAR(255),
              titledate VARCHAR(255),
              surveynumber VARCHAR(255),
              lotnumber VARCHAR(255),
              blknumber VARCHAR(255),
              area VARCHAR(255),
              boundary VARCHAR(255),
              ownername VARCHAR(255),
              oct VARCHAR(255),
              octdate VARCHAR(255),
              prevtct VARCHAR(255),
              tctdate VARCHAR(255),
              tecnicaldescription VARCHAR(255),
              technicaldescremarks VARCHAR(255),
              pluscode VARCHAR(255),
              geojson JSON,
              the_geom GEOMETRY(Polygon, 4326),
              status VARCHAR(255)
          );
      `);
            // Create the 'Taxmapping' table if it doesn't exist
            await pool.query(`
            CREATE TABLE IF NOT EXISTS rptas_table (
                id SERIAL PRIMARY KEY,
                Pin VARCHAR(255),
                pluscode VARCHAR(255),
                title VARCHAR(255),
                titledate VARCHAR(255),
                surveynumber VARCHAR(255),
                lotnumber VARCHAR(255),
                blknumber VARCHAR(255),
                area VARCHAR(255),
                boundary VARCHAR(255),
                ownername VARCHAR(255),
                oct VARCHAR(255),
                octdate VARCHAR(255),
                prevtct VARCHAR(255),
                tctdate VARCHAR(255),        
                status VARCHAR(255)
            );
        `);

        // Create the 'brgycode' table if it doesn't exist
        await pool.query(`
        CREATE TABLE IF NOT EXISTS brgy_code (
            id SERIAL PRIMARY KEY,
            brgycode VARCHAR(255),
            brgycodelast3 VARCHAR(255),
            brgy VARCHAR(255),
            districtcode VARCHAR(255),
            admindistrict VARCHAR(255),
            poldistrict VARCHAR(255)
        );
    `);
            // Create the 'monuments' table if it doesn't exist
            await pool.query(`
            CREATE TABLE IF NOT EXISTS monuments (
                id SERIAL PRIMARY KEY,
                monument VARCHAR(255),
                easting VARCHAR(255),
                northing VARCHAR(255)
            );
        `);
  

      console.log('Tables created or already exist.');
  } catch (error) {
      console.error('Error creating tables:', error);
  }
}

// Call the createTables function to ensure tables exist
createTables();
//Console log Users Details
pool.query (`Select * from users`, (err, res) => {
    if(!err) {
        console.log(res.rows);
    } else {
        console.log(err.message);
    }
    pool.end;
});
//Console log GIS Details
pool.query (`Select * from title_table`, (err, res) => {
  if(!err) {
      console.log(res.rows);
  } else {
      console.log(err.message);
  }
  pool.end;
});

//User Details

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
  

//Create User
app.post('/userDetail', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
   
    const hashedPassword = await bcrypt.hash(password, 10);

 
    const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)';
    const values = [name, email, hashedPassword, role];

    await pool.query(insertQuery, values);
    console.log('User saved');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ status: 'error' });
  }
});

//User Login
app.post('/userLogin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const selectQuery = 'SELECT * FROM users WHERE email = $1';
    const values = [email];

    const result = await pool.query(selectQuery, values);

    if (result.rowCount === 1) {
      const user = result.rows[0];
      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        // Generate a JWT with user information
        const token = jwt.sign(
          { userId: user.id, name: user.name, email: user.email, role: user.role },
          JWT_SECRET
        );
        res.json({
          status: 'ok',
          message: 'Login successful',
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role }, 
        });
      } else {
        res.json({ status: 'error', message: 'Invalid email or password' });
      }
    } else {
      res.json({ status: 'error', message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});



//GIS INFO
app.get("/GisDetail", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM title_table');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching GIS details:', error);
      res.status(500).json({ status: "error" });
  }
});


app.post("/GisDetail", async function(req, res){
  try {
    console.log('Received request body:', req.body);
 

    const {
      title,
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      tct,
      tctDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      geojson,
      status,
     
    } = req.body;

    const geojsonFormat = JSON.parse(geojson);
    const geoType = geojsonFormat.geometry.type;
    const coordinates = geojsonFormat.geometry.coordinates;
    await pool.query(
      'INSERT INTO title_table (title, titledate, surveynumber, lotnumber, blknumber, area, boundary, ownername, oct, octdate, prevtct, tctdate, tecnicaldescription, technicaldescremarks, pluscode, geojson, the_geom, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, ST_SetSRID(ST_GeomFromGeoJSON($17), 4326), $18)',
  [title, titleDate, surveyNumber, lotNumber, blkNumber, area, boundary, ownerName, oct, octDate, tct, tctDate, technicalDescription,  technicaldescremarks, plusCode, JSON.stringify(geojsonFormat), JSON.stringify({ type: geoType, coordinates }), status]
    );

    console.log('GIS Details Saved');
    res.json({ status: "ok" });
  } catch (error) {
    console.error('Error saving GIS details:', error);
    res.status(500).json({ status: "error" });
  }
});

//Update Data
app.put('/GisDetail/:title', async (req, res) => {
  try {

    console.log('Received request body:', req.body);
    const { title } = req.params;
    const {
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      tct,
      tctDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      geojson,
  
     
    } = req.body;

    // Define the SQL query to update the 'status' field
    const updateQuery = `
      UPDATE title_table
      SET 
      titleDate = $1,
      surveyNumber = $2,     
      lotNumber = $3,      
      blkNumber = $4,       
      area = $5,            
      boundary = $6,        
      ownerName = $7,      
      oct = $8,              
      octDate = $9,         
      prevtct = $10,            
      tctDate = $11,         
      tecnicaldescription = $12,  
      technicaldescremarks = $13,  
      plusCode = $14,        
      geojson = $15         
      WHERE title = $16;
    `;

    // Execute the update query
    await pool.query(updateQuery, [
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      tct,
      tctDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      geojson,
      title]);

    console.log('Status field updated successfully');
    res.json({ status: 'ok', message: 'Status field updated successfully' });
  } catch (error) {
    console.error('Error updating status field:', error);
    res.status(500).json({ status: 'error', message: 'Error updating status field' });
  }
});

// Update status by title
app.put('/approved/:title', async (req, res) => {
  try {

    console.log('Received request body:', req.body);
    const { title } = req.params;
    const { status } = req.body;

    // Define the SQL query to update the 'status' field
    const updateQuery = `
      UPDATE title_table
      SET status = $1
      WHERE title = $2
    `;

    // Execute the update query
    await pool.query(updateQuery, [status, title]);

    console.log('Status field updated successfully');
    res.json({ status: 'ok', message: 'Status field updated successfully' });
  } catch (error) {
    console.error('Error updating status field:', error);
    res.status(500).json({ status: 'error', message: 'Error updating status field' });
  }
});


app.put("/updateTitle/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract the 'title' from the URL parameter
    const { 
      title,
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      geojson,
     } = req.body; 

    // Define the SQL query to update the 'title' field
    const updateQuery = ` 
    UPDATE title_table
    SET 
      title = $1,
      titleDate = $2,
      surveyNumber = $3,
      lotNumber = $4,
      blkNumber = $5,
      area = $6,
      boundary = $7,
      ownerName = $8,
      oct = $9,
      octDate = $10,
      technicalDescription = $11,
      technicaldescremarks = $12,
      plusCode = $13,
      geojson = $14
    WHERE id = $15
  `;


    await pool.query(updateQuery, [
      title,
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      geojson,

      id, 
    ]);

    console.log('Title field updated successfully');
    res.json({ status: "ok", message: "Title field updated successfully" });
  } catch (error) {
    console.error('Error updating title field:', error);
    res.status(500).json({ status: "error", message: "Error updating title field" });
  }
});

//List of Monuments
app.get("/monuments", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM monuments');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching Momuments:', error);
      res.status(500).json({ status: "error" });
  }
});


//RPTAS_Table

app.get("/tmod", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM rptas_table');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching rptas_table:', error);
      res.status(500).json({ status: "error" });
  }
});

app.post("/tmod", async function(req, res){
  try {
    console.log('Received request body:', req.body);

    const {
      pin,
      plusCode,
      title,
      titleDate,
      surveyNumber,
      lotNumber,
      blkNumber,
      area,
      boundary,
      ownerName,
      oct,
      octDate,
      tct,
      tctDate,
      status,
     
    } = req.body;

    await pool.query(
      'INSERT INTO rptas_table (pin, pluscode, title, titledate, surveynumber, lotnumber, blknumber, area, boundary, ownername, oct, octdate, prevtct, tctdate, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
  [pin, plusCode, title, titleDate, surveyNumber, lotNumber, blkNumber, area, boundary, ownerName, oct, octDate, tct, tctDate, status]
    );

    console.log('PIN SAVED');
    res.json({ status: "ok" });
  } catch (error) {
    console.error('Error saving PIN:', error);
    res.status(500).json({ status: "error" });
  }
});

app.get('/checkPin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    const query = 'SELECT EXISTS (SELECT 1 FROM rptas_table WHERE pin = $1)';

    const result = await pool.query(query, [pin]);
    const exists = result.rows[0].exists;

    res.json({ exists });
  } catch (error) {
    console.error('Error checking PIN:', error);
    res.status(500).json({ exists: false });
  }
});


app.put('/approvedpin/:pin', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { pin } = req.params;
    const { status } = req.body;

    // Define the SQL query to update the 'status' field in rptas_table
    const updateQuery = `
      UPDATE rptas_table
      SET status = $1
      WHERE pin = $2
    `;

    // Execute the update query for rptas_table
    await pool.query(updateQuery, [status, pin]);

    console.log('Status field in rptas_table updated successfully');
    res.json({ status: 'ok', message: 'Status field in rptas_table updated successfully' });
  } catch (error) {
    console.error('Error updating status field in rptas_table:', error);
    res.status(500).json({ status: 'error', message: 'Error updating status field in rptas_table' });
  }
});

//List of brgycode
app.get("/brgycode", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM brgy_code');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching brgy_code:', error);
      res.status(500).json({ status: "error" });
  }
});




app.listen(5000, function() {
    console.log("Server started on port 5000");
  });
  