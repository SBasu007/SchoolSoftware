import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

const app = express();

const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "CTSS",
  password: "shomi777",
  port: 5432,
});
db.connect();

app.use(session({
  secret: 'i-am-king-in-the-north',  
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // For development; set to true for HTTPS in production
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.get("/", async(req,res) => {
  try {
    // Query to fetch usernames from the PostgreSQL table
    const query = 'SELECT username FROM users';  // Adjust table name if needed
    const result = await db.query(query);

    // Pass the usernames to the EJS template
    res.render('login', {
        usernames: result.rows,  // result.rows will be an array of objects
    });
} catch (err) {
    console.error('Error fetching usernames:', err);
    res.status(500).send('Server error');
}
  });
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const result = await db.query('SELECT username FROM users');
    const u_result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
  
    if (u_result.rows.length > 0) {
      const p_result = await db.query("SELECT * FROM users WHERE password = $1", [password]);
  
      if (p_result.rows.length > 0) {
        // Check if the user is an admin and store the info in session
        const isAdmin = p_result.rows[0].username.toLowerCase() === 'admin';
        req.session.isAdmin = isAdmin;
        res.render("index.ejs", { message: "Welcome "+username, admin: isAdmin });
      } else {
        res.render('login', {
          usernames: result.rows,  // result.rows will be an array of objects
          message:"Wrong password"
      });
      }
    } else {
      res.render('login', {
        usernames: result.rows,  // result.rows will be an array of objects
        message:"Username does not exist"
    });
    }
  });
app.get("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Failed to destroy session during logout", err);
        return res.redirect("/");  // If session destruction fails, redirect to home or another page
      }
      // Clear the cookie that stores the session ID (optional but recommended)
      res.clearCookie('connect.sid');  // 'connect.sid' is the default name for the session cookie
  
      // Redirect to the login page or another page

      res.redirect("/");
    });
  });

app.get('/print', async(req,res)=>{
    res.render("print.ejs")
  })
app.get("/home", async(req,res) => {
  const isAdmin = req.session.isAdmin || false;
    res.render("index.ejs",{message:" ",admin:isAdmin})
  });
//agent
app.get("/addAgent", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./agent/addAgent.ejs",{admin:isAdmin})
});
app.get("/editAgent", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./agent/editAgent.ejs",{admin:isAdmin})
});
app.post("/addAgent", async (req, res) => {
  const { code, name, add1, add2 } = req.body;
  const isAdmin = req.session.isAdmin || false;
  // SQL query to insert school details
  const query = `INSERT INTO agent (code, name, add1, add2)
    VALUES ($1, $2, $3, $4)`;
  try {
    await db.query(query, [code, name, add1, add2]);
    res.render('./agent/addAgent.ejs',{error_message:"Inserted successfully",admin:isAdmin});
  } catch (err) {
    res.render('./agent/addAgent.ejs',{error_message:"Error inserting agent, database not working",admin:isAdmin});
  }
});
app.post("/deleteAgent", async (req, res) => {
  const { delete_code } = req.body; // Fetch the agent code from the request
  const isAdmin = req.session.isAdmin || false; // Check if the user is an admin

  // SQL query to delete the agent based on the code
  const query = `DELETE FROM agent WHERE code = $1`;
  
  try {
    await db.query(query, [delete_code]); // Execute the delete query

    // Render success message after deletion
    res.render('./agent/editAgent.ejs', { error_message: "Deleted successfully", admin: isAdmin });
  } catch (err) {
    // Render error message if the delete operation fails
    res.render('./agent/editAgent.ejs', { error_message: err, admin: isAdmin });
  }
});
app.get('/getAgentDetails', async (req, res) => {
  const { code } = req.query;

  try {
    // Query to get the details for the selected school code
    const result = await db.query(
      'SELECT name, add1, add2 FROM agent WHERE code = $1',
      [code]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]); // Send back the school details
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({ error: 'Failed to fetch agent details' });
  }
});
app.post("/editAgent", async (req, res) => {
  const { code, name, add1, add2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // SQL query to update agent details
  const query = `
    UPDATE agent 
    SET name = $1, add1 = $2, add2 = $3 
    WHERE code = $4`;

  try {
    const result = await db.query(query, [name, add1, add2, code]);
    
    // Check if any rows were affected (i.e., if the update was successful)
    if (result.rowCount > 0) {
      res.render('./agent/editAgent.ejs', { error_message: "Updated successfully", admin: isAdmin });
    } else {
      res.render('./agent/editAgent.ejs', { error_message: "No agent found with that code", admin: isAdmin });
    }
  } catch (err) {
    console.error('Error updating agent:', err);
    res.render('./agent/editAgent.ejs', { error_message: "Error updating agent, database not working", admin: isAdmin });
  }
});
app.post('/checkAgentCode', async (req, res) => {
  const { code } = req.body;
  try {
    // Query the database to check if the agent code exists
    const result = await db.query('SELECT * FROM agent WHERE code = $1', [code]);

    if (result.rows.length > 0) {
      // Agent exists
      return res.json({ exists: true });
    } else {
      // Agent does not exist
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('Error checking agent code:', err);
    res.status(500).json({ error: 'Database error' });
  }
});
app.get('/viewAgent', async(req,res)=>{
  try {
    const isAdmin = req.session.isAdmin || false;
    // Query the database to check if the agent code exists
    const result = await db.query('SELECT * FROM agent');
      res.render("./agent/agent.ejs",{admin:isAdmin,display:result.rows})
  } catch (err) {
    console.error('Error checking agent code:', err);
    res.status(500).json({ error: 'Database error' });
  }
})



//school
app.get("/addSchool", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./school/addSchool.ejs",{admin:isAdmin})
}); 
app.get("/editSchool", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./school/editSchool.ejs",{admin:isAdmin})
});
app.post("/editSchool", async (req, res) => {
  const { code, name, add1, add2, auth_person, center_fee, agent_code, agent_comm } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // SQL query to update school details
  const query = `
    UPDATE school 
    SET 
      name = $1, 
      add1 = $2, 
      add2 = $3, 
      auth_person = $4, 
      center_fee = $5, 
      agent_code = $6, 
      agent_comm = $7 
    WHERE code = $8`;

  try {
    const result = await db.query(query, [name, add1, add2, auth_person, center_fee, agent_code, agent_comm, code]);
    
    // Check if any rows were affected (i.e., if the update was successful)
    if (result.rowCount > 0) {
      res.render('./school/editSchool.ejs', { error_message: "Updated successfully", admin: isAdmin });
    } else {
      res.render('./school/editSchool.ejs', { error_message: "No school found with that code", admin: isAdmin });
    }
  } catch (err) {
    console.error('Error updating school:', err);
    res.render('./school/editSchool.ejs', { error_message: "Error updating school, database not working", admin: isAdmin });
  }
});

