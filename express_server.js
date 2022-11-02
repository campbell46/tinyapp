const express = require("express");
const app = express();
const PORT = 8080; //default port 8080
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
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
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlDatabase, cookies: req.cookies };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = `http://${ req.body.longURL }`;
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  const siteID = req.params.id;
  delete urlDatabase[siteID];
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlDatabase, cookies: req.cookies  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  const templateVars = { user: users[req.cookies["user_id"]], id: siteID, longURL: urlDatabase[siteID], cookies: req.cookies };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  urlDatabase[siteID] = `http://${req.body.longURL}`;
  res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  const siteID = req.params.id;
  const longURL = urlDatabase[siteID];
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], cookies: req.cookies  };

  if (req.cookies.user_id !== undefined) {
    return res.redirect("/urls");
  }

  res.render("user_login", templateVars);
});

app.post("/login", (req, res) => {
  const userEmail = req.body.email;
  const password = req.body.password;
  const getUser = getUserByEmail(userEmail);

  if (!getUser) {
    return res.send('403 status code error: Email not found');
  }

  if (getUser) {
    if (getUser.password !== password) {
      return res.send('403 status code error: Incorrect password');
    } else {
      res.cookie("user_id", getUser.id);
    }
  }

  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

app.get('/register', (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], cookies: req.cookies };
  
  if (req.cookies.user_id !== undefined) {
    return res.redirect("/urls");
  }

  res.render("user_registration", templateVars);
});

app.post('/register', (req, res) => {
  const userID = generateRandomString();
  const userEmail = req.body.email;
  const password = req.body.password;

  if (userEmail === "" || password === "") {
    return res.send('400 status code error: Empty field(s), check email and/or password');
  }

  if (getUserByEmail(userEmail)) {
    return res.send('400 status code error: Email already exists');
  }

  users[userID] = {
    id: userID,
    email: userEmail,
    password: password
  };
  res.cookie("user_id", userID);
  console.log(users);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
