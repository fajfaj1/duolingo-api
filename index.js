import Scraper from './scraper.js';
import process from 'node:process';
import express from 'express';
import db from './db.js';
import log from './logs.js';

const app = express();
const port = 3000;

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

process.on('uncaughtException', (err, origin) => {
    log('Uncaught Exception', `(${origin}) ${err}`, 'error')
});

const scraper = await Scraper()

// Root route
app.get('/', (req, res) => {
    res.send(JSON.stringify({ message: 'Hello World!', availableRoutes: ['/profile/info?username', '/profile/screenshot'] }));
});

async function getProfile(username, optimize) {
    const profileData = await scraper.fetchProfile(username, optimize);    

    const response = {
        timestamp: Date.now(),
        body: profileData
    }

    return response
}

// Profile route
app.get('/profile/info', async (req, res) => {
    const receiveTime = Date.now();
    const username = req.query.username
    log('New request', `Received request for ${username} profile from ${req.ip}`, 'received')

    let response
    let cachedProfiles = await db.get('cachedProfiles')
    if(!cachedProfiles) cachedProfiles = {}
    let cachedProfile = cachedProfiles[username]

    if(!cachedProfile) cachedProfile = {timestamp: 0}

    const timeSince = Date.now() - cachedProfile.timestamp

    if(timeSince > 3.6e+6 || !cachedProfile.body) {

        response = await getProfile(username, true);
        cachedProfile[username] = response
        await db.set('cachedProfiles', cachedProfile)

    } else {

        response = cachedProfile
        
    }

    response.responseTime = `${Date.now() - receiveTime}ms`;  
  
    res.send(JSON.stringify(response));
})
// Profile screenshot route
app.get('/profile/screenshot', async (req, res) => {
    
})

// Listen
app.listen(port, () => {
    log('API', `Listening on port ${port}`, 'info')
})



// const userProfile = await fetchProfile('6hodii9');
    // console.log(await userProfile.getProfileData());