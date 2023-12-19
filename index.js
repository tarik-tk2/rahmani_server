const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

console.log(process.env.DB_PASSWORD);
console.log(process.env.DB_NAME);

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
      app.get("/", (req, res) => {
        res.send("server is running ");
      });
      app.get('/products', async (req, res) => { 
          const products = await productCollection.find().toArray();
          res.send(products)
      })
    
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log("listening on port " + port);
});
