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
const categoryStorage = multer.diskStorage({
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

const productsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/products");
  },
  filename: (req, file, cb) => {
    // Get the file extension from the original file name
    const ext = path.extname(file.originalname);
    // Use a unique identifier for the filename (e.g., Date.now())
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const uploadCategory = multer({
  categoryStorage,
  dest: "./uploads/category",
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|ico/;
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
const uploadProduct = multer({
  productsStorage,
  dest: "./uploads/products",
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|ico/;
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
    app.post("/products", uploadProduct.single("image"), async (req, res) => {
      const formData = req.body;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .send(sendResponse(false, "No image uploaded", {}));
      }
      formData.image = `${process.env.API_URL}/uploads/products/${file.filename}`;
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

    // deleting products
    app.delete("/products/:id", async (req, res) => {
      const result = await productCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(sendResponse(true, "Products deleted  successfully", result));
    });

    // update products
    app.patch(
      "/products/:id",
      uploadProduct.single("image"),
      async (req, res) => {
        const newData = req.body;
        const file = req.file;

        if (file) {
          newData.image = `${process.env.API_URL}/uploads/products/${file.filename}`;
        }
        console.log(newData);

        const result = await productCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: newData,
          }
        );
        res.send(sendResponse(true, "Products updated  successfully", result));
      }
    );

    /// {{{Category}}}

    // creating category
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

    // get all category
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(
        sendResponse(true, "Category data fetched successfully", result)
      );
    });
    // delete category
    app.delete("/category/:id", async (req, res) => {
      const result = await categoryCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(sendResponse(true, "Category deleted  successfully", result));
    });

    // update category
    app.patch(
      "/category/:id",
      uploadCategory.single("image"),
      async (req, res) => {
        const newData = req.body;
        const file = req.file;

        if (file) {
          newData.image = `${process.env.API_URL}/uploads/category/${file.filename}`;
        }
        console.log(newData);

        const result = await categoryCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: newData,
          }
        );
        res.send(sendResponse(true, "Category updated  successfully", result));
      }
    );

    // global error handling
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
