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


// Function to generate a JWT token
function generateToken(user) {
  // You can include user data in the token payload
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET);

  return token;
}


// CONNNECTION FOR CLOUD PG
// const pool = new Client ({
//   user: 'postgres',
//   host: '129.150.47.67',
//   database: 'postgres',
//   password: 'gismap',
//   port: 5432,
// });

//CONNNECTION FOR LOCAL PGr
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
              title VARCHAR,
              titledate VARCHAR,
              surveynumber VARCHAR,
              lotnumber VARCHAR,
              blknumber VARCHAR,
              area VARCHAR,
              boundary VARCHAR,
              ownername VARCHAR,
              oct VARCHAR,
              octdate VARCHAR,
              prevtct VARCHAR,
              tctdate VARCHAR,
              tecnicaldescription VARCHAR,
              technicaldescremarks VARCHAR,
              pluscode VARCHAR,
              geojson JSON,
              the_geom GEOMETRY(Polygon, 4326),
              status VARCHAR,
              username VARCHAR
          );
      `);
            // Create the 'rptas_table' table if it doesn't exist
            await pool.query(`
            CREATE TABLE IF NOT EXISTS rptas_table (
                id SERIAL PRIMARY KEY,
                Pin VARCHAR,
                districtcode VARCHAR,
                brgycode VARCHAR,
                sectioncode VARCHAR,
                parcelid VARCHAR,
                rptgeocode VARCHAR,
                pluscode VARCHAR,
                title VARCHAR,
                titledate VARCHAR,
                surveynumber VARCHAR,
                lotnumber VARCHAR,
                blknumber VARCHAR,
                area VARCHAR,
                boundary VARCHAR,
                ownername VARCHAR,
                oct VARCHAR,
                octdate VARCHAR,
                prevtct VARCHAR,
                tctdate VARCHAR,    
                status VARCHAR,
                username VARCHAR(255),
                type VARCHAR
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
            // Create the 'pin' table if it doesn't exist
            await pool.query(`
            CREATE TABLE IF NOT EXISTS pin_table (
                id SERIAL PRIMARY KEY,
                newpin VARCHAR(255),
                pluscode VARCHAR(255),
                prevpin VARCHAR(255),
                prevpluscode VARCHAR(255),
                status VARCHAR(255)
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

// Define an authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization;
  console.log("Received Token:", token);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - Please provide a valid token' });
  }

// Extract the token from the "Bearer" format
const tokenParts = token.split(' ');
const tokenValue = tokenParts[1];

// Verify the token
jwt.verify(tokenValue, JWT_SECRET, (err,user, decoded) => {
  if (err) {
    // Token verification failed
    console.error('Token Verification Error:', err);
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  } else {
    // Token is valid; 'decoded' contains the token payload
    console.log('Token Payload:', decoded);
    // Continue processing the request
  }

   
    req.user = user;
    next();
  });
};

// Middleware to validate API key
const validateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
  
    return res.status(401).json({ message: 'Unauthorized - API key is missing' });
  }

 
  if (apiKey === process.env.CLIENT_API_KEY) { // Replace with your stored API key
    next();
  } else {
    console.log(apiKey)
    console.log(process.env.CLIENT_API_KEY);
    return res.status(403).json({ message: 'Unauthorized - Invalid API key' });
  }
};

//User Details

app.get('/userDetail', requireAuth, async function (req, res) {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ status: 'error' });
  }

});


//Create User
app.post('/userDetail',requireAuth, async (req, res) => {
 
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

    // Step 1: Fetch the user from the database using the provided email
    const user = await getUserByEmail(email);

    if (!user) {
      console.log("mao ni");
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
     
    }

    // Step 2: Validate the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("mao gyud ni");
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    // Step 3: Generate a JWT token with user information
    const token = generateToken(user);

    // Step 4: Send the token and user details in the response
    res.json({
      status: 'ok',
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
       
      },
    });
    console.log(user.id, user.name, user.email, user.role, token);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Function to fetch user by email from the database
async function getUserByEmail(email) {
  const selectQuery = 'SELECT * FROM users WHERE email = $1';
  const values = [email];

  const result = await pool.query(selectQuery, values);
  return result.rows[0];
}

// Function to generate a JWT token
function generateToken(user) {
  const token = jwt.sign(
    { userId: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    {
      expiresIn: '7d', 
    }
  );
  return token;
}



app.get('/GisDetail',requireAuth, async function(req, res) {
  const token = req.headers.authorization;
  console.log("Received Token:", token);

  try {

    const { rows } = await pool.query('SELECT * FROM title_table');
    res.json(rows);

  } catch (error) {
    console.error('Error fetching GIS details:', error);
    res.status(500).json({ status: 'error' });
  }

});

app.post("/GisDetail",requireAuth, async function(req, res){
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
      username,
     
    } = req.body;

    const geojsonFormat = JSON.parse(geojson);
    const geoType = geojsonFormat.geometry.type;
    const coordinates = geojsonFormat.geometry.coordinates;
    await pool.query(
      'INSERT INTO title_table (title, titledate, surveynumber, lotnumber, blknumber, area, boundary, ownername, oct, octdate, prevtct, tctdate, tecnicaldescription, technicaldescremarks, pluscode, geojson, the_geom, status, username) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, ST_SetSRID(ST_GeomFromGeoJSON($17), 4326), $18, $19)',
  [title, titleDate, surveyNumber, lotNumber, blkNumber, area, boundary, ownerName, oct, octDate, tct, tctDate, technicalDescription,  technicaldescremarks, plusCode, JSON.stringify(geojsonFormat), JSON.stringify({ type: geoType, coordinates }), status,username]
    );

    console.log('GIS Details Saved');
    res.json({ status: "ok" });
  } catch (error) {
    console.error('Error saving GIS details:', error);
    res.status(500).json({ status: "error" });
  }
});

//Update Data
app.put('/GisDetail/:id',requireAuth, async (req, res) => {
  try {

    console.log('Received request body:', req.body);
    const { id } = req.params;
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
      status
  
     
    } = req.body;

    const geojsonFormat = JSON.parse(geojson);
    const geoType = geojsonFormat.geometry.type;
    const coordinates = geojsonFormat.geometry.coordinates;

    // Define the SQL query to update the 'status' field
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
      prevtct = $11,            
      tctDate = $12,         
      tecnicaldescription = $13,  
      technicaldescremarks = $14,  
      plusCode = $15,        
      geojson = $16,
      the_geom = $17,
      status = $18       
      WHERE id = $19;
    `;

    // Execute the update query
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
      tct,
      tctDate,
      technicalDescription,
      technicaldescremarks,
      plusCode,
      JSON.stringify(geojsonFormat), 
      JSON.stringify({ type: geoType, coordinates }),
      status,
      id]);

    console.log('Status field updated successfully');
    res.json({ status: 'ok', message: 'Status field updated successfully' });
  } catch (error) {
    console.error('Error updating status field:', error);
    res.status(500).json({ status: 'error', message: 'Error updating status field' });
  }
});

