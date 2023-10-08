import puppeteer from 'puppeteer';
import log from './modules/logs.js';
import { getLanguageFlag } from './modules/flagger.js';
import { download, generate } from './modules/avatars.js';
import chalk from 'chalk';

const imgSize = 'xlarge'
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
                // Objective: Parse the response to a clean object (return it)
                const template = {
                    name: "name",
                    user: {
                        username: "username",
                        displayname: "name",
                        totalXp: "totalXp",
                        streak: "streak",
                        currentCourseId: "currentCourseId",
                        id: "id",
                        hasPlus: "hasPlus",
                        picture: "picture",
                    },
                    streak: {
                        start: "streakData.currentStreak.startDate",
                        length: "streakData.currentStreak.length",
                        end: "streakData.currentStreak.endDate"
                    },
                    leaderboard: {
                        league: "tier",
                        wins: {
                            global: "num_wins",
                            1: "stats['number_one_finishes']",
                            2: "stats['number_two_finishes']",
                            3: "stats['top_three_finishes']",
                        },
                        streakInLeague: "streak_in_tier",
                    },
                    days: [
                        'summaries',
                        {
                            gainedXp: "summaries[i].gainedXp",
                            date: "summaries[i].date",
                            frozen: "summaries[i].frozen",
                            repaired: "summaries[i].repaired",
                            numSessions: "summaries[i].numSessions",
                            totalSessionTime: "summaries[i].totalSessionTime"
                        }
                    ],
                    courses: [
                        'courses',
                        {
                            title: "courses[i].title",
                            learningLanguage: "courses[i].learningLanguage",
                            courseXp: "courses[i].xp",
                            healthEnabled: "courses[i].healthEnabled",
                            fromLanguage: "courses[i].fromLanguage",
                            crowns: "courses[i].crowns",
                            id: "courses[i].id"
                        }
                    ]
                }

                /* The plan:
                    1. Loop over a layer
                    2. Work on it
                    > 2.1. If it's a string, just add it to the response
                    > 2.2. If it's an object, loop over it (with the same function)
                    > 2.3. If it's an array, loop over it (with the same function)

                */
                let formattedProfile = {}
                formattedProfile = layer(template)

                function layer(obj, index) {
                    const thisLayer = {}
                    const workOn = {
                        string: (key, string) => {
                            // Get the value and attach to the layer
                            let valuePath = `profile.${string}`

                            let val = 'null'
                            try {
                                val = eval(valuePath)
                            } catch (e) {
                                log('Error', `Error while evaluating ${string}`, 'error')
                            }

                            thisLayer[key] = val
                        },
                        object: (key, object) => {
                            // Go deeper
                            thisLayer[key] = layer(object)
                        },
                        array: (key, arrayTemplate) => {
                            // Get the keyname from the template and use it to get the array from the profile
                            const keyInProfile = arrayTemplate[0]
                            const arrayFromProfile = profile[keyInProfile] || []

                            const arr = []

                            arrayFromProfile.forEach((e, index) => {
                                // element is 
                                let object = arrayTemplate[1]
                                object = JSON.stringify(object)
                                object = object.replace(/\[i\]/g, `[${JSON.stringify(index)}]`)
                                object = JSON.parse(object)

                                arr.push(layer(object, index))
                            });
                            thisLayer[key] = arr
                        }
                    }
                    // Keys like user, leaderboard, days, courses
                    const keys = Object.keys(obj)
                    keys.forEach(key => {
                        const value = obj[key]

                        const isString = typeof value === 'string'
                        const isArray = value instanceof Array
                        const isObject = typeof value === 'object' && !isArray

                        if (isString) {
                            workOn.string(key, value)
                        } else if (isArray) {
                            workOn.array(key, value)
                        } else if (isObject) {
                            workOn.object(key, value)
                        }
                    })
                    return thisLayer
                }
                formattedProfile = applyProfileExceptions(formattedProfile)

                return formattedProfile
            }

            function applyProfileExceptions(profile) {
                // Courses count
                const courses = profile.courses || []
                profile.coursesCount = courses.length

                // Course flags
                profile.courses = courses.map(course => {
                    const flag = getLanguageFlag(course.title)
                    course.flag = flag
                    return course
                })

                function sortCourses(courses) {
                    const sortedCourses = courses.sort((a, b) => {
                        return b.courseXp - a.courseXp
                    })
                    return sortedCourses
                }
                profile.courses = sortCourses(profile.courses)

                function getAvatarUrl(profile) {
                    const avatarUrl = 'https:' + profile.user.picture + `/${imgSize}`

                    let filePath = 'null'

                    if (avatarUrl != `https://simg-ssl.duolingo.com/avatar/default_2/${imgSize}`) {
                        const fileName = username + '.png'
                        filePath = `/duolingo/public/avatars/${fileName}`
                        download(avatarUrl, fileName)
                    } else {
                        let firstLetter = 'null'
                        if (profile.name != null) {
                            firstLetter = profile.user.displayname.charAt(0)
                        } else {
                            firstLetter = profile.user.username.charAt(0)
                        }
                        const fileName = firstLetter + '.png'
                        filePath = `/duolingo/public/avatars/default/${fileName}`

                        generate(firstLetter, browser)
                    }


                    return `https://${hostname}${filePath}`
                }

                profile.user.picture = getAvatarUrl(profile)
                
                const streakEnd = profile.streak.end || 'null'

                const today = new Date()

                const year = today.getUTCFullYear()
                let month = today.getUTCMonth()
                month = month + 1
                month = month.toString().padStart(2, '0')
                const day = today.getUTCDate()

                const todayFormat = `${year}-${month}-${day}`
                profile.streak.extendedToday = streakEnd === todayFormat
                
                return profile
            }

            // Navigate the page to a URL
            const rawDuolingoProfileUrl = `https://www.duolingo.com/profile/${username}`;
            const duolingoProfileUrl = encodeURI(rawDuolingoProfileUrl);
            try {
                await page.goto(duolingoProfileUrl, { waitUntil: 'networkidle2' });
                page.close()
            } catch {
                log('Error', `Error while navigating.`, 'error')
            }

        })
    };

    return {
        fetchProfile
    }
}