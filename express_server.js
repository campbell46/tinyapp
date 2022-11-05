////////////////////////////////////////
// REQUIREMENTS
////////////////////////////////////////
const express = require("express");
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");
const { urlDatabase, users } = require("./database");
const methodOverride = require('method-override');

////////////////////////////////////////
// CONFIGURATION
////////////////////////////////////////
const app = express();
const PORT = 8080; //default port 8080

app.set("view engine", "ejs");

////////////////////////////////////////
// MIDDLEWARE
////////////////////////////////////////
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['key', 'key2'],
}));
app.use(methodOverride('_method'));

////////////////////////////////////////
// GET - ROUTE HANDLER
////////////////////////////////////////
//redirect to url page if logged in
app.get("/", (req, res) => {
  const userID = req.session['user_id'];

  if (!userID) { //user not logged in
    return res.redirect("/login");
  }
  res.redirect("/urls");
});

//render index page displaying users urls
app.get("/urls", (req, res) => {
  const user = req.session['user_id'];
  const templateVars = { user: users[user], urls: urlsForUser(user, urlDatabase) };
  
  if (!templateVars.user) { //user not logged in
    return res.status(401).send("<html><body><h3>Error: Must be logged in to view URL's</h3></body></html>");
  }

  res.render("urls_index", templateVars);
});

//render new url template
app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session['user_id']] };

  if (!templateVars.user) { ////user not logged in
    return res.redirect("/login");
  }

  res.render("urls_new", templateVars);
});

//render url id page
app.get("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  const user = users[req.session['user_id']];
  const templateVars = { user: user, id: siteID, urls: urlDatabase[siteID] };


  if (!user) { //user not logged in
    return res.status(401).send("<html><body><h3>Error: Must be logged in to view URL's</h3></body></html>");
  }

  if (!urlDatabase[siteID]) { //url is not in database
    return res.status(404).send("<html><body><h3>Error: URL does not exist</h3></body></html>");
  }

  if (templateVars.user.id !== urlDatabase[siteID].userID) { //not users url
    return res.status(403).send("<html><body><h3>Error: This URL does not belong to you</h3></body></html>");
  }

  res.render("urls_show", templateVars);
});

//redirect to external url page
app.get("/u/:id", (req, res) => {
  const siteID = req.params.id;
  let longURL = urlDatabase[siteID].longURL;

  if (!urlDatabase[siteID].longURL.startsWith("http://") || !urlDatabase[siteID].longURL.startsWith("https://")) {
    longURL = `https://${longURL}`;
  }

  if (!urlDatabase[siteID]) { //url not in database
    return res.status(404).send("<html><body><h3>Error: URL does not exist</h3></body></html>");
  }

  res.redirect(longURL);
});

//render login template, redirect to urls if logged in
app.get("/login", (req, res) => {
  const userID = req.session['user_id'];
  const templateVars = { user: userID, session: req.session  };

  if (userID) {
    return res.redirect("/urls");
  }

  res.render("user_login", templateVars);
});

//render registration template, redirect to urls if logged in
app.get('/register', (req, res) => {
  const templateVars = { user: users[req.session['user_id']], sessions: req.sessions };
  
  if (req.session['user_id']) {
    return res.redirect("/urls");
  }

  res.render("user_registration", templateVars);
});

////////////////////////////////////////
// POST - ROUTE HANDLER
////////////////////////////////////////
//create new url, add to url database, redirect to short url page
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const id = req.session['user_id'];

  if (!id || id === undefined) { //user not logged in
    return res.status(401).send("<html><body><h3>Error: Must be logged in to shorten URL's</h3></body></html>");
  }
  
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: id };
  res.redirect(`/urls/${shortURL}`);
});

//login to account, verify email is in database, verify password
app.post("/login", (req, res) => {
  const userEmail = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(userEmail, users);

  if (!user) { //email not in database
    return res.status(400).send("<html><body><h3>Error: Email not found</h3></body></html>");
  }

  if (!bcrypt.compareSync(password, user.password)) { //passwords do not match
    return res.status(400).send("<html><body><h3>Error: Password is incorrect</h3></body></html>");
  }
  
  req.session['user_id'] = user.id;
  res.redirect("/urls");
});

//logout and clear session
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

//register an account, add it to user database
app.post('/register', (req, res) => {
  const userID = generateRandomString();
  const userEmail = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (userEmail === "" || password === "") { //blank fields found
    return res.status(400).send("<html><body><h3>Error: Empty field(s), check email and/or password</h3></body></html>");
  }

  if (getUserByEmail(userEmail, users)) { //user already exists
    return res.status(400).send("<html><body><h3>Error: Email already exists</h3></body></html>");
  }
  
  users[userID] = {
    id: userID,
    email: userEmail,
    password: hashedPassword,
  };
  req.session['user_id'] = userID;
  res.redirect("/urls");
});

////////////////////////////////////////
// PUT - ROUTE HANDLER
////////////////////////////////////////
//update long url, redirect to url page
app.put("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  const id = req.session['user_id'];

  if (!id) { //user not logged in
    return res.status(401).send("<html><body><h3>Error: Must be logged in to shorten URL's</h3></body></html>");
  }

  if (!urlDatabase[siteID]) { //url does not exist
    return res.status(404).send("<html><body><h3>Error: URL does not exist</h3></body></html>");
  }

  if (id !== urlDatabase[siteID].userID) { //not users url
    return res.status(403).send("<html><body><h3>Error: This URL does not belong to you</h3></body></html>");
  }

  urlDatabase[siteID].longURL = req.body.longURL;
  res.redirect("/urls");
});

////////////////////////////////////////
// DELETE - ROUTE HANDLER
////////////////////////////////////////
//delete short url from database
app.delete("/urls/:id/delete", (req, res) => {
  const siteID = req.params.id;
  const id = req.session['user_id'];

  if (!urlDatabase[siteID]) { //url does not exist
    return res.status(404).send("<html><body><h3>Error: URL does not exist</h3></body></html>");
  }

  if (!id) { //user not logged in
    return res.status(401).send("<html><body><h3>Error: Must be logged in to delete URL's</h3></body></html>");
  }

  if (id !== urlDatabase[siteID].userID) { //not users url
    return res.status(403).send("<html><body><h3>Error: This URL does not belong to you</h3></body></html>");
  }

  delete urlDatabase[siteID];
  res.redirect("/urls");
});

////////////////////////////////////////
// LISTENER
////////////////////////////////////////
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
