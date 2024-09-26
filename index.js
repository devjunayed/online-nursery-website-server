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
        page = 0,
        limit = 10,
        search = "",
        category,
        rating,
        sortBy = "",
        sortOrder = "asc",
      } = req.query;

      let query = {};

      try {
        // Filter by ID
        if (id) {
          query._id = new ObjectId(id);
        }

        // Filter by category
        if (category) {
          query.category = category;
        }

        // Filter by rating
        if (rating) {
          query.rating = rating;
        }

        // Search functionality (search by name or description)
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        // Pagination parameters
        page = parseInt(page);
        limit = parseInt(limit);

        // Determine sorting order (1 for ascending, -1 for descending)
        const sortDirection = sortOrder === "desc" ? -1 : 1;

        // Sort logic
        let sort = {};
        if (sortBy === "title") {
          sort.title = sortDirection;
        } else if (sortBy === "price") {
          sort.price = sortDirection;
        }

        // Total products count
        const lengthOfProducts =
          await productCollection.estimatedDocumentCount();

        // Fetch products with query, sort, and pagination
        const result = await productCollection
          .find(query)
          .sort(sort)
          .skip(page * limit)
          .limit(limit)
          .toArray();

        // Send response
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
        // Finding the product in the product collection
        const productInTheBackend = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!productInTheBackend) {
          return res.json(sendResponse(false, "Product not found", ""));
        }

        // Checking if we have sufficient quantity of products
        if (
          Number(productInTheBackend.quantity) < Number(data.quantity) ||
          Number(data.quantity) <= 0
        ) {
          return res.send(sendResponse(false, "Insufficient quantity", []));
        }

        // Check if the product is already in the cart
        const cartResult = await cartCollection.findOne({
          productId: new ObjectId(id),
        });

        // If product is already in the cart, update the quantity
        if (cartResult) {
          data.quantity = (
            Number(data.quantity) + Number(cartResult.quantity)
          ).toString();

          // Update the cart quantity
          const updateResult = await cartCollection.updateOne(
            { _id: new ObjectId(cartResult._id) },
            { $set: data }
          );

          return res.send(
            sendResponse(true, "Cart updated successfully", updateResult)
          );
        }

        // If product is not in the cart, insert it
        data.productId = new ObjectId(id);

        // Update the stock
        await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: productInTheBackend }
        );

        const result = await cartCollection.insertOne(data);
        return res.send(
          sendResponse(true, "Cart created successfully", result)
        );
      } catch (error) {
        console.log(error);
        return res.json(sendResponse(false, "Failed to create cart", error));
      }
    });

    // Get all cart
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

    // Delete cart
    app.delete("/cart/:id", async (req, res) => {
      try {
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(sendResponse(true, "Cart deleted successfully", result));
      } catch (err) {
        res
          .status(500)
          .send(sendResponse(false, "Error deleting cart", err.message));
      }
    });

    /*================================================
                      Order
    =================================================*/
    app.post("/order", async (req, res) => {
      const { name, phone, address, grandTotal, data } = req.body;
    
      if (
        !name ||
        !phone ||
        !address ||
        !grandTotal ||
        !data ||
        data.length === 0
      ) {
        return res
          .status(400)
          .json(sendResponse(false, "Invalid order data", null));
      }
    
      try {
        // Array to store failed product updates
        const failedUpdates = [];
    
        // Loop through each product in the order
        for (const item of data) {
          const productId = item.productId;
          const orderedQuantity = Number(item.quantity);
    
          // Fetch product from database
          const productInDb = await productCollection.findOne({
            _id: new ObjectId(productId),
          });
    
          if (!productInDb) {
            failedUpdates.push({ productId, message: "Product not found" });
            continue;
          }
    
          // Check if the stock is sufficient
          if (Number(productInDb.quantity) < orderedQuantity) {
            failedUpdates.push({
              productId,
              message: "Insufficient stock for product",
            });
            continue;
          }
    
          // Deduct the quantity from the product stock
          await productCollection.updateOne(
            { _id: new ObjectId(productId) },
            { $set: { quantity: productInDb.quantity - orderedQuantity } }
          );
        }
    
        // If there are failed updates, respond with errors
        if (failedUpdates.length > 0) {
          return res.status(400).json(
            sendResponse(false, "Some products could not be processed", {
              failedUpdates,
            })
          );
        }
    
        // After processing, create an order in the database
        const orderData = {
          name,
          phone,
          address,
          grandTotal,
          orderedAt: new Date(),
          products: data,
        };
    
        // Insert the order into a new 'orders' collection
        const orderResult = await client
          .db("nursery")
          .collection("orders")
          .insertOne(orderData);
    
        // Clear the cart after successfully placing the order
        const deleteCart = await cartCollection.deleteMany({});
    
        res.send(
          sendResponse(true, "Order placed successfully", {
            ...orderResult,
            ...orderData,
          })
        );
      } catch (error) {
        console.error("Error placing order:", error);
        res
          .status(500)
          .json(sendResponse(false, "Failed to place order", error));
      }
    });
    

    // Global error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        message: "Something went wrong!",
        error: err.message,
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
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Start the server on the specified port
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on http://localhost:${process.env.PORT}`);
});
