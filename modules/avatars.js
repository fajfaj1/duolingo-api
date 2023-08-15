import fs from 'fs';
import fetch from 'node-fetch';
import path from 'node:path';
const filePath = `./public/avatars/#FILENAME#`


export function download(url, fileName) {
    // Ensure the dir exists
    if(!dirExists()) { mkDir() }

    // Ensure the file ends with .png
    if(!fileName.endsWith('.png')) {
        fileName += '.png'
    }

    // Replace the filename in the path
    const path = filePath.replace('#FILENAME#', fileName)

    // Download the file
    fetch(url).then(res => {
        res.body.pipe(fs.createWriteStream(path))
    })
}

export async function generate(firstLetter, browser) {
    const avatarPath = filePath.replace('#FILENAME#', `default/${firstLetter}.png`)
    if(fs.existsSync(avatarPath)) { return }
    const page = await browser.newPage();

    const schemePath = path.resolve('schemes\\avatar.html');
    await page.goto(schemePath)

    const avatar = await page.waitForSelector('#avatar');
    await avatar.evaluate((element, firstLetter) => {
        element.innerText = firstLetter.toUpperCase()
    }, firstLetter)

    

    await avatar.screenshot({ path: avatarPath, omitBackground: true });

    await page.close()

}
// const exampleAvatar = "https://simg-ssl.duolingo.com/avatars/263048714/2zmZKrtmkR/xxlarge"
// download(exampleAvatar, 'fajfaj.png')

function dirExists() {
    return fs.existsSync(filePath.replace('/#FILENAME#', ''))
}
function mkDir() {
    fs.mkdirSync(filePath.replace('/#FILENAME#', ''))
}