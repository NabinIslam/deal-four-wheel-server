const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lqyancf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function varifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Unauthorized access');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    // collections

    const categoriesCollection = client
      .db('DealFourWheel')
      .collection('categories');
    const usersCollection = client.db('DealFourWheel').collection('users');
    const productsCollection = client
      .db('DealFourWheel')
      .collection('products');
    const bookingsCollection = client
      .db('DealFourWheel')
      .collection('bookings');

    // jwt token

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const user = await usersCollection.findOne({ email: email });
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: '1h',
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: '' });
    });

    // categories api
    app.get('/categories', async (req, res) => {
      const categories = await categoriesCollection.find({}).toArray();
      res.send(categories);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //users api
    app.get('/users', async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    app.put('/user/:id', varifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // users naming convention start

    app.delete('/user/:id', varifyJWT, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    // sellers api
    app.get('/users/sellers', async (req, res) => {
      const sellers = await usersCollection
        .find({ role: { $eq: 'seller' } })
        .toArray();
      res.send(sellers);
    });

    // buyers api

    app.get('/users/buyers', async (req, res) => {
      const buyers = await usersCollection
        .find({ role: { $eq: 'buyer' } })
        .toArray();
      res.send(buyers);
    });

    // single buyer api

    app.get('/user/buyer/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === 'buyer' });
    });

    // single seller api
    app.get('/user/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === 'seller' });
    });

    // admin api

    app.get('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' });
    });

    // users naming convention end

    // products naming convention start

    app.post('/products', varifyJWT, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);

      res.send(result);
    });

    // products api

    app.get('/products', async (req, res) => {
      const products = await productsCollection.find({}).limit(3).toArray();

      res.send(products);
    });

    // category products api

    app.get('/products/:category', async (req, res) => {
      const category = req.params.category;
      const categoryProducts = await productsCollection
        .find({
          category: { $eq: category },
        })
        .toArray();

      res.send(categoryProducts);
    });

    // single user's products api

    app.get('/user/products/:email', async (req, res) => {
      const email = req.params.email;
      const currentUsersProducts = await productsCollection
        .find({ sellerEmail: { $eq: email } })
        .toArray();
      res.send(currentUsersProducts);
    });

    // products naming convention end

    // bookings naming convention start

    app.post('/bookings', varifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // bookings api

    app.get('/bookings', async (req, res) => {
      const bookings = await bookingsCollection.find({}).toArray();
      res.send(bookings);
    });

    // products naming convention end
  } finally {
  }
}

run().catch(err => console.error(err));

app.get('/', async (req, res) => {
  res.send('DealFourWheel server is running');
});

app.listen(port, () =>
  console.log(`DealFourWheel server is running on port:${port}`)
);