// Update status by id
app.put('/approved/:id', async (req, res) => {
  try {

    console.log('Received request body:', req.body);
    const { id } = req.params;
    const { status } = req.body;

    // Define the SQL query to update the 'status' field
    const updateQuery = `
      UPDATE title_table
      SET status = $1
      WHERE id = $2
    `;

    // Execute the update query
    await pool.query(updateQuery, [status, id]);

    console.log('Status field updated successfully');
    res.json({ status: 'ok', message: 'Status field updated successfully' });
  } catch (error) {
    console.error('Error updating status field:', error);
    res.status(500).json({ status: 'error', message: 'Error updating status field' });
  }
});


app.put("/updateTitle/:id", async (req, res) => {
  try {
    const { id } = req.params; 
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

app.get("/tmod", validateAPIKey, async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM rptas_table');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching rptas_table:', error);
      res.status(500).json({ status: "error" });
  }
});

app.post("/tmod",requireAuth, async function(req, res){
  try {
    console.log('Received request body:', req.body);

    const {
      pin,
      districtCode,
      brgyCode,
      sectionCode,
      parcelCode,
      RPTGeoCode,
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
      username,
      type,
     
    } = req.body;

    await pool.query(
      'INSERT INTO rptas_table (pin, districtcode, brgycode, sectioncode, parcelid, rptgeocode, pluscode, title, titledate, surveynumber, lotnumber, blknumber, area, boundary, ownername, oct, octdate, prevtct, tctdate, status, username, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)',
  [pin, districtCode,brgyCode, sectionCode, parcelCode, RPTGeoCode, plusCode, title, titleDate, surveyNumber, lotNumber, blkNumber, area, boundary, ownerName, oct, octDate, tct, tctDate, status, username, type]
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
  const updateRptasQuery = `
  UPDATE rptas_table
  SET status = $1
  WHERE pin = $2
`;

// Execute the update query for rptas_table
await pool.query(updateRptasQuery, [status, pin]);

// Define the SQL query to update the 'status' field in pin_table
const updatePinQuery = `
  UPDATE pin_table
  SET status = $1
  WHERE newpin = $2
`;

// Execute the update query for pin_table
await pool.query(updatePinQuery, [status, pin]);

console.log('Status field in rptas_table and pin_table updated successfully');
res.json({ status: 'ok', message: 'Status field in rptas_table and pin_table updated successfully' });
} catch (error) {
console.error('Error updating status field:', error);
res.status(500).json({ status: 'error', message: 'Error updating status field' });
}
});


app.delete('/deletePin/:pin',requireAuth, async (req, res) => {
  try {
    const { pin } = req.params;

   
    // Delete from rptas_table
    const deleteRptasQuery = 'DELETE FROM rptas_table WHERE pin = $1';
    const rptasResult = await pool.query(deleteRptasQuery, [pin]);

    // Delete from pintable
    const deletePinTableQuery = 'DELETE FROM pin_table WHERE newpin = $1';
    const pinTableResult = await pool.query(deletePinTableQuery, [pin]);

    if (rptasResult.rowCount === 1 && pinTableResult.rowCount === 1) {
      console.log(`Record with PIN '${pin}' deleted successfully`);
      res.json({ status: 'ok', message: `Record with PIN '${pin}' deleted successfully` });
    } else {
      console.log(`No record found with PIN '${pin}'`);
      res.status(404).json({ status: 'not found', message: `No record found with PIN '${pin}'` });
    }
  } catch (error) {
    console.error('Error deleting record by PIN:', error);
    res.status(500).json({ status: 'error', message: 'Error deleting record by PIN' });
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

//PIN_table
app.post("/pintable", async function(req, res){
  try {

    const {
      newpin,
      pluscode,
      prevpin,
      prevpluscode,
      status,
    } = req.body;

    await pool.query(
      'INSERT INTO pin_table (newpin, pluscode, prevpin, prevpluscode, status) VALUES ($1, $2, $3, $4, $5)',
  [newpin,pluscode, prevpin, prevpluscode, status]
    );

    console.log('PIN Details Saved');
    res.json({ status: "ok" });
  } catch (error) {
    console.error('Error saving PIN details:', error);
    res.status(500).json({ status: "error" });
  }

});


//Subdivide approval route
app.put('/approvePins', async (req, res) => {
  try {
    const { pinsToApprove } = req.body;

    // Loop through the array of pins and update the status in both tables
    for (const pin of pinsToApprove) {

      // Update pin_table
      const updatePinQuery = `
        UPDATE pin_table
        SET status = 'APPROVED'
        WHERE newpin = $1
      `;
      await pool.query(updatePinQuery, [pin]);

      // Update rptas_table
      const updateRptasQuery = `
        UPDATE rptas_table
        SET status = 'APPROVED'
        WHERE pin = $1
      `;
      await pool.query(updateRptasQuery, [pin]);
    }

    res.json({ status: 'ok', message: 'Pins approved successfully' });
  } catch (error) {
    console.error('Error approving pins:', error);
    res.status(500).json({ status: 'error', message: 'Error approving pins' });
  }
});


//update parcels status on title_table after approval of Subdivide
app.put('/approveTitles', async (req, res) => {
  try {
    const {titlesToApprove} = req.body;

    for (const titlePlusCode of titlesToApprove) {
      const updateTitleQuery = `
        UPDATE title_table
        SET status = 'PIN APPROVED'
        WHERE pluscode = $1
      `;
      await pool.query(updateTitleQuery, [titlePlusCode]);
    }
    res.json({ status: 'ok', message: 'Titles approved successfully' });
  } catch (error) {
    console.error('Error approving titles:', error);
    res.status(500).json({ status: 'error', message: 'Error approving titles' });
  }
  
});
//update parcel status to cancelled the old PIN
app.put('/cancelTitle', async (req, res) => {
  try {
    const titleToCancel = req.body;

    const updateTitleQuery = `
      UPDATE title_table
      SET status = 'CANCELLED'
      WHERE pluscode = $1
    `;
    
    await pool.query(updateTitleQuery, [titleToCancel.titleToCancel]);
    
    res.json({ status: 'ok', message: 'Title cancelled successfully' });
  } catch (error) {
    console.error('Error approving titles:', error);
    res.status(500).json({ status: 'error', message: 'Error cancelling title' });
  }
  
});
//pintable get route
app.get("/pintable", async function(req, res){
try {
  const { rows } = await pool.query('SELECT * FROM pin_table');
  res.json(rows);
} catch (error) {
  console.error('Error fetching pin_table', error);
  res.status(500).json({ status: "error" });
}
});


//Micheal ROUTE
app.post("/insertSMV", async (req, res) => {
  const rpt_geo_code = req.body.rpt_geo_code;
  const pin = req.body.pin;
  const smv_code = [];
  const area = [];

  try {
    const get_smv = await pool.query(
      "SELECT ST_Area(ST_Intersection(ST_Transform(a.the_geom, 4326)::geography, ST_Transform(b.the_geom, 4326)::geography)) AS intersection_area, b.title, a.mv_2017 FROM marketvalues a, title_table b WHERE ST_Intersects (ST_Transform(a.the_geom, 4326), ST_Transform(b.the_geom, 4326)) AND b.pluscode = $1 ORDER BY mv_2017 ASC",
      [rpt_geo_code]
    );
    const smv_result = get_smv.rows;

    for (var x = 0; x < smv_result.length; x++) {
      smv_code.push(smv_result[x].mv_2017);
      area.push(smv_result[x].intersection_area);
    }

    const insertData = await pool.query(
      "INSERT INTO smv_table (rpt_geo_code, pin, smv_code, area) VALUES ($1, $2, $3, $4)",
      [rpt_geo_code, pin, smv_code, area]
    );

    if (insertData) {
      res.json({ success: "Data successfully saved" });
    } else {
      res.json({ error: "No signature uploaded" });
    }
  } catch (error) {
    console.error("Error executing SQL query", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/viewSMV", async function(req, res){
  try {
      const { rows } = await pool.query('SELECT * FROM smv_table');
      res.json(rows);
  } catch (error) {
      console.error('Error fetching smv_table', error);
      res.status(500).json({ status: "error" });
  }
});

module.exports = app;