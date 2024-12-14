const express = require("express");
const axios = require("axios");
const path = require("path");
const readline = require("readline");
const bodyParser = require("body-parser"); /* To handle post parameters */
const { MongoClient, ServerApiVersion } = require('mongodb');

require("dotenv").config({ path: path.resolve(__dirname, './.env') })
const portNumber = process.env.PORT || 3001;

const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.sn6bc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function insertCommand(client, databaseAndCollection, application) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(application);
}


const app = express();

app.set("views", path.resolve(__dirname, "build/templates"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('build/css'))

let language_dictionary = {
    "C#" : 1,
    "F#" : 3,
    "Java" : 4,
    "Python" : 5,
    "C (gcc)" : 6,
    "C++ (gcc)" : 7,
    "Php" : 8,
    "Haskell" : 11,
    "Ruby" : 12,
    "Perl" : 13,
    "Lua" : 14,
    "Nasm" : 15,
    "Javascript" : 17,
    "Go" : 20,
    "Scala" : 21,
    "D" : 30,
    "Swift" : 37,
    "Bash" : 38,
    "Erlang" : 40,
    "Elixir" : 41,
    "Ocaml" : 42,
    "Kotlin" : 43,
    "Rust" : 46,
    "Clojure" : 47,
    "ATS" : 48,
    "Cobol" : 49,
    "Coffeescript" : 50,
    "Crystal" : 51,
    "Elm" : 52,
    "Groovy" : 53,
    "Idris" : 54,
    "Julia" : 55,
    "Mercury" : 56,
    "Nim" : 57,
    "Nix" : 58,
    "Raku" : 59,
    "TypeScript" : 60,
};

app.get("/", (req, res) => {
    res.render("index", {});
});

app.get("/compiler", (req, res) => {
    if (typeof app.locals.username == 'undefined' || typeof app.locals.api_key == 'undefined') {
        app.locals.username = req.query.username;
        app.locals.api_key = req.query.api_key;
    }
    console.log(app.locals.username, app.locals.api_key);
    res.render("compiler", { output: "" });
});

app.post("/compiler", async (req, res) => {
    let { code, language } = req.body;

    var options = {
        method: 'POST',
        url: 'https://code-compiler.p.rapidapi.com/v2',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-rapidapi-host': 'code-compiler.p.rapidapi.com',
            'x-rapidapi-key': req.app.locals.api_key
        },
        data: { LanguageChoice: language_dictionary[language], Program: code }
    };

    axios.request(options).then(async function(response) {
        let data = response.data;
        console.log(data);

        let command = {
            username: req.app.locals.username,
            language: language,
            command: code,
            result: data.Result
        }

        try {
            await client.connect();
            await insertCommand(client, databaseAndCollection, command);
        } catch (e) {
            console.log(e);
        } finally {
            await client.close();
        }

        let params = { output: data.Result };
        res.render("compiler", params);
    }).catch(function(error) {
        console.error(error);
    });
});

app.get("/history", async (req,res) => {
    let result;
    let found = false;

    try {
        await client.connect();
        let filter = {username:req.app.locals.username};
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        
        result = await cursor.toArray();
        found = await cursor.count() > 0;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    let output = "";
    result.forEach(element => {
        output += `<tr><td>${element.language}</td><td>${element.command}</td><td>${element.result}</td></tr>`;
    });

    let params = {history: output};
    res.render("history", params);
});

app.listen(portNumber, () => {
    console.log(`Web server started running at http://localhost:${portNumber}`);
});
