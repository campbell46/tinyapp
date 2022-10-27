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

const generateRandomString = () => {
  const randomNum = Math.random().toString(20);
  return randomNum.substring(2, 6);
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
  const templateVars = { username: req.cookies.username, urls: urlDatabase };
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
  const templateVars = { username: req.cookies.username, urls: urlDatabase };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const siteID = req.params.id;
  const templateVars = { username: req.cookies, id: siteID, longURL: urlDatabase[siteID] };
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

app.post("/login", (req, res) => {
  const username = req.body.username;
  res.cookie("username", username);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});