import { MongoClient, ServerApiVersion } from 'mongodb';
import express from "express";
import dotenv from "dotenv";
import cors from 'cors';

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// setting mongodb


// routes function

const uri = process.env.URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // creating product route
    const productCollection = await client.db('nursery').collection('products');


    // creating product
    app.post('/products', async(req, res) => {
        const result = await productCollection.insertOne(req.body);
        res.send({
            success: true,
            message: "Product created successfully",
            data: result
        })  
    })


  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


run().catch((err)=> console.log(err));

// get route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is working",
  });
});
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on http://localhost:${process.env.PORT}`);
});
