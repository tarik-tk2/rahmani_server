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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); // Define the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  },
});

const upload = multer({ storage: storage });

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

    app.post("/products", upload.single("media"), async (req, res) => {
      const resultData = req.body;
      const media = req.file ? req.file.path : null;
      const products = await productCollection.insertOne(resultData);
      res.send(products);
    });

    app.get("/", (req, res) => {
      res.send("server is running ");
    });
    app.get("/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });
    app.get("/offer", async (req, res) => {
      const offers = await offerCollection.find().toArray();
      res.send(offers);
    });

    app.post("/customer/order/", async (req, res) => {
      const userOrder = req.body;
      console.log(userOrder);
    });
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
        timestamp: new Date().toISOString(),
      };
      const result = orderCollection.insertOne(finalOrder);

      if (result) {
        res.send({
          url: `https://rahamani-noor.web.app/customer/order/success/${trainId}`,
        });
      }
    });

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

    app.get("/customer/order/track/:uid", async (req, res) => {
      const userId = req.params.uid;
      const query = {
        user_id: userId,
      };
      const allOrders = await orderCollection
        .find(query)
        .sort({ timestamp: -1 })
        .toArray();
      res.send(allOrders);
    });
    // track cancellation
    app.put("/customer/order/track/:train_id", async (req, res) => {
      const requestedId = req.params.train_id;

      const filter = {
        _id:new ObjectId (requestedId),
      };
      const options = {
        upsert: true,
      };
      const updateDoc = {
        $set: req.body,
      };

      const result = await orderCollection.updateOne(filter, updateDoc,options);
      res.send(result);
    });
    //user
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
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("listening on port " + port);
});