app.post("/addSchool", async (req, res) => {
  const { code, name, add1, add2, auth_person, center_fee, agent_code, agent_comm } = req.body;
  const isAdmin = req.session.isAdmin || false;
  // SQL query to insert school details
  const query = `INSERT INTO school (code, name, add1, add2, auth_person, center_fee, agent_code, agent_comm)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  try {
    await db.query(query, [code, name, add1, add2, auth_person, center_fee, agent_code, agent_comm]);
    res.render('./school/addSchool.ejs',{error_message:"Inserted successfully",admin:isAdmin});
  } catch (err) {
    res.render('./school/addSchool.ejs',{error_message:"Error inserting school, agent code does not exist",admin:isAdmin});
  }
});
app.post("/deleteSchool", async (req, res) => {
  const { delete_code } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Assuming you have a PostgreSQL client setup, like pgClient
    const result = await db.query(
      "DELETE FROM school WHERE code = $1 RETURNING *",
      [delete_code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "School not found" });
    }

    res.render('./school/editSchool.ejs',{error_message:"Deleted successfully",admin:isAdmin});
  } catch (error) {
    console.error("Error deleting school:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//student
app.get("/addStudent", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./student/addStudent.ejs",{admin:isAdmin})
}); 
app.get("/editStudent", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./student/editStudent.ejs",{admin:isAdmin})
}); 
app.post("/editStudent", async (req, res) => {
  const { roll, session, year, code, admission_date, name, guard_name, add1, add2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // SQL query to update student details
  const query = `
    UPDATE student 
    SET 
      session = $1, 
      year = $2, 
      center_num = $3, 
      admission_date = $4, 
      name = $5, 
      guard_name = $6, 
      add1 = $7, 
      add2 = $8
    WHERE roll = $9`;

  try {
    const result = await db.query(query, [session, year, code, admission_date, name, guard_name, add1, add2, roll]);

    // Check if any rows were affected (i.e., if the update was successful)
    if (result.rowCount > 0) {
      res.render('./student/editStudent.ejs', { error_message: "Student updated successfully", admin: isAdmin });
    } else {
      res.render('./student/editStudent.ejs', { error_message: "No student found with that roll number", admin: isAdmin });
    }
  } catch (err) {
    console.error('Error updating student:', err);
    res.render('./student/editStudent.ejs', { error_message: "Error updating student, database not working", admin: isAdmin });
  }
});
app.post('/deleteStudent', async (req, res) => {
  const { delete_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  // SQL query to delete from marks table first and then student table
  const deleteMarksQuery = 'DELETE FROM marks WHERE roll = $1';
  const deleteStudentQuery = 'DELETE FROM student WHERE roll = $1';

  try {
    // Start a transaction to ensure both deletions happen atomically
    await db.query('BEGIN');

    // Delete from marks table
    await db.query(deleteMarksQuery, [delete_roll]);

    // Delete from student table
    const result = await db.query(deleteStudentQuery, [delete_roll]);

    // Commit the transaction
    await db.query('COMMIT');

    // Check if any rows were affected in student deletion
    if (result.rowCount > 0) {
      // If deletion was successful, redirect or send success message
      res.render('./student/editStudent.ejs', { error_message: 'Student and related marks deleted successfully', admin: isAdmin });
    } else {
      res.render('./student/editStudent.ejs', { error_message: 'No student found with that roll number', admin: isAdmin });
    }
  } catch (err) {
    // If there was an error, roll back the transaction
    await db.query('ROLLBACK');
    console.error('Error deleting student:', err);
    res.render('./student/editStudent.ejs', { error_message: 'Error deleting student, please try again', admin: isAdmin });
  }
});

app.post("/addStudent", async (req, res) => {
  const { roll, session, year, code, date, name, guard_name, add1, add2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // SQL query to insert student details
  const query = `INSERT INTO student (roll, session, year, center_num, admission_date, name, guard_name, add1, add2)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

  try {
    await db.query(query, [roll, session, year, code, date, name, guard_name, add1, add2]);
    res.render('./student/addStudent.ejs', { error_message: "Student added successfully", admin: isAdmin, session , year, code });
  } catch (err) {
      res.render('./student/addStudent.ejs', { error_message: "Error adding student", admin: isAdmin });
  }
});
app.get('/checkRollExists', async (req, res) => {
  const { roll } = req.query;

  try {
    const query = 'SELECT roll FROM student WHERE roll = $1';
    const result = await db.query(query, [roll]);

    if (result.rows.length > 0) {
      // Roll number exists
      return res.json({ exists: true });
    } else {
      // Roll number does not exist
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking roll number:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }
});
app.get('/getSchoolCodes', async (req, res) => {
  const { query } = req.query;

  try {
    let result;
    // Query the database for matching school codes
    if (query){
      result = await db.query(
        'SELECT code FROM school WHERE code ILIKE $1', 
        [`%${query}%`]
      );
    }else{
      result = await db.query('SELECT code FROM school');
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching school codes:', error);
    res.status(500).json({ error: 'Failed to fetch school codes' });
  }
});
app.get('/getYears', async (req, res) => {
  const { query } = req.query;

  try {
    let result;
    if (query) {
      // Query the database for matching years
      result = await db.query(
        'SELECT year FROM course WHERE year ILIKE $1', 
        [`%${query}%`]
      );
    } else {
      // If no query is provided, return all years
      result = await db.query('SELECT year FROM course');
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Failed to fetch years' });
  }
});

app.get('/getSchoolDetails', async (req, res) => {
  const { code } = req.query;

  try {
    // Query to get the details for the selected school code
    const result = await db.query(
      'SELECT * FROM school WHERE code = $1',
      [code]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]); // Send back the school details
    } else {
      res.status(404).json({ error: 'School not found' });
    }
  } catch (error) {
    console.error('Error fetching school details:', error);
    res.status(500).json({ error: 'Failed to fetch school details' });
  }
});

//marks
app.get("/addMarks", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./marks/addMarks.ejs",{admin:isAdmin})
}); 
app.get("/editMarks", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./marks/editMarks.ejs",{admin:isAdmin})
}); 
app.post("/editMarks", async (req, res) => {
  const { roll, thpaper1, thpaper2, pracpaper1, pracpaper2,year } = req.body;
  const isAdmin = req.session.isAdmin || false;
  const courseResult = await db.query('SELECT * FROM course WHERE year = $1', [year]);
  const course = courseResult.rows[0];
    const maxTheory1 = course.theory1;
    const maxTheory2 = course.theory2;
    const maxPrac1 = course.practical1;
    const maxPrac2 = course.practical2;
    let div = 0.0;
    let division = '';
    if (parseInt(thpaper2) > 0 && parseInt(pracpaper2) > 0) {
      div = ( (parseInt(thpaper1) + parseInt(thpaper2) + parseInt(pracpaper1) + parseInt(pracpaper2)) / 
              (parseInt(maxTheory1) + parseInt(maxTheory2) + parseInt(maxPrac1) + parseInt(maxPrac2)) ) * 100;
  } else {
      div = ( (parseInt(thpaper1) + parseInt(pracpaper1)) / 
              (parseInt(maxTheory1) + parseInt(maxPrac1)) ) * 100;
  }
    if (div >= 80) {
      division = "DISTINCTION";
    } else if (div < 80 && div >= 60) {
      division = "1ST DIVISION";
    } else if (div < 60 && div >= 50) {
      division = "2ND DIVISION";
    } else if (div < 50 && div >= 40) {
      division = "PASS";
    } else {
      division = "FAIL";
    }
  // SQL query to update marks
  const query = `
    UPDATE marks 
    SET 
      theory_1 = $1, 
      theory_2 = $2, 
      prac_1 = $3, 
      prac_2 = $4,
      div = $5,
      division = $6
    WHERE roll = $7`;

  try {
    // Execute the update query with the marks data
    const result = await db.query(query, [thpaper1, thpaper2, pracpaper1, pracpaper2, div, division, roll]);

    // Check if any rows were affected (i.e., if the update was successful)
    if (result.rowCount > 0) {
      res.render('./marks/editMarks.ejs', { error_message: "Marks updated successfully", admin: isAdmin });
    } else {
      res.render('./marks/editMarks.ejs', { error_message: "No student found with that roll number", admin: isAdmin });
    }
  } catch (err) {
    console.error('Error updating marks:', err);
    res.render('./marks/editMarks.ejs', { error_message: "Error updating marks, database not working", admin: isAdmin });
  }
});
app.post('/deleteMarks', async (req, res) => {
  const { delete_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  
  // SQL query to delete from marks table
  const deleteMarksQuery = 'DELETE FROM marks WHERE roll = $1';

  try {
    // Begin transaction
    await db.query('BEGIN');

    // Delete from marks table
    const deleteMarksResult = await db.query(deleteMarksQuery, [delete_roll]);

    if (deleteMarksResult.rowCount > 0) {
      // Commit transaction if marks were successfully deleted
      await db.query('COMMIT');
      res.render('./marks/editMarks.ejs', { error_message: 'Marks deleted successfully', admin: isAdmin });
    } else {
      // If no marks found, rollback the transaction
      await db.query('ROLLBACK');
      res.render('./marks/editMarks.ejs', { error_message: 'No marks found for the provided roll number', admin: isAdmin });
    }
  } catch (err) {
    // If there is any error, roll back the transaction
    await db.query('ROLLBACK');
    console.error('Error deleting marks:', err);
    res.render('./marks/editMarks.ejs', { error_message: 'Error deleting marks, please try again', admin: isAdmin });
  }
});

app.get('/getStudentDetails', async (req, res) => {
  const { roll } = req.query;

  try {
    // Query to get the details for the selected school code
    const result = await db.query(
      'SELECT student.* , school.name AS center_name, school.code, school.add1 AS center_add1,school.add2 AS center_add2 FROM student JOIN school ON school.code = student.center_num WHERE student.roll = $1',
      [roll]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]); // Send back the student details
    } else {
      res.status(404).json({ error: 'Student not found' });
    }
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});
app.post("/addMarks", async (req, res) => {
  const { roll, session, year, thpaper1, pracpaper1, thpaper2, pracpaper2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // First, check if the student exists using the roll number
  const fetchStudentQuery = `SELECT * FROM student WHERE roll = $1`;

  try {
    const studentResult = await db.query(fetchStudentQuery, [roll]);
    if (studentResult.rows.length === 0) {
      return res.render('./marks/addMarks.ejs', { error_message: "Student not found", admin: isAdmin });
    }

    // Check if the course for the given year exists
    const courseResult = await db.query('SELECT * FROM course WHERE year = $1', [year]);
    if (courseResult.rows.length === 0) {
      return res.render('./marks/addMarks.ejs', { error_message: "Course for the given year not found", admin: isAdmin });
    }

    // Get the maximum marks allowed from the course table for validation
    const course = courseResult.rows[0];
    const maxTheory1 = course.theory1;
    const maxTheory2 = course.theory2;
    const maxPrac1 = course.practical1;
    const maxPrac2 = course.practical2;

    // Validate the entered marks against the maximum allowed marks
    if (thpaper1 > maxTheory1) {
      return res.render('./marks/addMarks.ejs', { error_message: `Theory Paper 1 exceeds the maximum allowed marks of ${maxTheory1}`, admin: isAdmin });
    }
    if (thpaper2 > maxTheory2) {
      return res.render('./marks/addMarks.ejs', { error_message: `Theory Paper 2 exceeds the maximum allowed marks of ${maxTheory2}`, admin: isAdmin });
    }
    if (pracpaper1 > maxPrac1) {
      return res.render('./marks/addMarks.ejs', { error_message: `Practical Paper 1 exceeds the maximum allowed marks of ${maxPrac1}`, admin: isAdmin });
    }
    if (pracpaper2 > maxPrac2) {
      return res.render('./marks/addMarks.ejs', { error_message: `Practical Paper 2 exceeds the maximum allowed marks of ${maxPrac2}`, admin: isAdmin });
    }
    //division calculation
    let div = 0.0;
    let division = '';
    if (parseInt(thpaper2) > 0 && parseInt(pracpaper2) > 0) {
      div = ( (parseInt(thpaper1) + parseInt(thpaper2) + parseInt(pracpaper1) + parseInt(pracpaper2)) / 
              (parseInt(maxTheory1) + parseInt(maxTheory2) + parseInt(maxPrac1) + parseInt(maxPrac2)) ) * 100;
  } else {
      div = ( (parseInt(thpaper1) + parseInt(pracpaper1)) / 
              (parseInt(maxTheory1) + parseInt(maxPrac1)) ) * 100;
  }
    if (div >= 80) {
      division = "DISTINCTION";
    } else if (div < 80 && div >= 60) {
      division = "1ST DIVISION";
    } else if (div < 60 && div >= 50) {
      division = "2ND DIVISION";
    } else if (div < 50 && div >= 40) {
      division = "PASS";
    } else {
      division = "FAIL";
    }
    // If the student exists and the marks are valid, insert the marks into the marks table
    const insertMarksQuery = `INSERT INTO marks (roll, theory_1, theory_2, prac_1, prac_2, div,division)
                              VALUES ($1, $2, $3, $4, $5,$6,$7)`;

    await db.query(insertMarksQuery, [roll, thpaper1, thpaper2, pracpaper1, pracpaper2,div,division]);

    res.render('./marks/addMarks.ejs', { error_message: "Marks added successfully", admin: isAdmin });
  } catch (err) {
    console.error(err);
    res.render('./marks/addMarks.ejs', { error_message: "Error inserting marks", admin: isAdmin });
  }
});
app.get('/getMarks', async (req, res) => {
  const roll = req.query.roll;

  try {
      // Fetch marks for the student
      const marksQuery = 'SELECT * FROM marks WHERE roll = $1';
      const marksResult = await db.query(marksQuery, [roll]);

      if (marksResult.rows.length > 0) {
          // Return the marks if found
          const marks = marksResult.rows[0]; // Get the first entry
          const responseData = {
              theory_1: marks.theory_1 || null,
              theory_2: marks.theory_2 || null,
              prac_1: marks.prac_1 || null,
              prac_2: marks.prac_2 || null
          };
          return res.json(responseData);
      } else {
          // No marks found for the given roll number
          return res.status(404).json({ message: 'No marks found for the provided roll number.' });
      }
  } catch (error) {
      console.error('Error fetching marks:', error);
      return res.status(500).json({ error: 'Server error' });
  }
});

//course
app.get("/openCourse", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  const result = await db.query('SELECT * FROM course')
  res.render("./course/course.ejs",{admin:isAdmin,display:result.rows})
}); 
app.get("/addCourse", (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./course/addCourse.ejs",{admin:isAdmin})
}); 
app.post("/addCourse", async (req, res) => {
  const { year, fees, theory1, theory2, practical1, practical2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  // SQL query to insert course details
  const query = `INSERT INTO course (year, fees, theory1, theory2, practical1, practical2)
                 VALUES ($1, $2, $3, $4, $5, $6)`;

  try {
    await db.query(query, [year, fees, theory1, theory2, practical1, practical2]);
    res.render('./course/addCourse.ejs', { error_message: "Course added successfully", admin: isAdmin, year, fees, theory1, theory2, practical1, practical2 });
  } catch (err) {
    res.render('./course/addCourse.ejs', { error_message: err, admin: isAdmin });
  }
});
app.post("/editCourseInitiate", async (req,res) => {
  const {id} = req.body;
  const isAdmin = req.session.isAdmin || false;
  const query = `SELECT * FROM course WHERE id = $1`;
  try {
    const result = await db.query(query, [id]);
    res.render('./course/editCourse.ejs', { admin: isAdmin, courseid:id,year:result.rows[0].year, fees:result.rows[0].fees, theory1:result.rows[0].theory1, theory2:result.rows[0].theory2, practical1:result.rows[0].practical1, practical2:result.rows[0].practical1 });
  } catch (err) {
    res.render('./course/addCourse.ejs', { error_message: err, admin: isAdmin });
  }
})
app.post("/editCourse", async (req, res) => {
  const { id, year, fees, theory1, theory2, practical1, practical2 } = req.body;
  const isAdmin = req.session.isAdmin || false;

  const updateQuery = `
    UPDATE course 
    SET year = $1, fees = $2, theory1 = $3, theory2 = $4, practical1 = $5, practical2 = $6 
    WHERE id = $7
  `;

  try {
    // Execute the update query
    await db.query(updateQuery, [year, fees, theory1, theory2, practical1, practical2, id]);
    const result = await db.query('SELECT * FROM course')
    res.render("./course/course.ejs",{admin:isAdmin,display:result.rows})
  } catch (err) {
    // Render the edit course form again with an error message in case of failure
    res.render('./course/editCourse.ejs', { 
      error_message: 'Error updating course. Please try again.', 
      admin: isAdmin,
      year, 
      fees, 
      theory1, 
      theory2, 
      practical1, 
      practical2 
    });
  }
});
app.post("/deleteCourse", async (req, res) => {
  const { id } = req.body;
  const isAdmin = req.session.isAdmin || false;

  const deleteQuery = `DELETE FROM course WHERE id = $1`;

  try {
    await db.query(deleteQuery, [id]);
    const result = await db.query('SELECT * FROM course')
    res.render("./course/course.ejs",{admin:isAdmin,display:result.rows})
  } catch (err) {
    res.render('./course/editCourse.ejs', { 
      error_message: 'Error updating course. Please try again.', 
      admin: isAdmin
    });
  }
});


//reports
app.get("/viewAdmit", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/admit/viewAdmit.ejs",{admin:isAdmin})
}); 
app.post("/printAdmit", async(req,res)=>{
  const {start_roll,end_roll} = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range
    const query = `
      SELECT s.*, 
       sch.name AS school_name, 
       sch.add1 AS school_address_line1, 
       sch.add2 AS school_address_line2
FROM student s
JOIN school sch ON s.center_num = sch.code
WHERE s.roll >= $1 AND s.roll <= $2
ORDER BY s.roll;
    `;

    // Execute the query, using parameterized inputs to prevent SQL injection
    const result = await db.query(query, [start_roll, end_roll+'Z']);

    // Send the result rows back in the response
    res.render("./reports/admit/admitPrint.ejs" ,{display:result.rows})
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/admit/viewAdmit.ejs",{admin:isAdmin,error_message: error})
  }
})
app.post("/printAdmitLaser", async(req,res)=>{
  const {m_start_roll,m_end_roll} = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range
    const query = `
      SELECT s.*, 
       sch.name AS school_name, 
       sch.add1 AS school_address_line1, 
       sch.add2 AS school_address_line2
FROM student s
JOIN school sch ON s.center_num = sch.code
WHERE s.roll >= $1 AND s.roll <= $2;
    `;

    // Execute the query, using parameterized inputs to prevent SQL injection
    const result = await db.query(query, [m_start_roll, m_end_roll+'Z']);

    // Send the result rows back in the response
    res.render("./reports/admit/admitPrintLaser.ejs" ,{display:result.rows})
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/admit/viewAdmit.ejs",{admin:isAdmin,error_message: error})
  }
})

