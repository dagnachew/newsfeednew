var express = require("express");
var exphbs = require('express-handlebars');
var mongoose = require("mongoose");
var path = require('path');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

// Initialize Express
var app = express();

var PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.urlencoded({ extended: true }));
// Parse request body as JSON
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set('index', __dirname + '/views');

// Hook mongoose configuration to the db variable
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

//ROUTES

// A GET route for scraping the echoJS website
app.get("/", function (req, res) {
  db.Article.find({ saved: false }, function (err, result) {
      if (err) throw err;
      res.render("index", {result})
  })
});

app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.nytimes.com/section/technology/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div").each(function(i, element) {
      // Save an empty result object
      var result = {};
      var link = "https://www.nytimes.com/";

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
      .children("h2")
      .text()
      .trim()
      result.link = link + $(this)
      .children("h2")
      .find("a")
      .attr("href");
      result.summary = $(this)
      .find("p")
      .text()
      .trim();

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// get article by ObjectId
app.get('/articles/:id', function(req, res) {
  db.Article.findOne({ _id: req.params.id })
  .then(function(dbArticle) {
      res.json(dbArticle);
  })
  .catch(function(err) {
      res.json(err);
  });
});

// Save Article
app.post('/save/:id', function(req, res) {
  db.Article.findByIdAndUpdate(req.params.id, {
      $set: { saved: true}
      },
      { new: true },
      function(error, result) {
          if (error) {
              console.log(error);
          } else {
              res.redirect('/');
          }
      });
});

// get saved articles
app.get("/saved", function (req, res) {
  var savedArticles = [];
  db.Article.find({ saved: true }, function (err, saved) {
      if (err) throw err;
      savedArticles.push(saved)
      res.render("saved", { saved })
  })
});

// delete Article
app.post('/delete/:id', function(req, res) {
  db.Article.findByIdAndUpdate(req.params.id, {
      $set: { saved: false, deleted: true}
      
      },
      { new: true },
      function(error, result) {
          if (error) {
              console.log(error);
          } else {
              res.redirect('/saved');
          }
      });
});

app.post("/notes/save/:id", function (req, res) {
  // Create a new note 
  var newNote = new Note({
      body: req.body.text,
      article: req.params.id
  });

  // Save note to db
  newNote.save(function (error, note) {
      if (error) {
        console.log(error);
      }
      else {
        Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
          .exec(function (err) {
              if (err) {
                  console.log(err);
                  res.send(err);
              }
              else {
                  res.send(note);
              }
          });
      }
  });
});

// Server Listening
app.listen(PORT, function() {
    console.log("App running on port " + PORT);
  });