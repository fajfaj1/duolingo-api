import puppeteer from 'puppeteer';
import log from './logs.js';
import { getLanguageFlag } from './flagger.js';

// Scraper() returns fetchProfile()
export default async function scraper() {

    // Launch the browser and open
    log('Scraper', 'Launching a browser...', 'info')
    const browser = await puppeteer.launch({ headless: 'new' });

    async function fetchProfile(username, optimize) {
        return new Promise(async (resolve, reject) => {


            // Open a new page
            const page = await browser.newPage();

            // Optimizations
            if (optimize !== false) {
                await page.setRequestInterception(true);
                page.on('request', (req) => {

                    const blockedTypes = ['image', 'media']
                    const isBlacklisted = blockedTypes.includes(req.resourceType());
                    const isBlocked = req.url().includes('analytics');

                    if (isBlacklisted || isBlocked) {
                        // console.log(`${chalk.bgRed('  ✖  ')} ${req.resourceType()} — ${chalk.gray(req.url())} `)
                        req.abort();
                    } else {
                        // console.log(`${chalk.bgGreen('  ✔  ')} ${req.resourceType()} — ${chalk.gray(req.url())}`)
                        req.continue();
                    }
                });
            }

            // Navigate the page to a URL
            const rawDuolingoProfileUrl = `https://www.duolingo.com/profile/${username}`;
            const duolingoProfileUrl = encodeURI(rawDuolingoProfileUrl);
            page.goto(duolingoProfileUrl, { waitUntil: 'networkidle2' });
            // log('Navigated', `Navigated to ${duolingoProfileUrl}`, 'success')
            
            // Check if the user exists
            // page.on('request', (req) => {
            //     if(req.url() === 'https://www.duolingo.com/errors/404.html') {
            //         log('User not found', `User ${username} not found`, 'warn')
            //         resolve({
            //             status: 'error',
            //             message: 'User not found'
            //         }) 
            //         page.close()
            //     }
            // })
            
            // Wait for the good packet to steal
            page.on('response', async (res) => {
                const regex = /^https:\/\/www\.duolingo\.com\/\d{4}-\d{2}-\d{2}\/users\?username=/g
                if (`${res.url()}`.match(regex)) {

                    log('Request found', `${res.url()}`, 'success')
                    // const response = req.response()
                    const response = await res.json()
                    // Close the page
                    page.close()

                    resolve(responseToData(response))



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

                const props = ['name', 'totalXp', 'username', 'courses', 'streak', 'currentCourseId', 'createionDate', 'streakData', 'hasPlus']
                Object.keys(profile).forEach((key, index) => {
                    if (!props.includes(key)) {
                        delete profile[key]
                    }
                })

                const courseProps = ['title', 'learningLanguage', 'xp', 'healthEnabled', 'fromLanguage', 'cornws', 'id']
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

                return profile
            }


        })
    };

    return {
        fetchProfile
    }
}