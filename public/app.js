
// Grab the articles as a json
$.getJSON("/articles", function(data) {
  // For each one
  for (var i = 0; i < data.length; i++) {
    // Display the apropos information on the page
    $("#articles").append("<p data-id='" + data[i]._id + "'>" + data[i].title + "<br />" + data[i].link + "</p>");
  }
});


// Perform new scrape on button click
$("#scrape").on("click", function (event) {
  event.preventDefault();
  $.get("/scrape", function (data) {
      location.reload();
  });
});


// Saved articles
$("#savedArticle").on("click", function (event) {
  event.preventDefault();
  let id = $(this).children().val();
  let data = {
      _id: id
  }
  $.ajax("/update/" + id, {
      type: "PUT",
      data: data
  })
  location.reload();
});


// Delete saved articles
$("#delete-article").on("click", function (event) {
  event.preventDefault();
  let id = $(this).children().val();
  let data = {
      _id: id
  }
  $.ajax("/delete/" + id, {
      type: "PUT",
      data: data
  })
  location.reload();
});


//SAVE NOTE
$(".save-btn").on("click", function() {
  var thisId = $(this).attr("data-id");
    $.ajax({
          method: "POST",
          url: "/notes/save/" + thisId,
          data: {
            text: $("#note-Body" + thisId).val()
          }
        }).done(function(data) {
            // Log the response
            console.log(data);
            // Empty note
            $("#note-Body" + thisId).val("");
            $(".modalNote").modal("hide");
            window.location = "/saved"
        });
});