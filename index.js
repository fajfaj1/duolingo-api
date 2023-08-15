import Scraper from './scraper.js';
import process from 'node:process';
import express from 'express';
import db from './db.js';
import log from './logs.js';
import https from 'https';
import fs from 'fs';

const app = express();
const port = 443;
// const port = 400;

// Set response headers
const options = {
    setHeaders: function (res, path, stat) {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'content-type': 'application/json; charset=utf-8'
            
    })
    }
}
app.use(express.static('public', options))

app.use('/public', express.static('public'))

process.on('uncaughtException', (err, origin) => {
    log('Uncaught Exception', `(${origin}) ${err}`, 'error')
});

const scraper = await Scraper()

// Root route
app.get('/', (req, res) => {
    res.send(JSON.stringify({ message: 'Hello World!', availableRoutes: ['/duolingo/profile/[USERNAME]'] }));
});

async function getProfile(username, optimize, hostname) {
    const profileData = await scraper.fetchProfile(username, optimize, hostname);    

    const response = {
        timestamp: Date.now(),
        body: profileData
    }

    return response
}

// Profile route
app.get('/duolingo/profile/:username', async (req, res) => {
    const receiveTime = Date.now();
    const username = req.params.username
    log('New request', `Received request for **${username}** profile from **${req.ip}**`, 'received')

    let response
    let cachedProfiles = await db.get('cachedProfiles')
    if(!cachedProfiles) cachedProfiles = {}
    let cachedProfile = cachedProfiles[username]

    if(!cachedProfile) cachedProfile = {timestamp: 0}

    const timeSince = Date.now() - cachedProfile.timestamp

    let source
    if(timeSince > 3.6e+6 || !cachedProfile.body) {

        response = await getProfile(username, true, req.hostname);
        cachedProfile[username] = response
        source = 'web'
        await db.set('cachedProfiles', cachedProfile)

    } else {

        source = 'cache'
        response = cachedProfile
        
    }
    response.responseTime = `${Date.now() - receiveTime}ms`;  
    
    res.send(JSON.stringify(response));
    log(`Request Resolved`, `Served **${username}**'s profile data from **${source}** in ${response.responseTime}`, 'success')
})
// Profile screenshot route
// app.get('/profile/screenshot', async (req, res) => {
    
// })

https.createServer(
		// Provide the private and public key to the server by reading each
		// file's content with the readFileSync() method.
    {
      key: fs.readFileSync("./ssl/privkey.pem"),
      cert: fs.readFileSync("./ssl/fullchain.pem"),
    },
    app
  )
  .listen(port, () => {
    log('API', `Listening on port ${port}`, 'info')
});

// // Listen
// app.listen(port, () => {
//     log('API', `Listening on port ${port}`, 'info')
// })



// const userProfile = await fetchProfile('6hodii9');
    // console.log(await userProfile.getProfileData());

// Export the Express API
export default app;