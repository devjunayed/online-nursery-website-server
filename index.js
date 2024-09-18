import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendResponse from "./utils.js";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// setting mongodb

const uri = process.env.URI;

console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // creating product route
    const productCollection = await client.db("nursery").collection("products");

    // creating product
    app.post("/products", async (req, res) => {
      const result = await productCollection.insertOne(req.body);
      res.send(
        sendResponse(true, "Product created successfully", {
          ...result,
          ...req.body,
        })
      );
    });

    // get all products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(
        sendResponse(true, "All products retieved successfully", result)
      );
    });

    // get single products
    app.get("/products/:id", async (req, res) => {
      const result = await productCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      console.log(req.params.id, result);
      res.send(sendResponse(true, "Product retrieved successfully", result));
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

run().catch((err) => console.log(err));

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
