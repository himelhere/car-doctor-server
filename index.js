const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser());
// mongoDB
console.log('The password is: ',process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekh1qyr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Own Middlewares
const logger = (req, res, next) => {
  console.log('Logger info: ', req.method, req.url);
  next();
}  

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log('token in the middleware: ', token);
  next();
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('booking');


    // Auth related API
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      console.log('Token for this email: ', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn : '1h'})

      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res)=> {
      const user = req.body;
      console.log('logging out: ', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    // Services
    app.get('/services', async(req, res) => {
        const cursor = servicesCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await servicesCollection.findOne(query);
        res.send(result);
    })

    // Bookings
    app.post('/booking', async(req, res) =>{
      const order = req.body;
      console.log('The order is: ', order);
      const result = await bookingCollection.insertOne(order);
      res.send(result)
    })

    app.get('/booking', logger, verifyToken, async(req, res) => {
      // const query = req.query;
      // console.log(req?.query?.email);
      // console.log('Cook Cookies is: ', req?.cookies?.token)
      let query = {};
      if(req.query?.email){
        query = {email : req.query.email};
      };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
  })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Car doctor is running...')
})


app.listen(port, () => {
    console.log('App is running on port:', port)
})