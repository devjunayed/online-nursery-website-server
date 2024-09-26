import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express, { query } from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendResponse from "./utils.js"; // Assume sendResponse is a utility for sending responses

dotenv.config();

const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://online-nursery-website-client-henna.vercel.app",
    ],
  })
);
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
    const cartCollection = client.db("nursery").collection("cart");

    /*=====================================
                Products
    ========================================*/
    // Create Product Endpoint
    app.post("/products", async (req, res) => {
      const data = req.body;

      console.log(data);
      if (!data || Object.keys(data).length === 0) {
        return res.json(sendResponse(false, "Failed to insert data", ""));
      }

      try {
        const result = await productCollection.insertOne(data);
        res.send(
          sendResponse(true, "Product created successfully", {
            ...result,
            ...data,
          })
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error creating product", err.message));
      }
    });

    // Get all products
    app.get("/products", async (req, res) => {
      let {
        id,
        page = "",
        limit = "",
        search = "",
        category,
        rating,
      } = req.query;
      let query = {};

      try {
        if (id) {
          query._id = new ObjectId(id);
        }

        if (category) {
          query.category = category;
        }

        if (rating) {
          query.rating = rating;
        }

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        page = parseInt(page);
        limit = parseInt(limit);

        const lengthOfProducts =
          await productCollection.estimatedDocumentCount();

        const result = await productCollection
          .find(query)
          .skip(page * limit)
          .limit(limit)
          .toArray();

        res.send(
          sendResponse(
            true,
            "All products retrieved successfully",
            result,
            lengthOfProducts
          )
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error retrieving products", err.message));
      }
    });

    // Get single product by ID
    app.get("/products/:id", async (req, res) => {
      try {
        const result = await productCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(sendResponse(true, "Product retrieved successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error retrieving product", err.message));
      }
    });

    // Delete product
    app.delete("/products/:id", async (req, res) => {
      try {
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
      try {
        const newData = req.body;
        const result = await productCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: newData }
        );
        res.send(sendResponse(true, "Product updated successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error updating product", err.message));
      }
    });

    /*================================================
                      Category
      =================================================*/
    // Create category endpoint
    app.post("/category", async (req, res) => {
      const data = req.body;

      if (!data || Object.keys(data).length === 0) {
        return res.json(sendResponse(false, "Failed to insert data", ""));
      }

      try {
        const result = await categoryCollection.insertOne(data);
        return res.send(
          sendResponse(true, "Category created successfully", result)
        );
      } catch (error) {
        return res.json(
          sendResponse(false, "Failed to create category", error)
        );
      }
    });

    // Get all categories
    app.get("/category", async (req, res) => {
      try {
        const result = await categoryCollection.find().toArray();
        res.send(
          sendResponse(true, "All categories retrieved successfully", result)
        );
      } catch (err) {
        res
          .status(500)
          .send(
            sendResponse(false, "Error retrieving categories", err.message)
          );
      }
    });

    // Delete category
    app.delete("/category/:id", async (req, res) => {
      try {
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

    // Update category
    app.patch("/category/:id", async (req, res) => {
      try {
        const newData = req.body;

        if (!newData || Object.keys(newData).length === 0) {
          return res.json(sendResponse(false, "Failed to insert data", ""));
        }
        const result = await categoryCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: newData },
          { upsert: true }
        );
        res.send(
          sendResponse(true, "Category updated successfully", {
            ...result,
            ...newData,
          })
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error updating category", err.message));
      }
    });
    /*================================================
                      Cart
      =================================================*/
    // Create cart endpoint
    app.post("/cart", async (req, res) => {
      const data = req.body;
      const id = `${data._id}`;
      delete data._id;


      if (!data || Object.keys(data).length === 0) {
        return res.json(sendResponse(false, "Failed to insert data", ""));
      }

      try {
        // finding the product in product collection
        const productInTheBackend = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        // checking wheater we have sufficent amount of products
        if (
          Number(productInTheBackend.quantity) < Number(data.quantity) ||
          Number(data.quantity) <= 0
        ) {
          return res.send(sendResponse(false, "Insufficient amount", []));
        }

        // setting new product quantity in the product collection
        productInTheBackend.quantity = (
          productInTheBackend.quantity - data.quantity
        ).toString();

        const cartResult = await cartCollection.findOne({
          productId: new ObjectId(id),
        });
        // updating cart quantity of products if alreadin in the cart
        if (Object.keys(cartResult).length > 0) {
          data.quantity = (
            Number(data.quantity) + Number(cartResult.quantity)
          ).toString();

          // finally updating the quantity
          const updateResult = await cartCollection.updateOne(
            { _id: new ObjectId(cartResult._id) },
            {$set: data}
          );


          // updating stock
          await productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: productInTheBackend }
          );
          return res.send(
            sendResponse(true, "Cart created successfully", updateResult)
          );
        }

        data.productId = new ObjectId(id);

        // updating stock
        await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: productInTheBackend }
        );

        const result = await cartCollection.insertOne(data);
        return res.send(
          sendResponse(true, "Cart created successfully", result)
        );
      } catch (error) {
        console.log(error)
        return res.json(sendResponse(false, "Failed  to create cart", error));
      }
    });

    // Get all categories
    app.get("/cart", async (req, res) => {
      try {
        const result = await cartCollection.find().toArray();
        res.send(sendResponse(true, "All cart retrieved successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error retrieving cart", err.message));
      }
    });

    // Delete category
    app.delete("/category/:id", async (req, res) => {
      try {
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

    // Update category
    app.patch("/category/:id", async (req, res) => {
      try {
        const newData = req.body;

        if (!newData || Object.keys(newData).length === 0) {
          return res.json(sendResponse(false, "Failed to insert data", ""));
        }
        const result = await categoryCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: newData },
          { upsert: true }
        );
        res.send(
          sendResponse(true, "Category updated successfully", {
            ...result,
            ...newData,
          })
        );
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error updating category", err.message));
      }
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
  } catch (err) {
    console.error("Failed to run the server:", err.message);
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

// Handle unhandled promise rejections and uncaught exceptions globally
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  // You can log the error or send a response, but the server will continue running
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // The server won't crash from uncaught exceptions
});

// Start the server on the specified port
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on http://localhost:${process.env.PORT}`);
});
