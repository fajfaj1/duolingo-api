import Scraper from './scraper.js';
import process from 'node:process';
import express from 'express';
// import db from './modules/db.js';
import log from './modules/logs.js';
import fs from 'node:fs';

let route = JSON.parse(fs.readFileSync('./routes.json')).duolingo.split('/')
void route.pop()
route = route.join('/')

const app = express();

// const cacheTime = 3.6e+6 // 1 hour
const cacheTime = 10*60000

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

app.use('/public', express.static(route + '/public'))

// process.on('uncaughtException', (err, origin) => {
//     log('Uncaught Exception', `(${origin}) ${err}`, 'error')
// });

const cache = {}
cache.profiles = {}
cache.responseTimes = [3000]

const scraper = await Scraper()

// Root route
app.get('/', (req, res) => {
    res.send(JSON.stringify({ message: 'Hello World!', availableRoutes: ['/profile/[USERNAME]', '/cache/[USERNAME]'] }));
});

// Get the proifle from the web
async function getProfile(username, optimize, hostname) {
    const startTimestamp = Date.now()
    // Fetch the profile
    const profileData = await scraper.fetchProfile(username, optimize, hostname);    

    const response = {
        timestamp: Date.now(),
        body: profileData
    }

    // Save to cache
    cache.profiles[username] = response

    // Save response time
    saveResponseTime(Date.now() - startTimestamp)

    return response
}
// Get the profile from the cache
function getRecentlyCachedProfile(username) {
    const profile = cache.profiles[username]
    if(!profile) return undefined
    
    // Time since cached
    const timeSince = Date.now() - profile.timestamp
    if(timeSince > cacheTime) return undefined

    return profile
}
// Save response time to cache (for the average)
function saveResponseTime(time) {
    cache.responseTimes.push(time)
    if(cache.responseTimes.length > 10) cache.responseTimes.shift()
}
// Profile route
app.get('/profile/:username', async (req, res) => {
    const receiveTime = Date.now();
    const username = req.params.username
    log('New request', `Received request for **${username}** profile from **${req.ip}**`, 'received')

    // Source indicator and response content
    let source, response
    // Check if in cache
    const cachedProfile = getRecentlyCachedProfile(username)
    if(!cachedProfile) {
        // If not in recent cache
        source = 'web'
        // Serve the profile from web
        response = await getProfile(username, true, req.hostname);
    } else {
        // If in cache
        source = 'cache'
        // Serve from cache
        response = cachedProfile
        
    }
    // Calc response time
    const responseTime = Date.now() - receiveTime
    response.responseTime = `${responseTime}ms`; // Include ms in response 

    // Send response
    res.send(JSON.stringify(response));
    log(`Request Resolved`, `Served **${username}**'s profile data from **${source}** in ${response.responseTime}`, 'success')
})

// Request user cache
app.get('/cache/:username', async (req, res) => {
    const username = req.params.username
    log('New request', `Received request to cache ${username}'s profile`, 'received')

    let estimatedTime, message, code

    const cachedProfile = getRecentlyCachedProfile(username)
    if(cachedProfile) {
        estimatedTime = 0
        message = `${username}'s profile is already cached!`
        code = 0
    } else {
        getProfile(username, true, req.hostname)

        const responseTimes = cache.responseTimes
        const initialValue = 0;
    
        estimatedTime = responseTimes.reduce((accumulator, currentValue) => accumulator + currentValue, initialValue)/responseTimes.length;
        estimatedTime = Math.round(estimatedTime)

        message = `Caching ${username}'s profile`
        code = 1
    } 

    res.send(JSON.stringify({message: message, username: username, responseUrl: `https://${req.hostname}/duolingo/profile/${username}`, estimatedTime: estimatedTime, code: code}))
    
})

export default app;