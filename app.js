var express = require('express');
var app = express();


// Serve static files from the "public" directory
app.use(express.static('.'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(3000, function() {
    console.log('Your app is listening on port 3000');
});
