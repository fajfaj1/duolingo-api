import Scraper from './scraper.js';
import express from 'express';
import db from './db.js';

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

const scraper = await Scraper()

// Root route
app.get('/', (req, res) => {
    res.send(JSON.stringify({ message: 'Hello World!', availableRoutes: ['/profile/info?username', '/profile/screenshot'] }));
});


// Profile route
app.get('/profile/info', async (req, res) => {
    const receiveTime = Date.now();

    const profile = await scraper.fetchProfile(req.query.username);
    const profileData = await profile.getProfileData();

    const response = {
        responseTime: `${Date.now() - receiveTime}ms`,
        timestamp: Date.now(),
        body: profileData
    }

    res.send(JSON.stringify(response));
})
// Profile screenshot route
app.get('/profile/screenshot', async (req, res) => {
    
})

// Listen
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})



// const userProfile = await fetchProfile('6hodii9');
    // console.log(await userProfile.getProfileData());