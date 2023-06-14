const express = require('express');
const cors = require('cors');
require('dotenv').config()

const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())



const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res
            .status(401)
            .send({ error: true, message: "Unauthorized Access" });
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res
                .status(401)
                .send({ error: true, message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
    });
};




app.get('/', (req, res) => {
    res.send('summer camp is running')
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uekqjhq.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
});

async function run() {

    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect((error) => {
            if (error) {
                console.error(error);
                return;
            }
        });


        //classes collection
        const classesCollection = client.db("summerCamp").collection("classes")
        // user collection
        const usersCollection = client.db("summerCamp").collection("users")

        app.get("/instructor", async (req, res) => {
            const result = await usersCollection
                .find({ role: "instructor" })
                .toArray();
            res.send(result);
        });
        //classes
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)
        })
        app.get('/popular', async (req, res) => {
            const result = await classesCollection.find().limit(6).toArray()
            res.send(result)
        })

        //admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const quarry = {
                email: email
            }
            const user = await usersCollection.findOne(quarry)
            if (user?.role === "admin") {
                res.send({
                    admin: true
                })
            }
            else {
                res.send({
                    admin: false
                })
            }
        })
        //instructor
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email
            const quarry = {
                email: email
            }
            const user = await usersCollection.findOne(quarry)
            if (user?.role === "instructor") {
                res.send({
                    instructor: true
                })
            }
            else {
                res.send({
                    instructor: false
                })
            }
        })


        app.get("/users", verifyJwt, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });


        app.get("/classes/:email", async (req, res) => {
            const email = req.params.email;
            const query = { instructorEmail: email };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        });



        app.get("/approved", async (req, res) => {
            const result = await classesCollection
                .find({ status: "approved" })
                .toArray();
            res.send(result);
        });


        app.get("/classes/:id", async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = {
                _id: new ObjectId(id)
            }
            const result = await classesCollection.findOne(query)
            res.send(result)
        })


        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h",
            });
            res.send({ token });
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({
                    message: 'Already Existing'
                })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });



        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "admin",
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.patch("/users/instructor/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "instructor",
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });


        app.post("/classes", async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes);
            res.send(result);
        });



        app.patch("/classes/:id", async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const options = { upsert: true };
            const updateClass = req.body;
            const update = {
                $set: {
                    price: updateClass.price,
                    className: updateClass.className,
                    classImage: updateClass.classImage,
                    availableSeat: updateClass.availableSeat,
                },
            };
            const result = await classesCollection.updateOne(filter, update, options);
            res.send(result);
        });





        app.patch("/classes", async (req, res) => {
            const id = req.query.id;
            const status = req.query.status;
            let updatedDoc = {};
            if (status === "approved") {
                updatedDoc = {
                    $set: {
                        status: "approved",
                    },
                };
            }
            const filter = {
                _id: new ObjectId(id)
            };
            const result = await classesCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.listen(port, (res, req) => {
    console.log(`summer camp on fire ${port}`)
})
