


const router = express.Router();
// Define multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads'); // Define the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  },
});

// Create multer instance with defined storage
const upload = multer({ storage: storage });

// MongoDB connection URL
const mongoURL = 'mongodb://localhost:27017';
const dbName = 'your-database-name';

// Define route to handle form submission
router.post('/add-product', upload.single('media'), async (req, res) => {
  try {
    // Extract product data from request body
    const {
      title,
      description,
      regularPrice,
      taxRate,
      promotionalPrice,
      currency,
      weight,
      stock,
      quantity,
      category,
      subCategory,
      tags,
    } = req.body;

    // Get file path of uploaded media (if any)
    const media = req.file ? req.file.path : null;

    // Connect to MongoDB client
    const client = await mongodb.MongoClient.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Access the database
    const db = client.db(dbName);

    // Access the collection
    const collection = db.collection('products');

    // Insert the product document
    await collection.insertOne({
      title,
      description,
      regularPrice,
      taxRate,
      promotionalPrice,
      currency,
      weight,
      stock,
      quantity,
      category,
      subCategory,
      tags,
      media,
    });

    // Close the connection
    client.close();

    // Send success response
    res.status(201).json({ message: 'Product added successfully' });
  } catch (error) {
    // Send error response
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;