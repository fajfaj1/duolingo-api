import fs from 'fs';
import fetch from 'node-fetch';
import log from './logs.js';
const filePath = `./public/avatars/#FILENAME#`

export default function download(url, fileName) {
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
        log('Avatar', `Downloading avatar from ${url} to ${path}`, 'info')
        res.body.pipe(fs.createWriteStream(path))
    })
}

// const exampleAvatar = "https://simg-ssl.duolingo.com/avatars/263048714/2zmZKrtmkR/xxlarge"
// download(exampleAvatar, 'fajfaj.png')

function dirExists() {
    return fs.existsSync(filePath.replace('/#FILENAME#', ''))
}
function mkDir() {
    fs.mkdirSync(filePath.replace('/#FILENAME#', ''))
}