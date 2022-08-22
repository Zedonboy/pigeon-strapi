module.exports = ({ env }) => ({
  url: process.env.SERVER_URL ? process.env.SERVER_URL : "http://localhost:1337" //env('MY_HEROKU_URL'),
});

