import puppeteer from 'puppeteer';
import chalk from 'chalk';

// Scraper() returns fetchProfile()
export default async function scraper() {

    // Launch the browser and open
    console.log('Launching a browser...')
    const browser = await puppeteer.launch({ headless: 'new' });

    async function fetchProfile(username, optimize) {
        console.log(`Recievied a request for ${username}'s profile`)
        return new Promise(async (resolve, reject) => {


            // Open a new page
            console.log('Opening a new page...')
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
            console.log(`Navigating to ${duolingoProfileUrl}...`)
            await page.goto(duolingoProfileUrl);

            page.on('response', async (res) => {
                const regex = /^https:\/\/www\.duolingo\.com\/\d{4}-\d{2}-\d{2}\/users\?username=/g
                if (`${res.url()}`.match(regex)) {

                    console.log(`${chalk.bgBlackBright(` 📨 Request found: `)} ${chalk.gray(res.url())}`)
                    // const response = req.response()
                    const response = await res.json()
                    // Close the page
                    page.close()

                    resolve(responseToData(response))



                }

            })

            function responseToData(response) {
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

                return profile
            }


        })
    };

    return {
        fetchProfile
    }
}