const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');

const port = process.env.PORT || 5000;
const app = express();

// Firebase connection to database ----------------------------------------------//

const serviceAccount = require('./key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware -----------------------------------------------------------------//

app.use(bodyParser.json()); // Add body-parser middleware
app.use(cors()); // Add cors middleware


// generate access token -----------------------------------------------------//

function generateAccessToken() {
    const tokenLength = 10;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
  
    for (let i = 0; i < tokenLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      token += characters.charAt(randomIndex);
    }
  
    return {
      access_token: token,
      expiry_date: expiryDate.toISOString(),
    };
  }
  

//Middleware to authenticate admin

const authenticateAdmin = (req, res, next) => {
    const admin = {
        email: "email", //email of admin hardcoded
        password: "password" //password of admin hardcoded
    }

    const {email, password} = req.body;

    if(email == admin.email && password == admin.password)
    next();
    else{
        res.status(400).json({
            message: "invalid admin email and password"
        })
    }
}


app.get("/api/generate-token", (req, res)=> {
    db.collection("admin").doc("accesstoken").get().then( async (doc) => {
        var token = await doc.data();
        res.status(200).json(token);
    }).catch((error) => {
        res.status(500).json(error);
    })
})


//Admin Api calls

app.post("/admin/login", authenticateAdmin, (req, res) => {
    res.status(200).send({
        message: "welcome to the admin dashboard"
    })
})

//User Api Calls -------------------------------------------------------------------//

app.post("/api/register", (req, res) => {
    const body = req.body; // Parsed request body from body-parser

    var details = {
        studentname: body.name,
        email: body.email,
        phone: body.phoneNo,
        dob: body.dob,
        batch: body.batch,
        year: body.year,
        semester: body.semester,
        address: body.address
    };

    console.log(details)

    // Save the details to the Firestore database
    db.collection("userdata")
        .doc(req.body.batch)
        .collection(req.body.branch)
        .doc(details.email)
        .set(details)
        .then(() => {
            res.status(200).json({ message: "Registration successful!" });
        })
        .catch((error) => {
            res.status(500).json({ error: "Failed to register: " + error.message });
        });
});

// Api end --------------------------------------------------------------------//

// Admin panel ----------------------------------------------------------------//

app.listen(port, () => {
    console.log("Server is listening on port:", port);
});