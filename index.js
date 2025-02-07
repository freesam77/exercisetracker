const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const { MongoClient, ObjectId } = require('mongodb');
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.DB_URL);
client.connect();
const db = client.db("exercisetracker");
const usersCollection = db.collection("users");
const exercisesCollection = db.collection("exercises");


app.use(cors());
app.use(express.urlencoded({ extended: true }))

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// ✅ CREATE A NEW USER
app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  const result = await usersCollection.insertOne({ username });
  res.json({ username, _id: result.insertedId });
});

// ✅ GET ALL USERS
app.get("/api/users", async (req, res) => {
  const users = await usersCollection.find({}).project({ username: 1, _id: 1 }).toArray();
  res.json(users);
});


// ✅ ADD AN EXERCISE
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration)
    return res.status(400).json({ error: "Description and duration are required" });

  const user = await usersCollection.findOne({ _id: new ObjectId(_id) });
  if (!user) return res.status(404).json({ error: "User not found" });

  const exercise = {
    userId: _id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date(),
  };

  await exercisesCollection.insertOne(exercise);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
    _id,
  });
});

// ✅ GET USER'S EXERCISE LOG
app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const user = await usersCollection.findOne({ _id: new ObjectId(_id) });
  if (!user) return res.status(404).json({ error: "User not found" });

  let query = { userId: _id };

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  let exercises = await exercisesCollection
    .find(query)
    .sort({ date: 1 })
    .limit(parseInt(limit) || 0)
    .toArray();

  res.json({
    username: user.username,
    count: exercises.length,
    _id,
    log: exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    })),
  });
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
