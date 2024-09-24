import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendResponse from "./utils.js"; // Assume sendResponse is a utility for sending responses

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// MongoDB setup
const uri = process.env.URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the MongoDB server
    await client.connect();

    // Collections for products and categories
    const productCollection = client.db("nursery").collection("products");
    const categoryCollection = client.db("nursery").collection("category");

    /*=====================================
                Products
    ========================================*/
    // Create Product Endpoint
    app.post("/products", async (req, res) => {
      const formData = req.body;

      // Insert product data into the MongoDB collection
      const result = await productCollection.insertOne(formData);
      res.send(
        sendResponse(true, "Product created successfully", {
          ...result,
          ...formData,
        })
      );
    });

    // Get all products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(
        sendResponse(true, "All products retrieved successfully", result)
      );
    });

    // Get single product by ID
    app.get("/products/:id", async (req, res) => {
      const result = await productCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(sendResponse(true, "Product retrieved successfully", result));
    });

    // Delete product
    app.delete("/products/:id", async (req, res) => {
      try {
        // Delete the product from the database
        const result = await productCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(sendResponse(true, "Product deleted successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error deleting product", err.message));
      }
    });

    // Update product
    app.patch("/products/:id", async (req, res) => {
      const newData = req.body;

      const result = await productCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: newData }
      );
      res.send(sendResponse(true, "Product updated successfully", result));
    });

    /*================================================
                      Category
      =================================================*/
    // create category endpoints
    app.post("/category", async (req, res) => {
      const data = req.body;
    
      if (!data || Object.keys(data).length === 0) {
        return res.json(sendResponse(false, "Failed to insert data", ""));
      }
    
      try {
        // Insert category data into the MongoDB collection
        const result = await categoryCollection.insertOne(data);
        return res.send(sendResponse(true, "Category created successfully", result));
      } catch (error) {
        return res.json(sendResponse(false, "Failed to create category", error));
      }
    });
    

    // getting all category data
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(
        sendResponse(true, "All categories retrieved successfully", result)
      );
    });

    // Delete category
    app.delete("/category/:id", async (req, res) => {
      try {
        // Delete the category from the database
        const result = await categoryCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(sendResponse(true, "Category deleted successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error deleting category", err.message));
      }
    });

    // update category
    app.patch("/category/:id", async (req, res) => {
      const newData = req.body;

      const result = await categoryCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: newData }
      );
      res.send(sendResponse(true, "Category updated successfully", result));
    });

    // Global error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack); // Log the error stack for debugging

      res.status(500).json({
        success: false,
        message: "Something went wrong!",
        error: err.message, // Provide error message to the client
      });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Root route to check if the server is working
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is working",
  });
});

// Start the server on the specified port
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on http://localhost:${process.env.PORT}`);
});
