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

// Api Calls -------------------------------------------------------------------//

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

    // Save the details to the Firestore database
    db.collection("userdata")
        .doc(details.year)
        .collection(details.batch)
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