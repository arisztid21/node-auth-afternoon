const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.get('/callback', (req, res) => {
  console.log('hello')
      const payload={
        client_id: process.env.REACT_APP_AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: req.query.code,
        grant_type: "authorization_code",
        redirect_uri: `http://${req.headers.host}/callback`
      }

    function exchangeCodeForAccessToken(){
      console.log('log1')
      return axios.post(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/oauth/token`, payload);
    }
    function exchangeAccessTokenForUserInfo(accessTokenResponse){
      const accessToken = accessTokenResponse.data.access_token;
      console.log('log2')
      return axios.get(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/userinfo?access_token=${accessToken}`)
    }
    function fetchAuth0AccessToken(userInfoResponse){
      req.session.user = userInfoResponse.data;
      const payload={
        grant_type: 'client_credentials',
        client_id: process.env.AUTH0_API_CLIENT_ID,
        client_secret: process.env.AUTH0_API_CLIENT_SECRET,
        audience: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/api/v2/`
        
      }
      console.log(req.session.user)
      return axios.post(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/oauth/token`, payload)
    }
    function fetchGitHubAccessToken(auth0AccessTokenResponse){
      const options={
        headers: {
          authorization: `Bearer ${auth0AccessTokenResponse.data.access_token}`
        }
      }
      return axios.get(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/api/v2/users/${req.session.user.sub}`, options)
    }
    function setGitTokenToSession(gitHubAccessTokenResponse){
      const gitHubIdentity = gitHubAccessTokenResponse.data.identities[0]
      req.session.gitHubAccessToken = gitHubIdentity.access_token;
      res.redirect('/')
    }

    exchangeCodeForAccessToken()
    .then(accessTokenResponse => exchangeAccessTokenForUserInfo(accessTokenResponse))
    .then(userInfoResponse => fetchAuth0AccessToken(userInfoResponse))
    .then(auth0AccessTokenResponse => fetchGitHubAccessToken(auth0AccessTokenResponse))
    .then(gitHubAccessTokenResponse => setGitTokenToSession(gitHubAccessTokenResponse))
    .catch(error => {
      res.status(500).send({message: "An error occrured on the server.Check the terminal."})
      console.log('------error', error)
    })
});
app.put('/api/star', (req, res) => {
  let {gitUser, gitRepo} = req.query;
  axios.put(`https://api.github.com/user/starred/${gitUser}/${gitRepo}?access_token=${req.session.gitHubAccessToken}`).then(()=>{
    res.end()
  }).catch(error=>{console.log('error',error)})
})
app.delete('/api/star', (req, res) => {
  let {gitUser, gitRepo} = req.query;
  axios.delete(`https://api.github.com/user/starred/${gitUser}/${gitRepo}?access_token=${req.session.gitHubAccessToken}`).then(()=>{
    res.end()
  }).catch(error=>{console.log('error',error)})
})

app.get('/api/user-data', (req, res) => {
  res.status(200).json(req.session.user)
})

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.send('logged out');
})

const port = 4000;
app.listen(port, () => { console.log(`Server listening on port ${port}`); });
