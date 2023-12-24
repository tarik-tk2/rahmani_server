const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASSWORD
const is_live = false //true for live, false for sandbox
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


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

      const database =  client.db("rahmani_noor");
      const productCollection =  database.collection('products');
      const addressCollection = database.collection("customer_address");
      app.get("/", (req, res) => {
        res.send("server is running ");
      });
      app.get('/products', async (req, res) => { 
          const products = await productCollection.find().toArray();
          res.send(products)
      })
    
    app.get("/customer/checkout", async(req, res) => {
      const data = {
        total_amount: 100,
        currency: "BDT",
        tran_id: "REF123", // use unique tran_id for each api call
        success_url: "http://localhost:3030/success",
        fail_url: "http://localhost:3030/fail",
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = await new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then(async(apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL =await apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
      });
    });

    app.post("/customer/profile/address/:id", async (req, res) => {
      const reqBody = req.body;
      const result = await addressCollection.insertOne(reqBody);
      res.send(result);
    });
    app.put("/customer/profile/address/:id", async (req, res) => {
      const getId = req.params.id;
      const options = { upsert: true };
      const filter = { _id: getId }
      console.log(getId)
      const updateDoc = req.body;
      const result = await addressCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.get("/customer/profile/address/:id", async (req, res) => { 
      const getId = req.params.id;
      console.log(getId);
      const query = { _id: getId };
      
      const address = await addressCollection.findOne(query);
      console.log(address);
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
