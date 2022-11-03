const express = require("express");
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 8080; //default port 8080

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: [ 'key'[0] ]
}));

const urlDatabase = {
  "b2xVn2":  {
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user2RandomID",
  }
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const generateRandomString = () => {
  const randomNum = Math.random().toString(16);
  return randomNum.substring(2, 8);
};

const getUserByEmail = (userEmail) => {
  for (const user in users) {
    if (users[user].email === userEmail) {
      return users[user];
    }
  }
};

const urlsForUser = (user) => {
  const userURLs = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === user) {
      userURLs[url] = urlDatabase[url].longURL;
    }
  }
  return userURLs;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/hello', (req, res) => {
  res.send('<html><body>Hello <b>World</b></body></html>\n');
});

app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.session['user_id']], urls: urlsForUser(req.session['user_id']) };
  
  if (!templateVars.user) {
    return res.send("<html><body><h3>Error 401: Must be logged in to view URL's</h3></body></html>");
  }

  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const id = req.session['user_id'];

  if (!id || id === undefined) {
    return res.send("<html><body><h3>Error 401: Must be logged in to shorten URL's</h3></body></html>");
  }
  
  urlDatabase[shortURL] = { longURL: `http://${ req.body.longURL }`, userID: id };
  res.redirect(`/urls/${shortURL}`);
});
//////////////
app.post("/urls/:id/delete", (req, res) => {
  const siteID = req.params.id;
  const id = req.session['user_id'];

  if (!urlDatabase[siteID]) {
    return res.send("<html><body><h3>Error 401: URL does not exist</h3></body></html>");
  }

  if (!id) {
    return res.send("<html><body><h3>Error 401: Must be logged in to delete URL's</h3></body></html>");
  }

  if (id !== urlDatabase[siteID].userID) {
    return res.send("<html><body><h3>Error 401: This URL does not belong to you</h3></body></html>");
  }

  delete urlDatabase[siteID];
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session['user_id']] };

  if (!templateVars.user) {
    return res.redirect("/login");
  }

  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  const templateVars = { user: users[req.session['user_id']], id: siteID, urls: urlDatabase[siteID] };


  if (!templateVars.user.id) {
    return res.send("<html><body><h3>Error 401: Must be logged in to view URL's</h3></body></html>");
  }

  if (!urlDatabase[siteID]) {
    return res.send("<html><body><h3>Error 404: URL does not exist</h3></body></html>");
  }

  if (templateVars.user.id !== urlDatabase[siteID].userID || !templateVars.user.id) {
    return res.send("<html><body><h3>Error 401: This URL does not belong to you</h3></body></html>");
  }

  res.render("urls_show", templateVars);
});
////////////////////////
app.post("/urls/:id/update", (req, res) => {
  const siteID = req.params.id;
  const id = req.session['user_id'];

  if (!id) {
    return res.send("<html><body><h3>Error 401: Must be logged in to shorten URL's</h3></body></html>");
  }

  if (!urlDatabase[siteID]) {
    return res.send("<html><body><h3>Error 404: URL does not exist</h3></body></html>");
  }

  if (id !== urlDatabase[siteID].userID || !id) {
    return res.send("<html><body><h3>Error 401: This URL does not belong to you</h3></body></html>");
  }

  urlDatabase[siteID].longURL = `http://${req.body.longURL}`;
  res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  const siteID = req.params.id;

  if (!urlDatabase[siteID]) {
    return res.send("<html><body><h3>Error 404: URL does not exist</h3></body></html>");
  }

  const longURL = urlDatabase[siteID].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  const userID = req.session['user-id'];
  const templateVars = { user: userID, session: req.session  };

  if (userID) {
    return res.redirect("/urls");
  }

  res.render("user_login", templateVars);
});

app.post("/login", (req, res) => {
  const userEmail = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(userEmail);

  if (!user) {
    return res.send("<html><body><h3>Error 403: Email not found</h3></body></html>");
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(403);
    res.send('Incorrect password\n<button onclick="history.back()">Back</button>');
    return;
  }
  
  req.session['user_id'] = user.id;
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.get('/register', (req, res) => {
  const templateVars = { user: users[req.session['user-id']], sessions: req.sessions };
  
  if (req.session['user-id']) {
    return res.redirect("/urls");
  }

  res.render("user_registration", templateVars);
});

app.post('/register', (req, res) => {
  const userID = generateRandomString();
  const userEmail = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (userEmail === "" || password === "") {
    return res.send("<html><body><h3>Error 400: Empty field(s), check email and/or password</h3></body></html>");
  }

  if (getUserByEmail(userEmail)) {
    return res.send("<html><body><h3>Error 400: Email already exists</h3></body></html>");
  }

  users[userID] = {
    id: userID,
    email: userEmail,
    password: hashedPassword,
  };
  req.session['user_id'] = userID;
  console.log(req.session, req.session.sig);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