app.get("/viewMarksheet", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/marksheet/viewMarksheet.ejs",{admin:isAdmin})
}); 
app.post("/printMarksheet", async (req, res) => {
  const { start_roll, end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their marks and school info
    const query = `
      SELECT s.roll,
       s.name,
       s.session,
       s.year,
       sch.name AS school_name,
       m.theory_1,
       m.theory_2,
       m.prac_1,
       m.prac_2,
       m.division
FROM student s
JOIN school sch ON s.center_num = sch.code
JOIN marks m ON s.roll = m.roll
WHERE s.roll >= $1 AND s.roll <= $2
  AND m.div != 0
  ORDER BY s.roll;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [start_roll, end_roll + 'Z']);
    if (result.rows.length>0){
      res.render("./reports/marksheet/marksheetPrint.ejs", { display: result.rows });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/marksheet/viewMarksheet.ejs", { admin: isAdmin, error_message: error });
  }
});
app.post("/printMarksheetLaser", async (req, res) => {
  const { m_start_roll, m_end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their marks and school info
    const query = `
      SELECT s.roll,
             s.name,
             s.session,
             s.year,
             sch.name AS school_name,
             m.theory_1,
             m.theory_2,
             m.prac_1,
             m.prac_2,
             m.division
      FROM student s
      JOIN school sch ON s.center_num = sch.code
      JOIN marks m ON s.roll = m.roll
      WHERE s.roll >= $1 AND s.roll <= $2;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [m_start_roll, m_end_roll + 'Z']);
    
    // Send the result rows back in the response, rendering the marksheet template
    res.render("./reports/marksheet/marksheetPrintLaser.ejs", { display: result.rows });
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/marksheet/viewMarksheet.ejs", { admin: isAdmin, error_message: error });
  }
});

