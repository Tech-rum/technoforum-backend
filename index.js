const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const JsBarcode = require('jsbarcode');

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

//secret key for jwt
const SECRET = "techno-secret-key";

//jwt authentication  middleware

const authenticateJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (authHeader) {
      const token = authHeader.split(' ')[1];
  
      jwt.verify(token, SECRET, (err, user) => {
        if (err) {
          return res.sendStatus(403);
        }
  
        req.user = user;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };
  //Admin
  const ADMIN = [{
    email: "email",
    password: "password"//this will be encrypted
    //email and password of technoforum
  }]

 

// Firebase connection to database
const serviceAccount = require('./key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET_URL' // Replace with your Firebase Storage URL
});
const db = admin.firestore();



// Function to generate access token
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
        token: token,
        expiry: expiryDate.toISOString(),
    };
}

// Function to generate barcode image
function generateBarcodeImage(virtualid) {
    const canvas = document.createElement('canvas');

    JsBarcode(canvas, virtualid, {
        format: 'CODE128', // Use the barcode format you need
        displayValue: true,
    });

    // Convert canvas to PNG image data
    const imageData = canvas.toDataURL('image/png');
    return imageData;
}


// Function to generate unique virtual ID
async function generateUniqueID(branch, batch) {
    const existingIDs = new Set();

    const snapshot = await db.collection('userdata')
        .doc(batch)
        .collection(branch)
        .listDocuments();

    snapshot.forEach(doc => existingIDs.add(doc.id));

    while (true) {
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const branchCode = branch === 'cse' ? '1001' : branch === 'ece' ? '2002' : '00';
        const fullID = `${branchCode}${batch}${randomID}`;
        
        if (!existingIDs.has(fullID)) {
            return fullID;
        }
    }
}

// Function to send welcome email with Firebase Storage URL
async function sendEmail(details, virtualid) {

    const emailContent = `
    <html>
    <head>
        <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 0;
            padding: 0;
            height: 100vh;
          }
          
          .id-card {
            background-color: #000;
            color: #fff;
            max-width: 500px;
            margin: 40px auto;
            border-radius: 20px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            padding: 10px;
            display: grid;
            grid-template-rows: 2fr 4fr 2fr;
            text-align: center;
            align-items: center;
          }

          .header {
            display: grid;
            align-items: center;
            text-align: center;
            width: 100%;
            justify-content: center;
            grid-template-rows: auto auto;
            row-gap: 20px;
          }
          
 
          .logo {
            width: 80%;
            height: auto;
            text-align: center;
            margin: auto;
          }

          .logo img {
            width: 200px;
          }
          
          .user-details {
            text-align: left;
            color: #fff;

          }
          
            .details h4, .details h5 {
            margin: 0;
            color: #fff;
          }
          
          .virtual-id {
            font-weight: bold;
            margin-top: 20px;
            text-align: center;
          }

          p {
            color: #fff;
            font-size: 12px;
          }
          .body-p {
            color: #000;
          }

          h1 {
            color: #000;
          }

          a {
            color: #000;
          }
          
        </style>
    </head>
    <body>
    <h1>Welcome to Technoforum Society at Birla Institute Of Applied Sciences</h1>
    <a class="body-p">Hello ${details.studentname},</a><br>
    <a class="body-p">We are excited to welcome you to the Technoforum Society at Birla Institute Of Applied Sciences. Your VID number is: <u> <strong> ${virtualid} </strong></u></a><br>
    <a class="body-p">Your registration details and Technoforum VID Card:</a>
    <div class="id-card">
        <div class="header">
            <div class="logo">
                <img src="https://firebasestorage.googleapis.com/v0/b/technoforum-bias.appspot.com/o/newTechno.png?alt=media&token=d71bce85-3f39-4a63-b34e-22c151efd84d" alt="Logo">
            </div>
            <div class="details">
                <h3>VIRTUAL ID</h3>
            </div>
        </div>

    <div class="user-details">
        <p style="text-align:left;">Name: ${details.studentname}</p>
        <p style="text-align:left;">Phone: ${details.phone}</p>
        <p style="text-align:left;">Date of Birth: ${details.dob}</p>
        <p style="text-align:left; text-transform:uppercase;">Batch: ${details.batch} - ${details.branch}</p>
        <p style="text-align:left;">Address: ${details.address}</p>
    </div>
    <div class="virtual-id">${virtualid}</div>
</div><br>
<a class="body-p" style="color: red"><strong>IMPORTANT NOTICE!</strong></a><br>
<a class="body-p" style="color: red">Please take a screenshot of this ID and keep it safe. Do not delete the email containing this ID. Once the ID is lost, it's gone forever, and we won't be able to help you retrieve it again.</a><br>
<a class="body-p"><strong>Thank you for your interest.</strong></a><br>
<a class="body-p"><strong>Sincerely,</strong></a><br>
<a class="body-p"><strong>Technoforum Development Team</strong></a><br>
</body>
</html>
    `;

    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        auth: {
            user: 'technoforum010@gmail.com',
            pass: 'tTA49B0Qzy8FbVP6',
        }
    });

    const mailOptions = {
        from: 'technoforum010@gmail.com',
        to: details.email,
        subject: 'Welcome to Technoforum Society!',
        html: emailContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}


// ... Rest of your code ...

app.get("/api/get-token", (req, res)=> {
    db.collection("admin").doc("accesstoken").get().then( async (doc) => {
        var token = await doc.data();
        res.status(200).json(token);
    }).catch((error) => {
        res.status(500).json(error);
    })
})

app.post("/api/generate-token", async (req, res) => {
    const accesstoken = generateAccessToken();

    await db.collection("admin").doc("accesstoken").set({
        token: accesstoken.token,
        expiry: accesstoken.expiry
    })

    db.collection("admin").doc("accesstoken").get().then( async (doc) => {
        var token = await doc.data();
        res.status(200).json(token);
    }).catch((error) => {
        res.status(500).json(error);
    })
})


//Admin Api calls

 //admin login in route

 app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = ADMIN.find(a => a.email === email && a.password === password);
  if (admin) {
    const token = jwt.sign({ email, role: 'admin' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.get('/admin/me', authenticateJwt, (req, res) => {
  res.status(200).json({
    email: req.user.email
  })
})

//User Api Calls -------------------------------------------------------------------//

app.post("/api/register", async (req, res) => {
    const body = req.body; // Parsed request body from body-parser

    var details = {
        studentname: body.name,
        email: body.email,
        phone: body.phoneNo,
        dob: body.dob,
        batch: body.batch,
        branch: body.branch,
        address: body.address,
        token: body.token
    };

    console.log(details);

    var token_data = await db.collection("admin").doc("accesstoken").get();
    var token_data = await token_data.data();

    if(token_data.token == details.token) {

        var virtualid =  await generateUniqueID(details.branch, details.batch);
        console.log(virtualid);


        // Save the details to the Firestore database
        db.collection("userdata").doc(req.body.batch).collection(req.body.branch).doc(virtualid).set(details)
        .then(async () => {
            res.status(200).json({ message: "Registration successful!" });
            await sendEmail(details, virtualid);
        })
        .catch((error) => {
            res.status(500).json({ error: "Failed to register: " + error.message });
        });
    }
    else {
        res.status(500).json({ error: "Failed to register: Please enter a valid access token " });
    }
});

// Api end --------------------------------------------------------------------//

app.listen(port, () => {
    console.log("Server is listening on port:", port);
});
