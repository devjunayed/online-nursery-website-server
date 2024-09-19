import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendResponse from "./utils.js";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

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

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/category");
  },
  filename: (req, file, cb) => {
    // Get the file extension from the original file name
    const ext = path.extname(file.originalname);
    // Use a unique identifier for the filename (e.g., Date.now())
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const uploadCategory = multer({
  storage,
  dest: "./uploads/category",
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed (jpeg, jpg, png)"));
  },
});
const uploadProducts = multer({ dest: "./uploads/products" });

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collection
    const productCollection = await client.db("nursery").collection("products");
    const categoryCollection = await client
      .db("nursery")
      .collection("category");

    /// {{{{Products}}}}

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

    /// {{{Category}}}

    app.post("/category", uploadCategory.single("image"), async (req, res) => {
      const data = req.body;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .send(sendResponse(false, "No image uploaded", {}));
      }

      data.image = `${process.env.API_URL}/uploads/category/${file.filename}`;
      const result = await categoryCollection.insertOne(data);
      res.send(sendResponse(true, "Category created successfully", result));
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
