import express from "express";
import { nanoid } from "nanoid";
import { client, openai } from "../mongodb.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();
const dateVar = JSON.stringify(new Date());
const result = dateVar.slice(0, 11);
const db = client.db("crudDB");
const dbCollection = db.collection("posts");

let posts = [
  {
    id: "12345",
    title: "abc post title",
    text: "some post text",
  },
];

router.get("/post/:postId", (req, res, next) => {
  res.send("This is post " + new Date());
});

router.get("/posts", async (req, res, next) => {
  const allPosts = dbCollection.find({}).sort({ _id: -1 });
  const allPostsIntoArray = await allPosts.toArray();
  console.log("allPostsIntoArray :", allPostsIntoArray);

  res.send(allPostsIntoArray);
});

router.post("/post", async (req, res, next) => {
  if (!req.body.title || !req.body.text) {
    res.status(403).send(`Required parameter missing`);
    return;
  }
  // posts.unshift({ id: nanoid(), title: req.body.title, text: req.body.text });
  let postMaterial = await dbCollection.insertOne({
    id: nanoid(),
    title: req.body.title,
    text: req.body.text,
  });
  console.log("insertResponse: ", postMaterial);

  res.send(`Post Created at ${result}`);
});

router.put("/post/:postId", async (req, res, next) => {
  const id = req.params.postId;
  if (!ObjectId.isValid(id)) {
    res.status(403).send(`Invalid post id`);
    return;
  }
  if (!req.body.title || !req.body.text) {
    res.status(403).send(`Required parameter missing`);
    return;
  }
  let updatedData = {};
  if (req.body.title) {
    updatedData.title = req.body.title;
  }
  if (req.body.text) {
    updatedData.text = req.body.text;
  }

  try {
    const updatedResponse = await dbCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updatedData,
      }
    );
    res.send("Post Updated Successfully");
  } catch (error) {
    res.status(500).send("server error, please try later");
  }
  console.log(id);
});

router.delete("/post/:postId", async (req, res, next) => {
  const id = req.params.postId;
  try {
    await dbCollection.deleteOne({ _id: new ObjectId(id) });
    res.send("Post Deleted Successfully");
  } catch (error) {
    res.status(404).send("Not Found");
  }
});

router.get("/search", async (req, res) => {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: req.query.q,
    });
    const vector = response?.data[0]?.embedding;
    console.log("vector: ", vector);
    // [ 0.0023063174, -0.009358601, 0.01578391, ... , 0.01678391, ]

    // Query for similar documents.
    const documents = await dbCollection
      .aggregate([
        {
          $search: {
            index: "default",
            knnBeta: {
              vector: vector,
              path: "embedding",
              k: 10, // number of documents
            },
            scoreDetails: true,
          },
        },
        {
          $project: {
            embedding: 0,
            score: { $meta: "searchScore" },
            scoreDetails: { $meta: "searchScoreDetails" },
          },
        },
      ])
      .toArray();

    // documents.map((eachMatch) => {
    //   console.log(
    //     `score ${eachMatch?.score?.toFixed(3)} => ${JSON.stringify(
    //       eachMatch
    //     )}\n\n`
    //   );
    // });
    console.log(`${documents.length} records found `);

    res.send(documents);
  } catch (e) {
    console.log("error getting data mongodb: ", e);
    res.status(500).send("server error, please try later");
  }
});

export default router;
