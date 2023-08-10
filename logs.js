import chalk from 'chalk';

export default function log(title, message, type) {
    const date = new Date()
    const timestamp = `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] `

    const template = `\n${chalk.black(timestamp)}%TITLE% %MESSAGE%`

    title = title.replace(/(\s|\.|:|;)?$/m, ':')

    let tTitle, tMessage
    tMessage = chalk.gray(message)
    switch (type) {
        case 'info':
            tTitle = chalk.blue(` 💬  ${title} `)
            break;
        case 'warn':
            tTitle = chalk.yellow(` ✋  ${title} `)
            break;
        case 'error':
            tTitle = chalk.red(` ❌  ${title} `)
            break;
        case 'wait':
            tTitle = chalk.yellow(` ⏳  ${title} `)
            break;
        case 'success':
            tTitle = chalk.green(` ✅  ${title} `)
            break;
        case 'received':
            tTitle = chalk.cyan(` 📨  ${title} `)
            break;
        default:
            tTitle = chalk.white(` 📄  ${title} `)
            
    }
    
    const text = template.replace('%TITLE%', tTitle).replace('%MESSAGE%', tMessage)

    console.log(text)

}

// log('Logs loaded.', 'They indeed were', 'info')
// log('Logs loaded.', 'They indeed were', 'warn')
// log('Logs loaded.', 'They indeed were', 'error')
// log('Logs loaded.', 'They indeed were', 'none')