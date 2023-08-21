import puppeteer from 'puppeteer';
import log from './modules/logs.js';
import { getLanguageFlag } from './modules/flagger.js';
import { download, generate } from './modules/avatars.js';

// Scraper() returns fetchProfile()
export default async function scraper() {

    // Launch the browser and open
    log('Scraper', 'Launching a browser...', 'info')
    const browser = await puppeteer.launch({ headless: 'new' });

    async function fetchProfile(username, optimize, hostname) {
        return new Promise(async (resolve, reject) => {
            let isResolved = false

            // Open a new page
            const page = await browser.newPage();

            // Optimizations
            if (optimize !== false) {
                if (isResolved) return
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


            // Wait for the good packets to steal
            const bodies = []
            page.on('response', async (res) => {
                if (isResolved) return

                if (res.url() == 'https://www.duolingo.com/errors/404.html') {
                    resolve({
                        status: 'error',
                        message: 'User not found'
                    })
                    isResolved = true
                    return
                }

                // Expression for both
                const regex = /^https:\/\/www\.duolingo\.com\/\d{4}-\d{2}-\d{2}\/users\?username=|^https:\/\/duolingo-leaderboards-prod\.duolingo\.com\/leaderboards\/.+\/users|^https:\/\/www\.duolingo\.com\/\d{4}-\d{2}-\d{2}\/users\/\d+\/xp_summaries/
                const url = res.url()
                const request = res.request()
                if (url.match(regex) && request.resourceType() === 'fetch') {

                    bodies.push(await res.json())

                }


                if (bodies.length == 3) {
                    const response = {
                        ...bodies[0].users[0],
                        ...bodies[1],
                        ...bodies[2]
                    }
                    resolve(responseToData(response))
                }

            })

            function responseToData(profile) {
                console.log(profile)

                const props = ['name', 'totalXp', 'username', 'courses', 'streak', 'currentCourseId', 'createionDate', 'streakData'
                    , 'hasPlus', 'picture', 'id', 'tier', 'streak_in_tier', 'top_three_finishes']
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

                let filePath = 'null'

                if (avatarUrl != 'https://simg-ssl.duolingo.com/avatar/default_2/xxlarge') {
                    console.log('Download')
                    const fileName = username + '.png'
                    filePath = hostname + `/public/avatars/${fileName}`
                    download(avatarUrl, fileName)
                } else {
                    console.log('Generate')
                    let firstLetter = 'null'
                    if (profile.name != null) {
                        firstLetter = profile.name.charAt(0)
                    } else {
                        firstLetter = profile.username.charAt(0)
                    }
                    const fileName = firstLetter + '.png'
                    filePath = hostname + `/public/avatars/default/${fileName}`

                    log('First letter', `First letter is ${firstLetter}`, 'info')
                    generate(firstLetter, browser)
                }


                profile.picture = filePath

                return profile
            }

            // Navigate the page to a URL
            const rawDuolingoProfileUrl = `https://www.duolingo.com/profile/${username}`;
            const duolingoProfileUrl = encodeURI(rawDuolingoProfileUrl);
            try {
                await page.goto(duolingoProfileUrl, { waitUntil: 'networkidle2' });
                // page.close()
            } catch {
                log('Error', `Error while navigating.`, 'error')
            }

        })
    };

    return {
        fetchProfile
    }
}