import puppeteer from 'puppeteer';
import log from './logs.js';
import { getLanguageFlag } from './flagger.js';
import download from './avatars.js';

// Scraper() returns fetchProfile()
export default async function scraper() {

    // Launch the browser and open
    log('Scraper', 'Launching a browser...', 'info')
    const browser = await puppeteer.launch({ headless: 'new' });

    async function fetchProfile(username, optimize, hostname) {
        return new Promise(async (resolve, reject) => {


            // Open a new page
            const page = await browser.newPage();

            // Optimizations
            if (optimize !== false) {
                await page.setRequestInterception(true);
                page.on('request', (req) => {

                    const blockedTypes = ['image', 'media', 'xhr', 'svg+xml', 'batch']
                    const isBlacklisted = blockedTypes.includes(req.resourceType());
                    const isBlocked = req.url().includes('analytics');

                    if (isBlacklisted || isBlocked) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
            }

            // Navigate the page to a URL
            const rawDuolingoProfileUrl = `https://www.duolingo.com/profile/${username}`;
            const duolingoProfileUrl = encodeURI(rawDuolingoProfileUrl);
            try {
                page.goto(duolingoProfileUrl, { waitUntil: 'networkidle2' });
            } catch {
                log('Error', `Error while navigating.`, 'error')
            }
            

            // Wait for the good packet to steal
            return page.on('response', async (res) => {
                const regex = /^https:\/\/www\.duolingo\.com\/\d{4}-\d{2}-\d{2}\/users\?username=/g
                if (`${res.url()}`.match(regex)) {

                    log('Request found', `${res.url()}`, 'success')
                    // const response = req.response()
                    const response = await res.json()

                    resolve(responseToData(response))

                    // Close the page
                    return page.close()

                }

            })

            function responseToData(response) {
                if(response.users.length === 0) {
                    return {
                        status: 'error',
                        message: 'User not found'
                    }
                }
                const profile = response.users[0]

                const props = ['name', 'totalXp', 'username', 'courses', 'streak', 'currentCourseId', 'createionDate', 'streakData', 'hasPlus', 'picture', 'id']
                Object.keys(profile).forEach((key, index) => {
                    if (!props.includes(key)) {
                        delete profile[key]
                    }
                })

                const courseProps = ['title', 'learningLanguage', 'xp', 'healthEnabled', 'fromLanguage', 'crowns', 'id']
                const courses = profile.courses
                courses.forEach((course, index) => {
                    Object.keys(course).forEach((key, index) => {
                        if (!courseProps.includes(key)) {
                            delete course[key]
                        }
                    })
                })
                profile.courses = courses

                profile.coursesCount = courses.length

                const profileCourses = profile.courses
                profileCourses.forEach(course => {
                    
                    const flag = getLanguageFlag(course.title)
                    course.flag = flag

                })
                profile.courses = profileCourses

                profile.status = 'success'

                const avatarUrl = 'https:' + profile.picture + '/xxlarge'
                const fileName = username + '.png'
                const filePath = hostname + `/public/avatars/${fileName}`

                download(avatarUrl, fileName)

                profile.picture = filePath

                return profile
            }


        })
    };

    return {
        fetchProfile
    }
}