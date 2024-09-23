import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendResponse from "./utils.js"; // Assume sendResponse is a utility for sending responses
import cloudinary from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "products", // Folder name in your Cloudinary account
    format: async (req, file) => "jpg", // Supports 'png', 'jpg', etc.
    public_id: (req, file) => `${file.fieldname}-${Date.now()}`, // Unique public ID for each file
  },
});

// Multer middleware using Cloudinary storage
const upload = multer({ storage });

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

    // Create Product Endpoint
    app.post("/products", upload.single("image"), async (req, res) => {
      const formData = req.body;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .send(sendResponse(false, "No image uploaded", {}));
      }

      // Store Cloudinary URL
      formData.image = file.path;

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

    // Delete product and associated image
    app.delete("/products/:id", async (req, res) => {
      try {
        // Find the product by ID
        const product = await productCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        if (!product) {
          return res
            .status(404)
            .send(sendResponse(false, "Product not found", {}));
        }

        // Extract the public ID from the image URL
        const imageUrl = product.image;
        const publicId = imageUrl.split("/").pop().split(".")[0]; // Extracts the public ID

        // Delete the image from Cloudinary
        await cloudinary.v2.uploader.destroy(publicId);

        // Delete the product from the database
        const result = await productCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(
          sendResponse(true, "Product and image deleted successfully", result)
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error deleting product", err.message));
      }
    });
    // Update product
    app.patch("/products/:id", upload.single("image"), async (req, res) => {
      const newData = req.body;
      const file = req.file;

      if (file) {
        // Update the image URL with Cloudinary URL if a new image is uploaded
        newData.image = file.path;
      }

      const result = await productCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: newData }
      );
      res.send(sendResponse(true, "Product updated successfully", result));
    });

    // Category endpoints can follow a similar pattern
    app.post("/category", upload.single("image"), async (req, res) => {
      const data = req.body;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .send(sendResponse(false, "No image uploaded", {}));
      }

      // Store Cloudinary URL
      data.image = file.path;

      // Insert category data into the MongoDB collection
      const result = await categoryCollection.insertOne(data);
      res.send(sendResponse(true, "Category created successfully", result));
    });

    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(
        sendResponse(true, "All categories retrieved successfully", result)
      );
    });

    // Delete category and associated image
    app.delete("/category/:id", async (req, res) => {
      try {
        // Find the category by ID
        const category = await categoryCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        if (!category) {
          return res
            .status(404)
            .send(sendResponse(false, "Category not found", {}));
        }

        // Extract the public ID from the image URL
        const imageUrl = category.image;
        const publicId = imageUrl.split("/").pop().split(".")[0]; // Extracts the public ID

        // Delete the image from Cloudinary
        await cloudinary.v2.uploader.destroy(publicId);

        // Delete the category from the database
        const result = await categoryCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(
          sendResponse(true, "Category and image deleted successfully", result)
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error deleting category", err.message));
      }
    });

    app.patch("/category/:id", upload.single("image"), async (req, res) => {
      const newData = req.body;
      const file = req.file;

      if (file) {
        newData.image = file.path;
      }

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