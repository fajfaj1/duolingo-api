let ref = {
    Spanish: '🇪🇸'  ,
    French: '🇫🇷'  ,
    Japanese: '🇯🇵'  ,
    Korean: '🇰🇷'  ,
    German: '🇩🇪'  ,
    Hindi: '🇮🇳'  ,
    Italian: '🇮🇹'  ,
    Chinese: '🇨🇳'  ,
    Russian: '🇷🇺'  ,
    Arabic: '🇦🇪'  ,
    English: '🇺🇸'  ,
    Portuguese: '🇧🇷'  ,
    Turkish: '🇹🇷'  ,
    Dutch: '🇳🇱'  ,
    Vietnamese: '🇻🇳'  ,
    Greek: '🇬🇷'  ,
    Polish: '🇵🇱'  ,
    Swedish: '🇸🇪'  ,
    Latin: '🇻🇦'  ,
    Irish: '🇮🇪'  ,
    Ukrainian: '🇺🇦'  ,
    Norwegian: '🇳🇴'  ,
    Hebrew: '🇮🇱'  ,
    'High Valyrian': '🐉',
    Indonesian: '🇮🇩'  ,
    Finnish: '🇫🇮'  ,
    Danish: '🇩🇰'  ,
    Romanian: '🇷🇴'  ,
    Czech: '🇨🇿'  ,
    Hawaiian: '🇺🇸'  ,
    Welsh: '🏴󠁧󠁢󠁷󠁬󠁳󠁿'      ,
    Zulu: '🇿🇦'  ,
    Swahili: '🇹🇿'  ,
    Hungarian: '🇭🇺'  ,
    'Scottish Gaelic': '🏴󠁧󠁢󠁳󠁣󠁴󠁿'      ,
    'Haitian Creole': '🇭🇹'  ,
    Esperanto: '🇪🇺'  ,
    Klingon: '🖖',
    Navajo: '🕉' ,
    Yiddish: '🇮🇱'
}
// Test profile
// const profile = {"timestamp":1691686276133,"body":{"name":"Young Moony","totalXp":27217,"username":"YoungMoony1","courses":[{"title":"Spanish","learningLanguage":"es","xp":9970,"healthEnabled":true,"fromLanguage":"en","id":"DUOLINGO_ES_EN"},{"title":"Dutch","learningLanguage":"nl-NL","xp":8857,"healthEnabled":true,"fromLanguage":"en","id":"DUOLINGO_NL-NL_EN"},{"title":"English","learningLanguage":"en","xp":8390,"healthEnabled":true,"fromLanguage":"pl","id":"DUOLINGO_EN_PL"}],"streak":305,"currentCourseId":"DUOLINGO_ES_EN","streakData":{"currentStreak":{"startDate":"2022-09-16","length":305,"endDate":"2023-08-10"}},"hasPlus":false,"coursesCount":3},"responseTime":"2618ms"}
// profile.bodycourses.forEach(course => {
//     console.log(getLanguageFlag(course.title))
// })

export function getLanguageFlag(language) {
    return ref[language]
}