app.get("/viewCertificate", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/certificate/viewCertificate.ejs",{admin:isAdmin})
}); 
app.post("/printCertificate", async (req, res) => {
  const { start_roll, end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their guardian name and school info
    const query = `
      SELECT s.roll,
             s.name,
             s.guard_name,     
             s.session,
             s.year,
             sch.name AS school_name,
             m.div
      FROM student s
      JOIN school sch ON s.center_num = sch.code
      JOIN marks m ON s.roll = m.roll
      WHERE s.roll >= $1 AND s.roll <= $2
      AND m.div != 0
      ORDER BY s.roll;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [start_roll, end_roll + 'Z']);
    // Send the result rows back in the response, rendering the certificate template
    res.render("./reports/certificate/certificatePrint.ejs", { display: result.rows });
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/certificate/viewCertificate.ejs", { admin: isAdmin, error_message: error });
  }
});
app.post("/printCertificatewithMarksPercentage", async (req, res) => {
  const { pm_start_roll, pm_end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their guardian name and school info
    const query = `
      SELECT s.roll,
             s.name,
             s.guard_name,     
             s.session,
             s.year,
             sch.name AS school_name,
             m.div
      FROM student s
      JOIN school sch ON s.center_num = sch.code
      JOIN marks m ON s.roll = m.roll
      WHERE s.roll >= $1 AND s.roll <= $2
      AND m.div != 0
      ORDER BY s.roll;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [pm_start_roll, pm_end_roll + 'Z']);

    // Send the result rows back in the response, rendering the certificate template
    res.render("./reports/certificate/certificateMarksPercentage.ejs", { display: result.rows });
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/certificate/viewCertificate.ejs", { admin: isAdmin, error_message: error });
  }
});
app.post("/printCertificatewithMarks", async (req, res) => {
  const { m_start_roll, m_end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their guardian name and school info
    const query = `
      SELECT s.roll,
             s.name,
             s.guard_name,     
             s.session,
             s.year,
             sch.name AS school_name,
             m.theory_1,
             m.theory_2,
             m.prac_1,
             m.prac_2,
             m.div
      FROM student s
      JOIN school sch ON s.center_num = sch.code
      JOIN marks m ON s.roll = m.roll
      WHERE s.roll >= $1 AND s.roll <= $2
      AND m.div != 0
      ORDER BY s.roll;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [m_start_roll, m_end_roll + 'Z']);

    // Send the result rows back in the response, rendering the certificate template
    res.render("./reports/certificate/certificateMarks.ejs", { display: result.rows });
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/certificate/viewCertificate.ejs", { admin: isAdmin, error_message: error });
  }
});
app.post("/printCertificateLaser", async (req, res) => {
  const { pml_start_roll, pml_end_roll } = req.body;
  const isAdmin = req.session.isAdmin || false;
  try {
    // Query to fetch students within the roll range along with their guardian name and school info
    const query = `
      SELECT s.roll,
             s.name,
             s.guard_name,     
             s.session,
             s.year,
             sch.name AS school_name,
             m.div
      FROM student s
      JOIN school sch ON s.center_num = sch.code
      JOIN marks m ON s.roll = m.roll
      WHERE s.roll >= $1 AND s.roll <= $2;
    `;

    // Execute the query with parameterized inputs to prevent SQL injection
    const result = await db.query(query, [pml_start_roll, pml_end_roll + 'Z']);

    // Send the result rows back in the response, rendering the certificate template
    res.render("./reports/certificate/certificatePrintLaser.ejs", { display: result.rows });
  } catch (error) {
    console.error('Error executing query', error);
    res.render("./reports/certificate/viewCertificate.ejs", { admin: isAdmin, error_message: error });
  }
});

app.get("/viewExaminerSheet", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/ExaminerSheet/viewExamSheet.ejs",{admin:isAdmin})
});
app.post("/printExamSheet", async(req,res) => {
  const { session, code } = req.body;
  const query = `
    SELECT 
        school.name AS school_name,
        student.name AS student_name, 
        student.roll,
        student.year
    FROM 
        student
    JOIN 
        school
    ON 
        student.center_num = school.code
    WHERE 
        student.session = $1
    AND 
        student.center_num = $2;
  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session, code]);
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/ExaminerSheet/examinerSheet.ejs', { rows: result.rows,session,code });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewAttendanceSheet", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Attendance Sheet/viewAttendanceSheet.ejs",{admin:isAdmin})
});
app.post("/printAttendanceSheet", async(req,res) => {
  const { session, code } = req.body;
  const query = `
    SELECT 
    school.name AS school_name,
    student.name AS student_name, 
    student.roll,
    student.year,
	student.guard_name
FROM 
    student
JOIN 
    school
ON 
    student.center_num = school.code
WHERE 
    student.session = $1
AND 
    student.center_num = $2
GROUP BY 
    school.name, student.name, student.roll, student.year
ORDER BY student.year, SUBSTRING(student.roll FROM '([0-9]+)')::BIGINT ASC, student.roll;

  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session, code]);
    if (result.rows.length>0){
      res.render('./reports/special/Attendance Sheet/attendanceSheet.ejs', { rows: result.rows,session,code });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewResultSheet", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Result Sheet/viewResultSheet.ejs",{admin:isAdmin})
});
app.post("/printResultSheet", async(req,res) => {
  const { session, code } = req.body;
  const query = `
    SELECT 
    school.name AS school_name,
    student.name AS student_name, 
    student.roll,
    student.year,
    student.guard_name,
    marks.theory_1,
    marks.theory_2,
    marks.prac_1,
    marks.prac_2,
    marks.div,
    marks.division
FROM 
    student
JOIN 
    school ON student.center_num = school.code
JOIN 
    marks ON student.roll = marks.roll -- Join with the marks table
WHERE 
    student.session = $1
AND 
    student.center_num = $2
GROUP BY 
    school.name, student.name, student.roll, student.year,
    marks.theory_1, marks.theory_2, marks.prac_1, marks.prac_2,
    marks.div, marks.division
ORDER BY student.year, SUBSTRING(student.roll FROM '([0-9]+)')::BIGINT ASC, student.roll;

  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session, code]);
    if (result.rows.length>0){
      res.render('./reports/special/Result Sheet/resultSheet.ejs', { rows: result.rows,session,code });
    }
    else{
      res.send("No data found. Exit this tab");
    }
    // Send the query result to the EJS view
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewBill", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Bill/viewBill.ejs",{admin:isAdmin})
});
app.post("/printBill", async(req,res) => {
  const { session, code } = req.body;
  const query = `
    SELECT
        s.year,
        COUNT(s.roll) AS student_count,
        c.fees
    FROM
        student s
    JOIN
        school sch ON s.center_num = sch.code
    JOIN
        course c ON s.year = c.year
    WHERE
        sch.code = $1  -- Replace with the actual school code you're querying
        AND s.session = $2  -- Replace with the actual session you're querying
    GROUP BY
         s.year, c.fees
    ORDER BY
        s.year;
  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [code,session]);
    const school = await db.query('SELECT * FROM school where school.code = $1',[code])
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/Bill/bill.ejs', { rows: result.rows,school:school.rows, session, code });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewCourseResultSheet", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Result Sheet/viewCourseResultSheet.ejs",{admin:isAdmin})
});
app.post("/printCourseResultSheet", async(req,res) => {
  const { session, year } = req.body;
  const query = `
   SELECT 
    student.name AS student_name, 
    student.roll,
    school.code AS school_code, 
    school.name AS school_name, 
    marks.prac_1, 
    marks.prac_2, 
    marks.theory_1, 
    marks.theory_2, 
    marks.div, 
    marks.division, 
    student.guard_name
FROM 
    student
JOIN 
    school ON student.center_num = school.code
JOIN 
    marks ON student.roll = marks.roll
WHERE 
    student.session = $1  -- Search by session (first parameter)
AND 
    student.year = $2     -- Search by year (second parameter)
GROUP BY 
    student.name, student.roll, school.code, school.name, 
    marks.prac_1, marks.prac_2, marks.theory_1, marks.theory_2, 
    marks.div, marks.division, student.guard_name
ORDER BY 
    marks.div DESC;  -- Order by division in descending order

  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session, year]);
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/Result Sheet/courseResultSheet.ejs', { rows: result.rows,session,year });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewResultSummary", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Result Summary/viewResultSummary.ejs",{admin:isAdmin})
});
app.post("/printResultSummary", async(req,res) => {
  const { session, code } = req.body;
  const query = `
   -- Get the number of students in each division from a specific school and session
SELECT 
    marks.division,
    COUNT(*) AS students_in_division,
    (SELECT COUNT(*) 
     FROM marks 
     JOIN student ON marks.roll = student.roll 
     WHERE student.center_num = $1 
     AND student.session = $2) AS total_students_in_school
FROM 
    marks
JOIN 
    student ON marks.roll = student.roll
WHERE 
    student.center_num = $1 
AND 
    student.session = $2
GROUP BY 
    marks.division;

  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [code,session]);
    const school = await db.query("SELECT school.name FROM school WHERE code = $1", [code])
    const left = await db.query("SELECT student.roll FROM student LEFT JOIN marks ON student.roll = marks.roll WHERE student.center_num = $1 AND student.session = $2 AND marks.roll IS NULL;",[code,session])
    // Send the query result to the EJS view
    if (result.rows.length === 0){
      res.render("index.ejs", { message: "No data of specific school or session in database", admin: isAdmin });
    }else{
      res.render('./reports/special/Result Summary/resultSummary.ejs', { rows: result.rows,session,code,school: school.rows[0].name, left:left.rows }); 
    }
    
    
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewAgentBill", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Agent Commission/agentDetails.ejs",{admin:isAdmin})
});
app.post("/printAgentBill", async(req,res) => {
  const { code,sdate,edate } = req.body;
  const query = `
    SELECT 
    school_code,
    school_name,
    SUM(total_students) AS total_students,
    SUM(total_fees) AS total_fees,
    center_fee,
	agent_comm
FROM (
    SELECT 
        s.code AS school_code,
        s.name AS school_name,
        COUNT(st.roll) AS total_students,
        c.fees * COUNT(st.roll) AS total_fees,
        s.center_fee,
        s.agent_comm
    FROM 
        student st
    JOIN 
        school s ON st.center_num = s.code
    JOIN 
        course c ON st.year = c.year
    WHERE 
        s.agent_code = $1
        AND to_date(st.admission_date, 'DD.MM.YYYY') >= to_date($2, 'DD.MM.YYYY') 
        AND to_date(st.admission_date, 'DD.MM.YYYY') <= to_date($3, 'DD.MM.YYYY') -- Date range checking
    GROUP BY 
        s.code, s.name, c.fees, s.center_fee, s.agent_comm
) AS course_summary
GROUP BY 
    school_code, school_name, center_fee,agent_comm
ORDER BY 
    school_code;
  `;

  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [code,sdate,edate]);
    const agent = await db.query('SELECT * FROM agent WHERE code = $1',[code])
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/Agent Commission/agentBill.ejs', { rows: result.rows,agent:agent.rows[0],code,sdate,edate });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewMonthlyCollection", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Monthly Collection/viewMonthlyCollection.ejs",{admin:isAdmin})
});
app.post("/printMonthlyCollection", async(req,res) => {
  const { session,month,year } = req.body;
  const query = `
  SELECT 
    school_code,
    school_name,
    SUM(total_students) AS total_students,
    SUM(total_fees) AS total_fees,
    center_fee
FROM (
    SELECT 
        s.code AS school_code,
        s.name AS school_name,
        COUNT(st.roll) AS total_students,
        c.fees * COUNT(st.roll) AS total_fees,
        s.center_fee,
        s.agent_comm
    FROM 
        student st
    JOIN 
        school s ON st.center_num = s.code
    JOIN 
        course c ON st.year = c.year
    WHERE 
        st.session = $1
        AND to_date(st.admission_date, 'DD.MM.YYYY') >= to_date($2, 'DD.MM.YYYY') 
        AND to_date(st.admission_date, 'DD.MM.YYYY') <= to_date($3, 'DD.MM.YYYY') -- Date range checking
    GROUP BY 
        s.code, s.name, c.fees, s.center_fee 
) AS course_summary
GROUP BY 
    school_code, school_name, center_fee
ORDER BY 
    school_code;
  `;
  const sdate = "01."+month+"."+year;
  const edate = "31."+month+"."+year;
  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session,sdate,edate]);
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/Monthly Collection/monthlyCollection.ejs', { rows: result.rows,session,month,year });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/viewSession", async (req,res) => {
  const isAdmin = req.session.isAdmin || false;
  res.render("./reports/special/Session Report/viewSessionReport.ejs",{admin:isAdmin})
});
app.post("/sessionReport", async(req,res) => {
  const { session } = req.body;
  const query = `
  SELECT 
    s.code AS school_code,
    s.name AS school_name,
    COUNT(st.roll) AS total_students,
    CASE 
        WHEN COUNT(st.roll) > 0 THEN TRUE 
        ELSE FALSE 
    END AS status
FROM 
    school s
LEFT JOIN 
    student st ON s.code = st.center_num AND st.session = $1  -- Replace 'your_session_value' with the actual session you want to filter by
GROUP BY 
    s.code, s.name
ORDER BY 
    s.code;
  `;
  try {
    // Execute the query with the provided session and school_code
    const result = await db.query(query, [session]);
    // Send the query result to the EJS view
    if (result.rows.length>0){
      res.render('./reports/special/Session Report/sessionReport.ejs', { rows: result.rows,session });
    }
    else{
      res.send("No data found. Exit this tab");
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  const closeDatabase = async () => {
    try {
      await db.end();
      console.log("Database connection closed.");
    } catch (err) {
      console.error("Error closing the database connection:", err);
    }
  };
  
  // Handle graceful shutdown
  process.on("SIGTERM", closeDatabase);
  process.on("SIGINT", closeDatabase);    