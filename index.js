const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const SSLCommerzPayment = require("sslcommerz-lts");
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox
const port = process.env.PORT || 5000;
const { ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
// const directory = path.join(__dirname, "utils/uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ dest: "uploads/" });
// const upload = multer({ storage: storage });

const corsOptions = {
  origin: "https://rahmani.onrender.com/",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.b6dwlgl.mongodb.net/?retryWrites=true&w=majority`;

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

    const database = client.db("rahmani_noor");
    const productCollection = database.collection("products");
    const addressCollection = database.collection("customer_address");
    const profileCollection = database.collection("profile");
    const userCollection = database.collection("user");
    const offerCollection = database.collection("offer");
    const orderCollection = database.collection("order");

    app.get("/", (req, res) => {
      res.send("server is running ");
    });
    //upload product
    app.post("/products", upload.single("media"), async (req, res) => {
      try {
        const {
          title,
          description,
          regularPrice,
          promotionalPrice,
          currency,
          weight,
          stock,
          category,
        } = req.body;

        // Handle file upload
        const img = req.file.filename;

        // Save product data to the database
        const product = await productCollection.insertOne({
          title,
          description,
          regularPrice,
          promotionalPrice,
          currency,
          weight,
          stock,
          category,
          img, // Assuming "uploads" is your static directory
        });

        res.send(product);
      } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    //get single product
    app.get("/product/:id", async (req, res) => {
      const query = {
        _id: new ObjectId(req.params.id),
      };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    //get all products
    app.get("/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });
    //get offer
    app.get("/offer", async (req, res) => {
      const offers = await offerCollection.find().toArray();
      res.send(offers);
    });

    // order
    app.post("/customer/order/", async (req, res) => {
      const userOrder = req.body;
      console.log(userOrder);
    });

    //singleOrder get
    // app.get("/customer/order/:uid/:tra_id", async (req, res) => {
    //   try {
    //     const uid = req.params.uid;
    //     const query = {
    //       user_id: uid,
    //     };
    //     const trans_id = req.params.tra_id;

    //     const allOrderByUser = await orderCollection.find(query).toArray();
    //     const findOrder = allOrderByUser.find(
    //       (order) => parseInt(order.trisection_id) === parseInt(trans_id)
    //     );

    //     if (findOrder) {
    //       res.status(200).json(" Order Found ");
    //     } else {
    //       res.status(400).json("Error!Order not found!");
    //     }
    //   } catch (error) {
    //     res.status(500).json(" 500 Error ! Internal server Error occurrence. ");
    //   }
    // });
    // oreder checkout post
    app.post("/customer/checkout/cash/:uid", async (req, res) => {
      const trainId = new ObjectId().toString();
      const userId = req.params.uid;
      const user_order = req.body;

      const finalOrder = {
        user_order,
        paid_status: false,
        trisection_id: parseInt(trainId, 16) % 1000000,
        user_id: userId,
        delivered: false,
        order_status: true,
        accepted: false,
        processing: false,
        packaging: false,
        shipping: false,
        delivered: false,
        // deliveredDate: null,      
        timestamp: new Date().toISOString(),
      
      };
      const result = orderCollection.insertOne(finalOrder);

      if (result) {
        res.send({
          url: `https://rahamani-noor.web.app/customer/order/success/${trainId}`,
        });
      }
    });
    // ssl eccomerce post
    app.post("/customer/checkout", async (req, res) => {
      const trainId = new ObjectId().toString();
      const user_order = await req.body;
      console.log(req.body);
      const data = {
        total_amount: user_order.paidPrice,
        currency: "BDT",
        tran_id: trainId, // use unique tran_id for each api call
        success_url: `http://localhost:5000/customer/order/success/${trainId}`,
        fail_url: "http://localhost:3030/fail",
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: user_order.fullName,
        cus_email: user_order.email,
        cus_add1: "Dhaka",
        cus_add2: user_order.province,
        cus_city: user_order.city,
        cus_state: user_order.area,
        cus_postcode: " 1000",
        cus_country: "Bangladesh",
        cus_phone: user_order.mobileNumber,
        cus_fax: "01711111111",
        ship_name: user_order.fullName,
        ship_add1: "Dhaka",
        ship_add2: user_order.province,
        ship_city: user_order.city,
        ship_state: user_order.area,
        ship_postcode: "1000",
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

      try {
        const apiResponse = await sslcz.init(data);
        let GatewayPageURL = await apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
        const finalOrder = {
          user_order,
          paid_status: false,
          trisection_id: trainId,
        };
        const result = orderCollection.insertOne(finalOrder);
      } catch (error) {
        console.error("Error initializing payment:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    // order success
    app.post("/customer/order/success/:trainId", async (req, res) => {
      const result = await orderCollection.updateOne(
        {
          trisection_id: req.params.trainId,
        },
        {
          $set: {
            paid_status: true,
          },
        }
      );
      if (result.modifiedCount > 0) {
        res.redirect(
          `http://127.0.0.1:5173/customer/order/success/${req.params.trainId}`
        );
      }
    });
    // user base order track
    app.get("/customer/order/track/:uid", async (req, res) => {
      console.log(req.params.uid)
      const userId = req.params.uid;
      const query = {
        user_id: userId,
      };
      const allOrders = await orderCollection
        .find(query)
        .sort({ timestamp:-1 })
        .toArray();
      res.send(allOrders);
    });
    
    // track cancellation

    app.put("/customer/order/track/:train_id", async (req, res) => {
      const requestedId = req.params.train_id;
      const filter = {
        _id: new ObjectId(requestedId),
      };
      const options = {
        upsert: true,
      };
      const updateDoc = {
        $set: req.body,
      };
      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    //all order
    app.get("/admin/all/order", async (req, res) => {
      const allOrder = await orderCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(allOrder);
    });

    // order accepted
    app.put("/admin/accept/:order_id", async (req, res) => {
      try {
        const requestedId = req.params.order_id; // Get the order ID from the URL params
        const query = {
          _id: new ObjectId(requestedId),
        };

        const update = {
          $set: {
            accepted: true, // Set accepted status to true
            processing: true,
            packaging: true,
          },
        };

        const result = await orderCollection.updateOne(query, update);

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Order accepted successfully " });
        } else {
          res.status(404).json({ message: "Order not found " });
        }
      } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // delivered and paid
    app.put("/admin/delivered/:order_id", async (req, res) => {
      try {
        const requestedId = req.params.order_id; // Get the order ID from the URL params
        const query = {
          _id: new ObjectId(requestedId),
        };

        const update = {
          $set: {
            delivered: true, // Set de status to true
            deliveredDate: new Date().toLocaleString(),
          },
        };

        const result = await orderCollection.updateOne(query, update);

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Order accepted successfully" });
        } else {
          res.status(404).json({ message: "Order not found" });
        }
      } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
  
    //paid 
     app.put("/admin/paid/:order_id", async (req, res) => {
       try {
         const requestedId = req.params.order_id; // Get the order ID from the URL params
         const query = {
           _id: new ObjectId(requestedId),
         };

         const update = {
           $set: {
             paid_status: true, // Set paid status to true
           },
         };

         const result = await orderCollection.updateOne(query, update);

         if (result.modifiedCount > 0) {
           res.status(200).json({ message: "Order accepted successfully" });
         } else {
           res.status(404).json({ message: "Order not found" });
         }
       } catch (error) {
         console.error("Error updating order:", error);
         res.status(500).json({ message: "Internal server error" });
       }
     });
    //order delete by admin
    app.delete("/admin/order/:order_id", async (req, res) => {
      try {
        const requestedId = req.params.order_id;
        const query = {
          _id: new ObjectId(requestedId),
        };
        const result = await orderCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "successfully Deleted" });
        } else {
          res.status(400).json({ message: "Order not found" });
        }
      } catch (error) {
        console.log("Error in Deleting", error);
        res.status(500).json({ message: "Internal server is erroring" });
      }
    });

    app.get("/user/:id", async (req, res) => {
      const userId = req.params.id;
      const query = { _id: userId };
      const users = await userCollection.findOne(query);
      res.send(users);
    });
    app.post("/user/:id", async (req, res) => {
      const user = req.body;
      console.log(user);
      const insertedData = await userCollection.insertOne(user);
      res.send(insertedData);
    });
    app.put("/user/:id", async (req, res) => {
      const userID = req.params.id;

      const filter = { _id: userID };
      const options = { upsert: true };

      const updateDoc = {
        $set: req.body,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    //address
    app.post("/customer/profile/address/:id", async (req, res) => {
      const userAddress = req.body;
      const result = await addressCollection.insertOne(userAddress);
      res.send(result);
    });
    app.put("/customer/profile/address/:id", async (req, res) => {
      const getId = req.params.id;
      const options = { upsert: true };
      const filter = { _id: getId };
      console.log(getId);
      const updateDoc = { $set: req.body };
      const result = await addressCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.get("/customer/profile/address/:id", async (req, res) => {
      const getId = req.params.id;
      console.log(getId);
      const query = { _id: getId };
      const address = await addressCollection.findOne(query);

      res.send(address);
    });
  } finally {
    
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("listening on port " + port);
});
